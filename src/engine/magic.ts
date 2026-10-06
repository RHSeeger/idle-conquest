/**
 * Layer 2 magic: mana, spell research, enchantments, instants and magic nodes.
 * Only wizards (after the first Ascension) have any of this.
 */
import { LAIRS } from "../content/exploration";
import { FAMILIARS, FamiliarChoice } from "../content/familiars";
import { REALMS, Realm, REALM_DEFS } from "../content/magic";
import {
    RARITY_BOOKS,
    RARITY_MANA,
    RARITY_RESEARCH,
    SPELLS,
    SPELL_ORDER,
    SpellDef,
} from "../content/spells";
import { RETORTS, RETORT_ORDER, RetortUnlock } from "../content/retorts";
import { TraitId } from "../content/traits";
import { UNITS } from "../content/units";
import { BASE_PICKS, INSIGHT_UPGRADES } from "../content/wizards";
import { getStats, registerCollector } from "./collect";
import { D, Decimal, ZERO } from "./decimal";
import { Stats } from "./effects";
import { bump, GameState, log } from "./state";

/** Ascended at least once, or Planeshifted (you stay a wizard across Planeshifts) */
export function isWizard(state: GameState): boolean {
    return state.ascension.ascensions >= 1 || state.planes.planeshifts >= 1;
}

// --- Wizard profile ---

export function totalPicks(state: GameState): number {
    return BASE_PICKS + (state.ascension.upgrades["extraPicks"] ?? 0);
}

export function booksIn(state: GameState, realm: Realm): number {
    return state.ascension.books[realm] ?? 0;
}

export function totalBooks(state: GameState): number {
    return REALMS.reduce((sum, r) => sum + booksIn(state, r), 0);
}

/** Realms the player may pick books in: ever found a book, or defeated a wizard of that realm */
export function pickableRealms(state: GameState): Realm[] {
    return REALMS.filter((r) => state.prestige.realmsSeen.includes(r));
}

/** Retort Mastery (Insight): how many retorts cost no picks */
export function freeRetortSlots(state: GameState): number {
    return state.ascension.upgrades["retortMastery"] ?? 0;
}

/** The retorts that cost no picks: the `free` most expensive ones */
export function freeRetorts(retorts: readonly string[], free: number): string[] {
    return [...retorts].sort((a, b) => (RETORTS[b]?.picks ?? 0) - (RETORTS[a]?.picks ?? 0)).slice(0, free);
}

/** Picks spent on retorts, after `free` of them (Retort Mastery) cost nothing */
export function retortPicks(retorts: readonly string[], free = 0): number {
    const freeOnes = freeRetorts(retorts, free);
    return retorts.filter((id) => !freeOnes.includes(id)).reduce((sum, id) => sum + (RETORTS[id]?.picks ?? 0), 0);
}

export function picksUsed(books: Partial<Record<Realm, number>>, retorts: readonly string[] = [], free = 0): number {
    return REALMS.reduce((sum, r) => sum + (books[r] ?? 0), 0) + retortPicks(retorts, free);
}

// --- Familiar ---

/** The realm a planned familiar resolves to for a profile ("match": most books, first realm on ties) */
export function resolveFamiliar(choice: FamiliarChoice, books: Partial<Record<Realm, number>>): Realm | null {
    if (choice !== "match") return choice;
    let best: Realm | null = null;
    for (const r of REALMS) {
        if ((books[r] ?? 0) > 0 && (best === null || (books[r] ?? 0) > (books[best] ?? 0))) best = r;
    }
    return best;
}

export function familiarLevel(state: GameState): number {
    return state.ascension.upgrades["familiar"] ?? 0;
}

/** The familiar of this Ascension, if the upgrade is owned */
export function currentFamiliar(state: GameState): Realm | null {
    return familiarLevel(state) > 0 ? state.ascension.familiar : null;
}

registerCollector((state, stats) => {
    const realm = currentFamiliar(state);
    if (realm) stats.applyEffects(FAMILIARS[realm].name, FAMILIARS[realm].effects, familiarLevel(state));
});

/** Realms that can't share a profile with `realm` (Life and Death are opposed) */
export function opposedRealm(realm: Realm): Realm | null {
    return realm === "life" ? "death" : realm === "death" ? "life" : null;
}

/** Whether a profile already has books in the realm opposed to `realm` (so `realm` can't be added) */
export function blockedByOpposed(books: Partial<Record<Realm, number>>, realm: Realm): Realm | null {
    const other = opposedRealm(realm);
    return other && (books[other] ?? 0) > 0 ? other : null;
}

/** Checks a proposed wizard profile (book picks + retorts); returns an error message or null */
/** Whether a profile's books meet a retort's book requirement (always true if it has none) */
export function hasBooksForRetort(books: Partial<Record<Realm, number>>, id: string): boolean {
    const need = RETORTS[id]?.requiresBooks;
    return !need || (books[need.realm] ?? 0) >= need.count;
}

/** Chosen retorts that would lose their required books if one book of `realm` were removed */
export function retortsHoldingBooks(books: Partial<Record<Realm, number>>, retorts: readonly string[], realm: Realm): string[] {
    return retorts.filter((id) => {
        const need = RETORTS[id]?.requiresBooks;
        return need?.realm === realm && (books[realm] ?? 0) <= need.count;
    });
}

export function validateBooks(
    state: GameState,
    books: Partial<Record<Realm, number>>,
    retorts: readonly string[] = [],
): string | null {
    if (picksUsed(books, retorts, freeRetortSlots(state)) > totalPicks(state)) {
        return `Only ${totalPicks(state)} picks available`;
    }
    for (const id of retorts) {
        const r = RETORTS[id];
        if (!r || !isRetortUnlocked(state, id)) {
            return `${r?.name ?? id} is not unlocked yet`;
        }
        if (r.requiresBooks && !hasBooksForRetort(books, id)) {
            return `${r.name} needs ${r.requiresBooks.count} ${REALM_DEFS[r.requiresBooks.realm].name} books`;
        }
    }
    for (const r of REALMS) {
        if ((books[r] ?? 0) > 0 && !pickableRealms(state).includes(r)) {
            return `You have never found a ${REALM_DEFS[r].name} book`;
        }
    }
    if ((books.life ?? 0) > 0 && blockedByOpposed(books, "life")) {
        return "Life and Death magic cannot be combined";
    }
    return null;
}

// --- Spells ---

export function knowsSpell(state: GameState, id: string): boolean {
    return state.ascension.spellsKnown.includes(id);
}

/** Can this spell be researched with the current wizard profile? */
export function towerCleared(state: GameState): boolean {
    return state.run.sites.some((s) => s.cleared && LAIRS[s.type]?.tower);
}

export function spellAvailable(state: GameState, spell: SpellDef): boolean {
    if (!isWizard(state)) return false;
    if (spell.requiresTower && !towerCleared(state)) return false;
    if (spell.realm === "arcane") return true;
    return booksIn(state, spell.realm) >= RARITY_BOOKS[spell.rarity];
}

export function availableSpells(state: GameState): SpellDef[] {
    return SPELL_ORDER.map((id) => SPELLS[id]).filter((s) => spellAvailable(state, s));
}

export function researchCost(state: GameState, stats: Stats, spell: SpellDef): Decimal {
    let cost = D(RARITY_RESEARCH[spell.rarity])
        .times(stats.get("cost.research"))
        .times(stats.get(`cost.research.${spell.realm}`));
    if (spell.realm !== "arcane") {
        // each book beyond the first in a realm makes its research 10% cheaper
        cost = cost.times(Math.pow(0.9, Math.max(0, booksIn(state, spell.realm) - 1)));
    }
    if (spell.discountedBy && knowsSpell(state, spell.discountedBy.spell)) {
        cost = cost.times(spell.discountedBy.mult);
    }
    return cost;
}

export function canResearch(state: GameState, id: string): boolean {
    const spell = SPELLS[id];
    return (
        !!spell &&
        spellAvailable(state, spell) &&
        !knowsSpell(state, id) &&
        state.run.knowledge.gte(researchCost(state, getStats(state), spell))
    );
}

export function research(state: GameState, id: string): boolean {
    if (!canResearch(state, id)) return false;
    state.run.knowledge = state.run.knowledge.minus(researchCost(state, getStats(state), SPELLS[id]));
    state.ascension.spellsKnown.push(id);
    rememberKnownSpells(state);
    bump(state);
    log(state, "milestone", `Researched ${SPELLS[id].name}.`);
    return true;
}

// --- Spell Memory (Insight) ---
// Level 1 keeps the spells of realms still in the new profile when you Ascend;
// level 2 remembers every spell for good (until a Planeshift). Either way the
// books still gate them: a remembered spell is known only while the profile
// has enough books in its realm for its rarity, and dormant otherwise.

export function spellMemoryLevel(state: GameState): number {
    return state.ascension.upgrades["spellMemory"] ?? 0;
}

/** Whether the current profile has the books for a spell (Arcane needs none; ignores the Tower) */
export function hasBooksFor(state: GameState, spell: SpellDef): boolean {
    return spell.realm === "arcane" || booksIn(state, spell.realm) >= RARITY_BOOKS[spell.rarity];
}

/** Adds every known spell to the memory (when Spell Memory is owned) */
export function rememberKnownSpells(state: GameState): void {
    const a = state.ascension;
    if (spellMemoryLevel(state) === 0) return;
    for (const id of a.spellsKnown) if (!a.spellMemory.includes(id)) a.spellMemory.push(id);
}

/**
 * On Ascending, after the new profile is set and the known spells cleared:
 * level 1 forgets realms the profile dropped, then every remembered spell the
 * books allow becomes known again. Returns the spells restored.
 */
export function restoreRememberedSpells(state: GameState): string[] {
    const a = state.ascension;
    const level = spellMemoryLevel(state);
    if (level === 0) {
        a.spellMemory = [];
        return [];
    }
    if (level === 1) {
        a.spellMemory = a.spellMemory.filter((id) => {
            const realm = SPELLS[id]?.realm;
            return realm === "arcane" || (realm !== undefined && booksIn(state, realm) > 0);
        });
    }
    const restored = a.spellMemory.filter((id) => SPELLS[id] && hasBooksFor(state, SPELLS[id]) && !a.spellsKnown.includes(id));
    a.spellsKnown.push(...restored);
    return restored;
}

/** Remembered spells the current profile lacks the books for */
export function dormantSpells(state: GameState): string[] {
    return state.ascension.spellMemory.filter((id) => !state.ascension.spellsKnown.includes(id));
}

// --- Mana ---

/** The Fortress produces 1 mana/s plus 1 per spellbook pick */
export function fortressMana(state: GameState): number {
    return 1 + totalBooks(state);
}

export function manaRate(state: GameState, stats: Stats): Decimal {
    if (!isWizard(state)) return ZERO;
    // sum flat mana and population per race first, then apply each race's rates once
    const byRace = new Map<string, { cities: number; pop: number }>();
    for (const city of state.run.cities) {
        const entry = byRace.get(city.race) ?? { cities: 0, pop: 0 };
        entry.cities++;
        entry.pop += city.pop;
        byRace.set(city.race, entry);
    }
    let total = D(fortressMana(state)).times(stats.get("mana.mult"));
    for (const [race, { cities, pop }] of byRace) {
        const perRace = stats.get("mana.flat", race).times(cities).plus(stats.get("mana.perPop", race).times(pop));
        total = total.plus(perRace.times(stats.get("mana.mult", race)));
    }
    return total;
}

export function tickMagic(state: GameState, stats: Stats, dt: number): void {
    if (!isWizard(state)) return;
    state.run.mana = state.run.mana.plus(manaRate(state, stats).times(dt));
    for (const id of Object.keys(state.run.cooldowns)) {
        state.run.cooldowns[id] = Math.max(0, state.run.cooldowns[id] - dt);
    }
    checkRetortUnlocks(state);
}

// --- Retorts ---

export function isRetortUnlocked(state: GameState, id: string): boolean {
    const r = RETORTS[id];
    return !!r && (r.unlock === undefined || state.ascension.unlockedRetorts.includes(id));
}

function retortConditionMet(state: GameState, unlock: RetortUnlock): boolean {
    const a = state.ascension;
    switch (unlock.kind) {
        case "defeatWizard":
            return a.wizardsDefeated.length > 0;
        case "enchantmentsInRun":
            return state.run.enchantments.length >= unlock.count;
        case "spellsKnown":
            return a.spellsKnown.length >= unlock.count;
        case "summonsOwned": {
            let n = 0;
            for (const [id, count] of Object.entries(state.run.units)) {
                if (UNITS[id]?.spell !== undefined) n += count;
            }
            return n >= unlock.count;
        }
        case "fameInAscension":
            return a.fameEarned.gte(unlock.amount);
        case "nodesMelded":
            return meldedNodes(state).length >= unlock.count;
        case "defeatWizardWithBooks":
            return a.wizardsDefeatedThisAscension.length > 0 && booksIn(state, unlock.realm) >= unlock.count;
    }
}

export function checkRetortUnlocks(state: GameState): void {
    for (const id of RETORT_ORDER) {
        const r = RETORTS[id];
        if (!r.unlock || state.ascension.unlockedRetorts.includes(id)) continue;
        if (retortConditionMet(state, r.unlock)) {
            state.ascension.unlockedRetorts.push(id);
            log(state, "milestone", `Retort unlocked: ${r.name} (${r.text}). Pick it at your next Ascension.`);
        }
    }
}

// --- Enchantments ---

export function enchantmentCost(spell: SpellDef): Decimal {
    return D(RARITY_MANA[spell.rarity]);
}

export function canCastEnchantment(state: GameState, id: string): boolean {
    const spell = SPELLS[id];
    return (
        !!spell &&
        spell.kind === "enchantment" &&
        knowsSpell(state, id) &&
        !state.run.enchantments.includes(id) &&
        state.run.mana.gte(enchantmentCost(spell))
    );
}

export function castEnchantment(state: GameState, id: string): boolean {
    if (!canCastEnchantment(state, id)) return false;
    state.run.mana = state.run.mana.minus(enchantmentCost(SPELLS[id]));
    state.run.enchantments.push(id);
    bump(state);
    log(state, "milestone", `Cast ${SPELLS[id].name}.`);
    return true;
}

// --- Instants ---

/** A fixed price per spell, so more mana income means more casts */
export function instantCost(spell: SpellDef): Decimal {
    return D(spell.mana ?? 0);
}

export function canCastInstant(state: GameState, id: string): boolean {
    const spell = SPELLS[id];
    return (
        !!spell &&
        spell.kind === "instant" &&
        knowsSpell(state, id) &&
        (state.run.cooldowns[id] ?? 0) <= 0 &&
        state.run.mana.gte(instantCost(spell))
    );
}

/**
 * Casts an instant: adds `siegeSeconds` of the army's current power to the
 * current siege (lair raid or frontier city). The siege resolves next tick.
 * `powerAgainst` is supplied by the caller to avoid an import cycle with army.ts.
 */
export function castInstant(state: GameState, id: string, powerAgainstTarget: Decimal): boolean {
    if (!canCastInstant(state, id)) return false;
    const spell = SPELLS[id];
    state.run.mana = state.run.mana.minus(instantCost(spell));
    state.run.cooldowns[id] = spell.cooldown ?? 0;
    const damage = powerAgainstTarget.times(spell.siegeSeconds ?? 0).times(getStats(state).get("instant.power"));
    if (state.run.armyTarget !== null) {
        state.run.lairSiege = state.run.lairSiege.plus(damage);
    } else {
        state.run.frontier.siege = state.run.frontier.siege.plus(damage);
    }
    return true;
}

// --- Wards ---

/** Traits that actually apply: a wizard's wards vanish once Dispel Magic is known */
export function effectiveTraits(state: GameState, traits: readonly TraitId[]): TraitId[] {
    if (traits.includes("wards") && knowsSpell(state, "dispelMagic")) {
        return traits.filter((t) => t !== "wards");
    }
    return [...traits];
}

// --- Magic nodes ---

/** Magic node lairs and the realm bonus they give once melded */
export const NODE_BONUS: Record<string, { realm: Realm; text: string; stat: string; value: number }> = {
    sorceryNode: { realm: "sorcery", text: "×1.25 knowledge", stat: "knowledge.mult", value: 1.25 },
    natureNode: { realm: "nature", text: "×1.25 production", stat: "prod.mult", value: 1.25 },
    chaosNode: { realm: "chaos", text: "×1.25 army power", stat: "army.power", value: 1.25 },
};

/** Each melded node: +25% mana, plus its realm bonus */
export const NODE_MANA = 0.25;

export function meldedNodes(state: GameState): string[] {
    if (!knowsSpell(state, "magicSpirit")) return [];
    return state.run.sites.filter((s) => s.kind === "lair" && s.cleared && LAIRS[s.type]?.magicNode).map((s) => s.type);
}

// --- Effect sources ---

registerCollector((state, stats) => {
    for (const id of state.run.enchantments) {
        const spell = SPELLS[id];
        if (spell?.effects) stats.applyEffects(spell.name, spell.effects);
    }
});

registerCollector((state, stats) => {
    for (const [id, level] of Object.entries(state.ascension.upgrades)) {
        const u = INSIGHT_UPGRADES[id];
        if (u && level > 0) stats.applyEffects(`Insight: ${u.name} ${level}`, u.effects, level);
    }
});

registerCollector((state, stats) => {
    if (!isWizard(state)) return;
    for (const id of state.ascension.retorts) {
        const r = RETORTS[id];
        if (r) stats.applyEffects(`Retort: ${r.name}`, r.effects);
    }
});

registerCollector((state, stats) => {
    const nodes = meldedNodes(state);
    if (nodes.length === 0) return;
    // Node Mastery doubles node mana; read it from the retort list directly (stats are still being collected)
    const mastery = state.ascension.retorts.includes("nodeMastery") ? 2 : 1;
    stats.addModifier("mana.mult", {
        source: `Melded nodes ×${nodes.length}`,
        op: "add",
        value: D(NODE_MANA * nodes.length * mastery),
    });
    for (const type of nodes) {
        const b = NODE_BONUS[type];
        if (b) stats.addModifier(b.stat, { source: LAIRS[type].name, op: "mult", value: D(b.value) });
    }
});
