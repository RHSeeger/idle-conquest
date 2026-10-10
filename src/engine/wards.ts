/**
 * Layer 2's own accomplishment: the wizards' contest (DESIGN.md §15.5).
 *
 * Each Ascension faces four rival wizards of Arcanus (`ascension.rivals`),
 * whose domains block the frontier behind their wards. Spell power wears the
 * wards down, one rival at a time. When they break, the wizard is banished:
 * their domain opens to the army, and their Tower of Wizardry is unsealed
 * (the way to Planeshift). Ward progress and casting skill last the whole
 * Ascension, through Refounds.
 *
 * Spell power = free casting skill × the spell power multiplier × how well
 * your books' realms match the rival's (realmMatchup). Casting skill grows
 * with the mana poured into it (a share of income, each point dearer than the
 * last), and running enchantments take up some of it as upkeep. Fame upgrades
 * never touch spell power: a strong kingdom helps only through its mana.
 */
import { ARCANUS_WIZARDS, rivalsFor } from "../content/frontier";
import { LAIRS } from "../content/exploration";
import { REALMS, Realm } from "../content/magic";
import { RARITY_UPKEEP, SPELLS, SpellDef } from "../content/spells";
import { realmMatchup, RIVAL_WIZARD_DEFS, SKILL_TUNING, WARD_TUNING } from "../content/wizards";
import { getStats, registerCollector } from "./collect";
import { D, Decimal, ZERO } from "./decimal";
import { Stats } from "./effects";
import { fmtTime } from "./format";
import { isWizard, knowsSpell } from "./magic";
import { bump, GameState, log } from "./state";

// --- The rivals ---

/** What an Ascension's rivals are seeded by: where you are in the game */
function rivalSeed(state: GameState, ascension: number): number[] {
    return [state.planes.planeshifts, state.mastery.masteries, ascension];
}

/** This Ascension's four rivals, in frontier order */
export function ascensionRivals(state: GameState): string[] {
    const a = state.ascension;
    return a.rivals.length === ARCANUS_WIZARDS ? a.rivals : rivalsFor(rivalSeed(state, a.ascensions), state.mastery.challenge);
}

/** The rivals the next Ascension will face (shown while you plan it) */
export function nextRivals(state: GameState): string[] {
    return rivalsFor(rivalSeed(state, state.ascension.ascensions + 1));
}

/** A new Ascension (or Planeshift, or Mastery): new rivals, and the contest and casting skill start over */
export function beginContest(state: GameState): void {
    const a = state.ascension;
    a.rivals = rivalsFor(rivalSeed(state, a.ascensions), state.mastery.challenge);
    a.wardProgress = D(0);
    a.skillMana = D(0);
}

export function isBanished(state: GameState, wizard: string): boolean {
    return state.ascension.wizardsDefeatedThisAscension.includes(wizard);
}

/** This Ascension's rivals already banished */
export function banishedCount(state: GameState): number {
    return ascensionRivals(state).filter((w) => isBanished(state, w)).length;
}

/** The rival whose wards your spell power is wearing down (null for mortals, or once all four are banished) */
export function currentRival(state: GameState): string | null {
    if (!isWizard(state)) return null;
    return ascensionRivals(state).find((w) => !isBanished(state, w)) ?? null;
}

/** How strong a rival's wards are: each rival of the Ascension is stronger than the one before */
export function wardStrength(state: GameState, wizard: string): Decimal {
    const k = Math.max(0, ascensionRivals(state).indexOf(wizard));
    // Kali's rule and reward weaken rival wizards' domains, wards included
    return D(WARD_TUNING.base).times(Decimal.pow(WARD_TUNING.growth, k)).times(getStats(state).get("defense.domain"));
}

/**
 * Towers of Wizardry unsealed this Ascension: one for each rival banished.
 * (Saves from before the contest may hold a Tower cleared by the army in this kingdom.)
 */
export function towersUnsealed(state: GameState): number {
    const legacy = state.run.sites.some((s) => s.cleared && LAIRS[s.type]?.tower) ? 1 : 0;
    return state.ascension.wizardsDefeatedThisAscension.length + legacy;
}

// --- Casting skill ---

/** Casting skill: SKILL_TUNING.base, plus a point for every ×growth of the mana poured into it this Ascension */
export function castingSkill(state: GameState): number {
    const t = SKILL_TUNING;
    return t.base + Math.log(1 + state.ascension.skillMana.div(t.mana).toNumber()) / Math.log(t.growth);
}

/** Mana still to pour for the next whole point of casting skill */
export function manaToNextSkill(state: GameState): Decimal {
    const t = SKILL_TUNING;
    const next = Math.floor(castingSkill(state) - t.base) + 1;
    return D(t.mana).times(Math.pow(t.growth, next) - 1).minus(state.ascension.skillMana).max(0);
}

export function enchantmentUpkeep(spell: SpellDef): number {
    return RARITY_UPKEEP[spell.rarity];
}

/** Casting skill taken up by this kingdom's running enchantments */
export function upkeepUsed(state: GameState): number {
    return state.run.enchantments.reduce((sum, id) => sum + (SPELLS[id] ? enchantmentUpkeep(SPELLS[id]) : 0), 0);
}

/** Casting skill left for the contest */
export function freeSkill(state: GameState): number {
    return Math.max(0, castingSkill(state) - upkeepUsed(state));
}

/** Whether there's casting skill left to keep another enchantment running */
export function hasSkillFor(state: GameState, spell: SpellDef): boolean {
    return castingSkill(state) - upkeepUsed(state) >= enchantmentUpkeep(spell);
}

export function setSkillShare(state: GameState, share: number): void {
    state.ascension.skillShare = Math.max(0, Math.min(1, share));
    bump(state);
}

// --- Spell power ---

/** Your magic by realm: each realm's share of your spellbooks (Arcane alone without books) */
export function realmShares(state: GameState): Array<{ realm: Realm | "arcane"; share: number }> {
    const books = state.ascension.books;
    const total = REALMS.reduce((sum, r) => sum + (books[r] ?? 0), 0);
    if (total <= 0) return [{ realm: "arcane", share: 1 }];
    return REALMS.filter((r) => (books[r] ?? 0) > 0).map((r) => ({ realm: r, share: (books[r] ?? 0) / total }));
}

/** How well a profile's books wear down a rival's wards (1 = plain) */
export function matchupFor(books: Partial<Record<Realm, number>>, wizard: string): number {
    const theirs = RIVAL_WIZARD_DEFS[wizard]?.realms ?? [];
    const total = REALMS.reduce((sum, r) => sum + (books[r] ?? 0), 0);
    if (total <= 0) return 1;
    return REALMS.reduce((sum, r) => sum + ((books[r] ?? 0) / total) * realmMatchup(r, theirs), 0);
}

export function matchupAgainst(state: GameState, wizard: string): number {
    return matchupFor(state.ascension.books, wizard);
}

/** Spell power per second against a rival's wards */
export function spellPower(state: GameState, stats: Stats, wizard: string | null = currentRival(state)): Decimal {
    if (!wizard || !isWizard(state)) return ZERO;
    return D(freeSkill(state)).times(stats.get("spell.power")).times(matchupAgainst(state, wizard));
}

/** Seconds until the current rival's wards break at the current spell power */
export function wardSecondsLeft(state: GameState, stats: Stats): number {
    const wizard = currentRival(state);
    if (!wizard) return 0;
    const power = spellPower(state, stats, wizard);
    if (power.lte(0)) return Infinity;
    return wardStrength(state, wizard).minus(state.ascension.wardProgress).max(0).div(power).toNumber();
}

// --- The contest ---

/** Adds spell power to the current rival's wards, banishing rivals as their wards break */
export function strikeWards(state: GameState, amount: Decimal): void {
    const a = state.ascension;
    let left = amount;
    for (let guard = 0; guard < ARCANUS_WIZARDS && left.gt(0); guard++) {
        const wizard = currentRival(state);
        if (!wizard) return;
        const need = wardStrength(state, wizard).minus(a.wardProgress);
        if (left.lt(need)) {
            a.wardProgress = a.wardProgress.plus(left);
            return;
        }
        left = left.minus(need);
        a.wardProgress = D(0);
        banish(state, wizard);
    }
}

export function tickWards(state: GameState, stats: Stats, dt: number): void {
    const power = spellPower(state, stats);
    if (power.gt(0)) strikeWards(state, power.times(dt));
}

function banish(state: GameState, wizard: string): void {
    const a = state.ascension;
    if (!a.wizardsDefeated.includes(wizard)) a.wizardsDefeated.push(wizard);
    if (!a.wizardsDefeatedThisAscension.includes(wizard)) a.wizardsDefeatedThisAscension.push(wizard);
    const realms = RIVAL_WIZARD_DEFS[wizard]?.realms ?? [];
    const learned = realms.filter((r) => !state.prestige.realmsSeen.includes(r));
    state.prestige.realmsSeen.push(...learned);
    log(
        state,
        "prestige",
        `${wizard}'s wards break: ${wizard} is banished from Arcanus! Their domain lies open to your army, and their Tower of Wizardry is unsealed.` +
            (learned.length > 0 ? ` Their libraries teach you ${learned.join(" and ")} magic.` : ""),
    );
    // a challenge's goal: all four rivals banished in its Ascension (then it can be completed, Mastery tab)
    const m = state.mastery;
    if (m.challenge && !m.challengeDone && banishedCount(state) >= ARCANUS_WIZARDS) {
        m.challengeDone = true;
        m.challengeWonIn = state.meta.playtime - m.challengeStartedAt;
        const best = m.challengeBest[m.challenge];
        const record = best === undefined || m.challengeWonIn < best;
        if (record) m.challengeBest[m.challenge] = m.challengeWonIn;
        log(
            state,
            "milestone",
            `${m.challenge}'s challenge is won, in ${fmtTime(m.challengeWonIn)}` +
                (best === undefined ? "." : record ? ` (a new best, from ${fmtTime(best)}).` : ` (best ${fmtTime(best)}).`),
        );
    }
    bump(state);
}

// --- Effect sources ---

registerCollector((state, stats) => {
    if (knowsSpell(state, "dispelMagic")) stats.addModifier("spell.power", { source: "Dispel Magic", op: "mult", value: D(2) });
});
