/**
 * Automation ("autobuyers"), unlocked by Refound milestones. This is how the
 * game remembers what the player already solved (DESIGN.md §5).
 *
 * The same functions drive the balance-sim bot (with `force` set, ignoring
 * whether the player has unlocked/enabled them).
 */
import { BUILDING_ORDER } from "../content/buildings";
import { LORE_ORDER } from "../content/lore";
import { traitRoleMult } from "../content/traits";
import { UNITS } from "../content/units";
import {
    buyBuilding,
    buyLore,
    buyUnits,
    foundSettlers,
    isBuildingVisible,
    isLoreUnlocked,
    rushBuilding,
} from "./actions";
import { availableUnits, currentTarget, powerByRole, siegePower, siegePowerFrom, unitPower } from "./army";
import { setArmyTarget } from "./exploration";
import { getStats } from "./collect";
import { buildingPrice, lorePrice, unitAffordableWith, unitPrice, wallet } from "./costs";
import { Decimal, ZERO } from "./decimal";
import { realmEconomy } from "./economy";
import { hasMilestone } from "./prestige";
import { hasAscensionMilestone } from "./ascension";
import {
    availableSpells,
    canCastEnchantment,
    canCastInstant,
    castEnchantment,
    castInstant,
    enchantmentCost,
    isWizard,
    knowsSpell,
    research,
    researchCost,
} from "./magic";
import { lairTarget } from "./exploration";
import { SPELLS } from "../content/spells";
import { GameState } from "./state";

/** How long (seconds of income) automation will save up for the next building */
export const SAVE_FOR_BUILDING_SECONDS = 90;
/** Automation acts at most this often (seconds of game time) */
const AUTOMATION_INTERVAL = 1;

export type AutomationKind = "buildings" | "units" | "lore" | "settlers" | "lairs" | "research" | "cast";

/** Auto-raid only attacks lairs it can clear within this many seconds */
export const AUTO_RAID_SECONDS = 120;

export function isAutomationUnlocked(state: GameState, kind: AutomationKind): boolean {
    switch (kind) {
        case "buildings":
            return hasMilestone(state, "autoBuild");
        case "units":
        case "lore":
        case "lairs":
            return hasMilestone(state, "autoRecruit");
        case "settlers":
            return hasMilestone(state, "autoSettle");
        case "research":
        case "cast":
            return hasAscensionMilestone(state, "grimoire");
    }
}

function isActive(state: GameState, kind: AutomationKind): boolean {
    return isAutomationUnlocked(state, kind) && state.automation[kind];
}

/** Building order: the Chronicle's order first, then everything else */
export function buildQueue(state: GameState): string[] {
    const chronicle = state.prestige.chronicle.buildOrder.filter((id) => BUILDING_ORDER.includes(id));
    return [...chronicle, ...BUILDING_ORDER.filter((id) => !chronicle.includes(id))];
}

/**
 * Buys affordable buildings in queue order. Returns the next building worth
 * saving for (affordable within SAVE_FOR_BUILDING_SECONDS), if any.
 */
export function autoBuild(state: GameState): string | null {
    const econ = realmEconomy(state, getStats(state));
    for (const id of buildQueue(state)) {
        if (state.run.buildings.includes(id) || !isBuildingVisible(state, id)) continue;
        // buy normally, or rush with gold when the treasury can cover it all
        if (buyBuilding(state, id) || rushBuilding(state, id)) continue;
        const price = buildingPrice(getStats(state), id);
        const wait = (have: Decimal, need: Decimal | undefined, rate: Decimal) =>
            need ? need.minus(have).div(rate.max(1e-9)).toNumber() : 0;
        const seconds = Math.max(
            wait(state.run.production, price.production, econ.production),
            wait(state.run.gold, price.gold, econ.gold),
        );
        if (seconds < SAVE_FOR_BUILDING_SECONDS) {
            return id;
        }
    }
    return null;
}

export function autoLore(state: GameState): void {
    if (!isLoreUnlocked(state)) return;
    for (let guard = 0; guard < 100; guard++) {
        const stats = getStats(state);
        const cheapest = LORE_ORDER.map((id) => ({ id, price: lorePrice(state, stats, id) })).sort((a, b) =>
            a.price.cmp(b.price),
        )[0];
        if (!buyLore(state, cheapest.id)) return;
    }
}

export function autoSettle(state: GameState): void {
    for (let guard = 0; guard < 20 && foundSettlers(state, true); guard++) {
        /* keep founding while affordable */
    }
}

/**
 * Spends production/gold on troops, keeping `reserve` of each untouched.
 *  - "efficient": best siege power per cost against the current target
 *  - "chronicle": approach the army mix of the last run
 */
export function autoRecruit(
    state: GameState,
    mode: "efficient" | "chronicle",
    reserve: { production: Decimal; gold: Decimal; mana: Decimal },
): void {
    const traits = currentTarget(state)?.traits ?? [];
    const mix = state.prestige.chronicle.unitMix;
    const useMix = mode === "chronicle" && Object.keys(mix).length > 0;
    const units = availableUnits(state);
    const stats = getStats(state);

    for (let guard = 0; guard < 60; guard++) {
        let best: { id: string; score: number; budget: Decimal } | null = null;
        for (const id of units) {
            const u = UNITS[id];
            const price = unitPrice(state, stats, id, 1);
            const available = wallet(state, u.currency).minus(reserve[u.currency]);
            if (available.lt(price)) continue;
            let score: number;
            if (useMix) {
                const weight = mix[id] ?? 0;
                if (weight <= 0) continue;
                score = -((state.run.units[id] ?? 0) / weight); // lowest fill ratio first
            } else {
                const owned = state.run.units[id] ?? 0;
                score = unitPower(stats, id, owned + 1).times(traitRoleMult(traits, u.role)).div(price).toNumber();
            }
            if (!best || score > best.score) best = { id, score, budget: available };
        }
        // buy in chunks (an eighth of what the budget allows) so large incomes need few iterations
        const chunk = best ? Math.max(1, Math.floor(unitAffordableWith(state, stats, best.id, best.budget) / 8)) : 0;
        if (!best || buyUnits(state, best.id, chunk) === 0) {
            // in chronicle mode, fall back to efficient buying once the mix can't be followed
            if (useMix && guard === 0) {
                autoRecruit(state, "efficient", reserve);
            }
            return;
        }
    }
}

/** Sends the army against the quickest lair it can clear within AUTO_RAID_SECONDS */
export function autoRaid(state: GameState): void {
    if (state.run.armyTarget !== null) return;
    const byRole = powerByRole(state, getStats(state));
    let best: { index: number; seconds: number } | null = null;
    for (const site of state.run.sites) {
        if (site.kind !== "lair" || site.cleared || !site.defense) continue;
        const power = siegePowerFrom(state, byRole, site.traits);
        if (power.lte(0)) continue;
        const seconds = site.defense.div(power).toNumber();
        if (seconds <= AUTO_RAID_SECONDS && (!best || seconds < best.seconds)) {
            best = { index: site.index, seconds };
        }
    }
    if (best) setArmyTarget(state, best.index);
}

/** Researches available spells, cheapest first, before spending Knowledge on Lore */
export function autoResearch(state: GameState): void {
    for (let guard = 0; guard < 50; guard++) {
        const stats = getStats(state);
        const next = availableSpells(state)
            .filter((s) => !knowsSpell(state, s.id))
            .sort((a, b) => researchCost(state, stats, a).cmp(researchCost(state, stats, b)))[0];
        if (!next || !research(state, next.id)) return;
    }
}

/** Casts every affordable known enchantment, then any instant that's ready */
export function autoCast(state: GameState): void {
    const known = state.ascension.spellsKnown.map((id) => SPELLS[id]);
    const enchantments = known
        .filter((s) => s.kind === "enchantment" && !state.run.enchantments.includes(s.id))
        .sort((a, b) => enchantmentCost(a).cmp(enchantmentCost(b)));
    for (const s of enchantments) {
        if (canCastEnchantment(state, s.id)) castEnchantment(state, s.id);
    }
    const stats = getStats(state);
    const lair = lairTarget(state);
    const traits = lair ? lair.traits : (currentTarget(state)?.traits ?? []);
    for (const s of known.filter((x) => x.kind === "instant")) {
        if (canCastInstant(state, s.id)) castInstant(state, s.id, siegePower(state, stats, traits));
    }
}

/** Mana to keep for the cheapest known enchantment not yet cast this run */
function manaReserve(state: GameState): Decimal {
    const pending = state.ascension.spellsKnown
        .map((id) => SPELLS[id])
        .filter((s) => s.kind === "enchantment" && !state.run.enchantments.includes(s.id))
        .map((s) => enchantmentCost(s))
        .sort((a, b) => a.cmp(b))[0];
    return pending ? pending.min(state.run.mana) : ZERO;
}

/** Runs every automation the player has unlocked and enabled */
export function runAutomation(state: GameState, force = false): void {
    const on = (kind: AutomationKind) => force || isActive(state, kind);
    const savingFor = on("buildings") ? autoBuild(state) : null;
    if (isWizard(state) && on("research")) autoResearch(state);
    if (on("lore")) autoLore(state);
    if (on("settlers")) autoSettle(state);
    if (on("lairs")) autoRaid(state);
    if (isWizard(state) && on("cast")) autoCast(state);
    if (on("units")) {
        // while saving for a building, leave half of what's on hand
        const reserve = {
            production: savingFor ? state.run.production.div(2) : ZERO,
            gold: savingFor ? state.run.gold.div(2) : ZERO,
            mana: on("cast") ? manaReserve(state) : ZERO,
        };
        autoRecruit(state, force ? "efficient" : state.automation.unitMode, reserve);
    }
}

const sinceLast = new WeakMap<GameState, number>();

/** Called from tick(); throttles automation to AUTOMATION_INTERVAL */
export function tickAutomation(state: GameState, dt: number): void {
    const elapsed = (sinceLast.get(state) ?? AUTOMATION_INTERVAL) + dt;
    if (elapsed < AUTOMATION_INTERVAL) {
        sinceLast.set(state, elapsed);
        return;
    }
    sinceLast.set(state, 0);
    runAutomation(state);
}
