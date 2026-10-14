/**
 * Artifacts for heroes (DESIGN.md §18). Recipes are learned at Myrror's sites
 * (engine/wilds.ts) and kept for good. Items are forged from Myrran resources
 * and belong to the Myrror campaign, so they last the Planeshift. They sit in
 * the vault until equipped; a hero who leaves puts theirs back (P8).
 *
 * Each hero has three slots, set by their first calling. An item's power:
 *  - Might: the hero's aura counts as more levels
 *  - Haste: the hero goes faster on quests
 *  - Lore:  the hero gains more experience
 * Like the rest of Myrror, artifacts are off in a challenge.
 *
 * This file imports neither heroes.ts nor quests.ts, which both use it.
 */
import { ARTIFACT_TUNING, CALLING_SLOTS, Power, RECIPE_ORDER, RECIPES, RecipeDef, SLOT_RESOURCE, SlotKind } from "../content/artifacts";
import { Realm } from "../content/magic";
import { HERO_CALLINGS } from "../content/quests";
import { bump, GameState, ItemState, log } from "./state";
import { upperLayersOff } from "./upgradeLevels";

const T = ARTIFACT_TUNING;

// --- Slots ---

/** A hero's three slots, by their first calling */
export function heroSlots(heroId: string): SlotKind[] {
    const calling = HERO_CALLINGS[heroId]?.[0];
    return calling ? CALLING_SLOTS[calling] : [];
}

export function items(state: GameState): ItemState[] {
    return state.planes.myrror?.items ?? [];
}

/** The items a hero has on (only while they serve you) */
export function itemsOn(state: GameState, heroId: string): ItemState[] {
    if (!state.run.heroes.some((h) => h.id === heroId)) return [];
    return items(state).filter((i) => i.hero === heroId);
}

/** The item in a hero's slot, or null */
export function itemInSlot(state: GameState, heroId: string, slot: number): ItemState | null {
    return itemsOn(state, heroId).find((i) => i.slot === slot) ?? null;
}

/** The power items give a hero, as a list of recipe defs (none in a challenge) */
function powersOn(state: GameState, heroId: string, power: Power): RecipeDef[] {
    if (upperLayersOff(state)) return [];
    return itemsOn(state, heroId)
        .map((i) => RECIPES[i.recipe])
        .filter((r) => r?.power === power);
}

/** Might: aura levels added to the hero's own */
export function mightBonus(state: GameState, heroId: string): number {
    return powersOn(state, heroId, "might").reduce((sum, r) => sum + T.might[r.tier], 0);
}

/** Haste: × quest speed */
export function hasteMult(state: GameState, heroId: string): number {
    return powersOn(state, heroId, "haste").reduce((m, r) => m * T.haste[r.tier], 1);
}

/** Lore: × experience */
export function loreMult(state: GameState, heroId: string): number {
    return powersOn(state, heroId, "lore").reduce((m, r) => m * T.lore[r.tier], 1);
}

// --- Recipes ---

export function knowsRecipe(state: GameState, id: string): boolean {
    return state.planes.recipes.includes(id);
}

/** The recipe a site of this realm would teach next: tier 2 first when countered, else tier 1 first (null once all are known) */
export function nextRecipe(state: GameState, realm: Realm, countered: boolean): RecipeDef | null {
    const open = RECIPE_ORDER.map((id) => RECIPES[id]).filter((r) => r.realm === realm && !knowsRecipe(state, r.id));
    const want = countered ? 2 : 1;
    return open.find((r) => r.tier === want) ?? open[0] ?? null;
}

export function learnRecipe(state: GameState, id: string): void {
    if (knowsRecipe(state, id)) return;
    state.planes.recipes.push(id);
    bump(state);
}

// --- Forging ---

/** Items already forged from a recipe this Planeshift */
export function copiesOf(state: GameState, id: string): number {
    return items(state).filter((i) => i.recipe === id).length;
}

/** Myrran resources the next item of a recipe costs: its tier's base, ×2 for every copy already forged */
export function forgeCost(state: GameState, id: string): number {
    const r = RECIPES[id];
    return T.cost[r.tier] * Math.pow(T.copyGrowth, copiesOf(state, id));
}

export function canForge(state: GameState, id: string): boolean {
    const m = state.planes.myrror;
    const r = RECIPES[id];
    if (!m || !r || !knowsRecipe(state, id) || upperLayersOff(state)) return false;
    return m.resources[SLOT_RESOURCE[r.slot]] >= forgeCost(state, id);
}

/** Forges an item into the vault; returns its index, or -1 */
export function forge(state: GameState, id: string): number {
    if (!canForge(state, id)) return -1;
    const m = state.planes.myrror!;
    const r = RECIPES[id];
    m.resources[SLOT_RESOURCE[r.slot]] -= forgeCost(state, id);
    m.items.push({ recipe: id, hero: null, slot: 0 });
    log(state, "milestone", `Forged: ${r.name}.`);
    bump(state);
    return m.items.length - 1;
}

// --- Equipping ---

/** Puts item `index` in a hero's slot (moving whatever was there to the vault); false if it doesn't fit */
export function equip(state: GameState, index: number, heroId: string, slot: number): boolean {
    const item = items(state)[index];
    const r = item && RECIPES[item.recipe];
    if (!item || !r || !state.run.heroes.some((h) => h.id === heroId) || heroSlots(heroId)[slot] !== r.slot) return false;
    const there = itemInSlot(state, heroId, slot);
    if (there && there !== item) there.hero = null;
    item.hero = heroId;
    item.slot = slot;
    bump(state);
    return true;
}

/** Back to the vault */
export function unequip(state: GameState, index: number): void {
    const item = items(state)[index];
    if (!item || item.hero === null) return;
    item.hero = null;
    bump(state);
}

/** Vault items (indices) that fit a slot kind */
export function vaultFor(state: GameState, kind: SlotKind): number[] {
    return items(state)
        .map((item, i) => ({ item, i }))
        .filter(({ item }) => item.hero === null && RECIPES[item.recipe]?.slot === kind)
        .map(({ i }) => i);
}

/** Items on heroes who have left (a Refound or Ascension they didn't follow): back to the vault */
export function tickArtifacts(state: GameState): void {
    const here = new Set(state.run.heroes.map((h) => h.id));
    let moved = false;
    for (const item of items(state)) {
        if (item.hero !== null && !here.has(item.hero)) {
            item.hero = null;
            moved = true;
        }
    }
    if (moved) bump(state);
}

// --- Automation (Artificers' Guild) ---

/** Heroes away on quests (read here directly: quests.ts imports this file) */
function heroesAway(state: GameState): Set<string> {
    return new Set(state.ascension.quests.filter((q) => q.active && !q.done && q.hero).map((q) => q.hero!));
}

/** How much an item suits a hero: a hero at home wants Might first, one on a quest Haste; Lore after; higher tiers first */
function suit(r: RecipeDef, away: boolean): number {
    const order: Power[] = away ? ["haste", "lore", "might"] : ["might", "lore", "haste"];
    return (3 - order.indexOf(r.power)) * 10 + r.tier;
}

/** Fills empty slots with the best fitting vault items */
function autoEquip(state: GameState): void {
    const away = heroesAway(state);
    for (const h of state.run.heroes) {
        heroSlots(h.id).forEach((kind, slot) => {
            if (itemInSlot(state, h.id, slot)) return;
            const best = vaultFor(state, kind).sort((a, b) => suit(RECIPES[items(state)[b].recipe], away.has(h.id)) - suit(RECIPES[items(state)[a].recipe], away.has(h.id)))[0];
            if (best !== undefined) equip(state, best, h.id, slot);
        });
    }
}

/**
 * Artificers' Guild: fills heroes' empty slots from the vault, then forges for
 * the slots still empty (the cheapest fitting recipe first) and equips that.
 * It only forges for an empty slot, so at most one item per slot: Myrran works
 * get the rest of the resources.
 */
export function autoArtifacts(state: GameState): void {
    if (!state.planes.myrror || upperLayersOff(state)) return;
    autoEquip(state);
    for (const h of state.run.heroes) {
        heroSlots(h.id).forEach((kind, slot) => {
            if (itemInSlot(state, h.id, slot)) return;
            const pick = state.planes.recipes
                .filter((id) => RECIPES[id]?.slot === kind && canForge(state, id))
                .sort((a, b) => forgeCost(state, a) - forgeCost(state, b))[0];
            if (!pick) return;
            const i = forge(state, pick);
            if (i >= 0) equip(state, i, h.id, slot);
        });
    }
}
