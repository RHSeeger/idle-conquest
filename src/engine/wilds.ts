/**
 * The Wilds of Myrror (DESIGN.md §17): Layer C's things to do as a
 * Planeswalker. Sites lie off Myrror's frontier, each guarded by one realm's
 * magic: two when Myrror opens, and one more for each Myrran region taken. They
 * wait for you (P8), until the next Planeshift.
 *
 * You bind one creature per realm, from the best summoning spell you know in
 * it, and keep it for the Planeshift even if an Ascension forgets the spell.
 * A creature sent to a site wears down its strength; one whose realm counters
 * the guardian (the contest's matchups) is faster and brings back more. While
 * it's out, it takes a share of your casting skill, which is then not there for
 * enchantments or the wards on Arcanus.
 *
 * Creature power = its rarity's strength × summon power × Myrror's own power
 * multiplier × veterancy: Layer C's channel (§15.3). Arcanus's army doesn't
 * feed it.
 */
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { myrrorPlan, RESOURCE_DEFS, RESOURCE_OF_RACE } from "../content/myrror";
import { REGION_SIZE } from "../content/frontier";
import { Rarity, RARITY_NAMES, SPELL_ORDER, SPELLS, SpellDef } from "../content/spells";
import { BINDING_PER_LEVEL, WILD_SITE_ORDER, WILD_SITES, WILDS_TUNING, WildReward, WildSiteDef } from "../content/wilds";
import { powerText, RecipeDef, SLOT_NAMES } from "../content/artifacts";
import { learnRecipe, nextRecipe } from "./artifacts";
import { realmMatchup } from "../content/wizards";
import { getStats } from "./collect";
import { D, Decimal } from "./decimal";
import { Stats } from "./effects";
import { hash } from "./rng";
import { bump, GameState, log, MyrrorCampaign } from "./state";
import { essenceLevel, upperLayersOff } from "./upgradeLevels";

const T = WILDS_TUNING;
const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, veryRare: 3 };

function campaign(state: GameState): MyrrorCampaign | null {
    return state.planes.myrror;
}

// --- Sites ---

/** Sites revealed so far: some at the start, one more for each Myrran region taken (up to the last region) */
export function sitesRevealed(m: MyrrorCampaign): number {
    const regions = myrrorPlan(m.beachhead).length;
    return T.openAtStart + T.perRegion * Math.min(regions, Math.floor(m.index / REGION_SIZE));
}

/** Reveals the sites the campaign has reached (seeded, so the same campaign always reveals the same ones) */
export function ensureSites(state: GameState): void {
    const m = campaign(state);
    if (!m) return;
    const want = sitesRevealed(m);
    let added = false;
    while (m.sites.length < want) {
        const k = m.sites.length;
        const id = WILD_SITE_ORDER[hash("wilds", m.beachhead, state.planes.planeshifts, state.mastery.masteries, k) % WILD_SITE_ORDER.length];
        const region = k < T.openAtStart ? 0 : Math.floor((k - T.openAtStart) / Math.max(1, T.perRegion));
        m.sites.push({ id, region, progress: D(0), creature: null, done: false, matched: false });
        added = true;
    }
    if (added) bump(state);
}

export function siteDef(state: GameState, k: number): WildSiteDef {
    return WILD_SITES[campaign(state)!.sites[k].id];
}

/** The k-th site's strength */
export function siteStrength(k: number): Decimal {
    return D(T.base).times(Decimal.pow(T.growth, k));
}

/** The best matchup any realm has against a guardian (Sorcery has no counter: then anything but Sorcery counts) */
function bestMatchup(guardian: Realm): number {
    return Math.max(...REALMS.map((r) => realmMatchup(r, [guardian])));
}

/** Whether a creature of `realm` counters a guardian of `guardian` (the best matchup there is against it) */
export function isCountering(realm: Realm, guardian: Realm): boolean {
    return realmMatchup(realm, [guardian]) >= bestMatchup(guardian);
}

/** The realms that counter a guardian, for showing on its site */
export function counterRealms(guardian: Realm): Realm[] {
    return REALMS.filter((r) => isCountering(r, guardian));
}

// --- Bound creatures ---

/** The best summoning spell you know in a realm (highest rarity), or null */
export function bestSummon(state: GameState, realm: Realm): SpellDef | null {
    let best: SpellDef | null = null;
    for (const id of SPELL_ORDER) {
        const s = SPELLS[id];
        if (s.kind !== "summon" || s.realm !== realm || !state.ascension.spellsKnown.includes(id)) continue;
        if (!best || RARITY_RANK[s.rarity] > RARITY_RANK[best.rarity]) best = s;
    }
    return best;
}

/**
 * Binds a creature for each realm whose summoning spell you know, and re-binds
 * to a rarer one when you learn it (keeping its veterancy). Bound creatures stay
 * for the Planeshift, even once an Ascension forgets the spell.
 */
export function bindCreatures(state: GameState): void {
    const m = campaign(state);
    if (!m) return;
    for (const realm of REALMS) {
        const spell = bestSummon(state, realm);
        if (!spell) continue;
        const bound = m.creatures[realm];
        if (bound && RARITY_RANK[SPELLS[bound.spell].rarity] >= RARITY_RANK[spell.rarity]) continue;
        m.creatures = { ...m.creatures, [realm]: { spell: spell.id, veteran: bound?.veteran ?? 0 } };
        log(
            state,
            "milestone",
            bound
                ? `Myrror: your ${REALM_DEFS[realm].name} creature is now bound as ${spell.name} (${RARITY_NAMES[spell.rarity]}).`
                : `Myrror: you bind ${spell.name} (${REALM_DEFS[realm].name}, ${RARITY_NAMES[spell.rarity]}) for this Planeshift. Send it to a site on the Wilds tab.`,
        );
        bump(state);
    }
}

/** The bound creatures, in realm order */
export function boundRealms(state: GameState): Realm[] {
    const c = campaign(state)?.creatures ?? {};
    return REALMS.filter((r) => c[r]);
}

export function creatureSpell(state: GameState, realm: Realm): SpellDef | null {
    const b = campaign(state)?.creatures[realm];
    return b ? SPELLS[b.spell] : null;
}

/** A bound creature's power before the matchup: rarity × summon power × Myrror's power × veterancy */
export function creaturePower(state: GameState, stats: Stats, realm: Realm): Decimal {
    const b = campaign(state)?.creatures[realm];
    if (!b) return D(0);
    return D(T.power[SPELLS[b.spell].rarity])
        .times(stats.get("summon.power"))
        .times(stats.get("myrror.power"))
        .times(1 + T.veteran * b.veteran);
}

/** Pact of Binding (Essence): what's left of each creature's share */
export function bindingMult(state: GameState): number {
    return Math.pow(BINDING_PER_LEVEL, essenceLevel(state, "pactOfBinding"));
}

/** The share of casting skill a creature takes while it's out */
export function creatureShare(state: GameState, realm: Realm): number {
    const spell = creatureSpell(state, realm);
    return spell ? T.share[spell.rarity] * bindingMult(state) : 0;
}

/** Which realms' creatures are out on a site */
export function creaturesOut(state: GameState): Set<Realm> {
    return new Set((campaign(state)?.sites ?? []).filter((s) => !s.done && s.creature).map((s) => s.creature!));
}

/** The share of casting skill taken by creatures out on sites (none in a challenge, while Myrror pauses) */
export function creatureSkillShare(state: GameState): number {
    if (upperLayersOff(state)) return 0;
    let sum = 0;
    for (const realm of creaturesOut(state)) sum += creatureShare(state, realm);
    return Math.min(1, sum);
}

// --- Sending creatures ---

/** Strength worn down per second on site k by this realm's creature */
export function siteSpeed(state: GameState, stats: Stats, k: number, realm: Realm): Decimal {
    const m = campaign(state);
    if (!m || !m.sites[k]) return D(0);
    return creaturePower(state, stats, realm).times(realmMatchup(realm, [siteDef(state, k).guardian]));
}

/** Seconds until site k is taken at its current speed (Infinity if nothing is on it) */
export function siteSecondsLeft(state: GameState, stats: Stats, k: number, realm: Realm | null = campaign(state)?.sites[k]?.creature ?? null): number {
    const s = campaign(state)?.sites[k];
    if (!s || s.done) return 0;
    if (!realm) return Infinity;
    const speed = siteSpeed(state, stats, k, realm);
    return speed.gt(0) ? siteStrength(k).minus(s.progress).max(0).div(speed).toNumber() : Infinity;
}

/** Sends a bound creature to site k (null: calls it off), taking it off any other site */
export function sendCreature(state: GameState, k: number, realm: Realm | null): boolean {
    const m = campaign(state);
    const s = m?.sites[k];
    if (!m || !s || s.done) return false;
    if (realm !== null && !m.creatures[realm]) return false;
    if (realm !== null) {
        for (const other of m.sites) {
            if (other !== s && other.creature === realm) other.creature = null;
        }
    }
    s.creature = realm;
    bump(state);
    return true;
}

// --- Rewards ---

function siteResource(state: GameState, k: number) {
    const m = campaign(state)!;
    const plan = myrrorPlan(m.beachhead);
    const region = plan[Math.min(plan.length - 1, m.sites[k].region)];
    return RESOURCE_OF_RACE[region.race];
}

/** The artifact recipe site k would teach (null if it isn't a recipe site, or its realm's recipes are all known) */
export function siteRecipe(state: GameState, k: number, matched: boolean): RecipeDef | null {
    const def = siteDef(state, k);
    return def.reward.kind === "recipe" ? nextRecipe(state, def.guardian, matched) : null;
}

/** A recipe site whose realm's recipes are all known gives resources instead */
function rewardKind(state: GameState, k: number, matched: boolean): WildReward["kind"] {
    const kind = siteDef(state, k).reward.kind;
    return kind === "recipe" && !siteRecipe(state, k, matched) ? "resources" : kind;
}

/** What site k brings back, plain or with a countering creature ("10 Adamantium", "+5% Planar Essence") */
export function siteRewardText(state: GameState, k: number, matched: boolean): string {
    const r = siteDef(state, k).reward;
    const i = matched ? 1 : 0;
    switch (r.kind === "recipe" ? rewardKind(state, k, matched) : r.kind) {
        case "recipe": {
            const recipe = siteRecipe(state, k, matched)!;
            return `the ${recipe.name} recipe (${SLOT_NAMES[recipe.slot]}, ${powerText(recipe)})`;
        }
        case "resources": {
            const n = T.resources[i] * getStats(state).num("myrror.resources");
            return `${Number(n.toFixed(1))} ${RESOURCE_DEFS[siteResource(state, k)].name}`;
        }
        case "node": {
            const n = T.nodes[i];
            const node = r.kind === "node" ? r.node : "sorceryNode";
            const name = node === "sorceryNode" ? "Sorcery" : node === "natureNode" ? "Nature" : "Chaos";
            return `${n} Myrran ${name} Node${n === 1 ? "" : "s"}, melded`;
        }
        case "essence":
            return `+${Math.round(T.essence[i] * 100)}% Planar Essence on Planeshifting`;
    }
}

function completeSite(state: GameState, k: number): void {
    const m = campaign(state)!;
    const s = m.sites[k];
    const def = WILD_SITES[s.id];
    const realm = s.creature!;
    const matched = isCountering(realm, def.guardian);
    const text = siteRewardText(state, k, matched);
    const i = matched ? 1 : 0;
    const r = def.reward;
    const kind = rewardKind(state, k, matched);
    if (kind === "recipe") learnRecipe(state, siteRecipe(state, k, matched)!.id);
    else if (kind === "resources") m.resources[siteResource(state, k)] += T.resources[i] * getStats(state).num("myrror.resources");
    else if (r.kind === "node") for (let n = 0; n < T.nodes[i]; n++) m.siteNodes.push(r.node);
    else m.siteEssence += T.essence[i];
    const bound = m.creatures[realm];
    if (bound) m.creatures = { ...m.creatures, [realm]: { ...bound, veteran: bound.veteran + 1 } };
    s.done = true;
    s.matched = matched;
    s.brought = text;
    s.creature = null;
    log(state, "milestone", `Myrror: your ${bound ? SPELLS[bound.spell].name : REALM_DEFS[realm].name} took the ${def.name}. It brings back ${text}.`);
    bump(state);
}

export function tickWilds(state: GameState, stats: Stats, dt: number): void {
    const m = campaign(state);
    // Myrror pauses in a challenge (upgradeLevels.ts)
    if (!m || upperLayersOff(state)) return;
    ensureSites(state);
    bindCreatures(state);
    m.sites.forEach((s, k) => {
        if (s.done || !s.creature) return;
        if (!m.creatures[s.creature]) {
            s.creature = null;
            return;
        }
        s.progress = s.progress.plus(siteSpeed(state, stats, k, s.creature).times(dt));
        if (s.progress.gte(siteStrength(k))) completeSite(state, k);
    });
}

// --- Automation ---

/**
 * Auto-send: idle bound creatures go to the open sites, in order, as long as
 * the creatures out take no more than WILDS_TUNING.autoShareCap of casting
 * skill. Level 1 (The Wild Hunt, a Planeshift milestone) sends the first idle
 * creature that fits; level 2 (Planar Huntsmen, Essence) the fastest.
 */
export function autoWilds(state: GameState, best: boolean): void {
    const m = campaign(state);
    if (!m || upperLayersOff(state)) return;
    ensureSites(state);
    bindCreatures(state);
    const stats = getStats(state);
    const out = creaturesOut(state);
    let share = creatureSkillShare(state);
    const idle = boundRealms(state).filter((r) => !out.has(r));
    for (let k = 0; k < m.sites.length && idle.length > 0; k++) {
        const s = m.sites[k];
        if (s.done || s.creature) continue;
        const fits = idle.filter((r) => share + creatureShare(state, r) <= T.autoShareCap + 1e-9);
        if (fits.length === 0) return;
        const pick = best ? [...fits].sort((x, y) => siteSpeed(state, stats, k, y).cmp(siteSpeed(state, stats, k, x)))[0] : fits[0];
        sendCreature(state, k, pick);
        share += creatureShare(state, pick);
        idle.splice(idle.indexOf(pick), 1);
    }
}
