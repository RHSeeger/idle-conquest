/**
 * Prices and affordability for everything bought with currencies.
 */
import { BUILDINGS, BUILDING_ORDER, Cost, Currency } from "../content/buildings";
import { LORE } from "../content/lore";
import { UNITS } from "../content/units";
import { D, Decimal } from "./decimal";
import { Stats } from "./effects";
import { GameState } from "./state";

export type PriceMap = Partial<Record<Currency, Decimal>>;

export function wallet(state: GameState, currency: Currency): Decimal {
    switch (currency) {
        case "production":
            return state.run.production;
        case "gold":
            return state.run.gold;
        case "mana":
            return state.run.mana;
    }
}

export function canPay(state: GameState, price: PriceMap): boolean {
    return Object.entries(price).every(([c, amount]) => wallet(state, c as Currency).gte(amount!));
}

export function pay(state: GameState, price: PriceMap): void {
    for (const [c, amount] of Object.entries(price)) {
        if (c === "production") {
            state.run.production = state.run.production.minus(amount!);
        } else if (c === "gold") {
            state.run.gold = state.run.gold.minus(amount!);
        } else {
            state.run.mana = state.run.mana.minus(amount!);
        }
    }
}

function scaleCost(cost: Cost, mult: Decimal): PriceMap {
    const result: PriceMap = {};
    for (const [c, amount] of Object.entries(cost)) {
        result[c as Currency] = mult.times(amount!);
    }
    return result;
}

/** Experiment knobs for the balance simulator: cost × costMult × stepMult^(position in the list) */
export const BUILDING_TUNING = { costMult: 1, stepMult: 1, stepCap: 99 };

export function buildingPrice(stats: Stats, id: string): PriceMap {
    const t = BUILDING_TUNING;
    const scale = t.costMult * Math.pow(t.stepMult, Math.min(t.stepCap, BUILDING_ORDER.indexOf(id)));
    return scaleCost(BUILDINGS[id].cost, stats.get("cost.building").times(scale));
}

// --- Units (geometric series) ---

function unitStart(stats: Stats, id: string): Decimal {
    const u = UNITS[id];
    return D(u.baseCost).times(stats.get(u.spell !== undefined ? "cost.summon" : "cost.unit"));
}

/** Price of buying `amount` more of a unit */
export function unitPrice(state: GameState, stats: Stats, id: string, amount: number): Decimal {
    const u = UNITS[id];
    const owned = state.run.units[id] ?? 0;
    return Decimal.sumGeometricSeries(amount, unitStart(stats, id), u.costGrowth, owned);
}

/** How many of a unit can be afforded right now */
export function unitAffordable(state: GameState, stats: Stats, id: string): number {
    return unitAffordableWith(state, stats, id, wallet(state, UNITS[id].currency));
}

/** How many of a unit a given budget can buy */
export function unitAffordableWith(state: GameState, stats: Stats, id: string, budget: Decimal): number {
    const u = UNITS[id];
    const owned = state.run.units[id] ?? 0;
    const n = Decimal.affordGeometricSeries(budget, unitStart(stats, id), u.costGrowth, owned);
    return Math.max(0, Math.floor(n.toNumber()));
}

// --- Lore ---

export function lorePrice(state: GameState, stats: Stats, id: string): Decimal {
    const l = LORE[id];
    const level = state.run.lore[id] ?? 0;
    return D(l.baseCost).times(Decimal.pow(l.costGrowth, level)).times(stats.get("cost.lore"));
}

// --- Settlers ---

const SETTLERS_BASE = 40;
const SETTLERS_GROWTH = 1.9;

export function settlersPrice(state: GameState, stats: Stats): Decimal {
    return D(SETTLERS_BASE)
        .times(Decimal.pow(SETTLERS_GROWTH, state.run.settlersFounded))
        .times(stats.get("cost.settlers"));
}
