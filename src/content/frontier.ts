/**
 * The conquest frontier: an ordered, deterministic sequence of cities.
 *
 * It is divided into regions of REGION_SIZE cities. Region 0 is the
 * Borderlands (independent cities of your own race); after that each region
 * belongs to one race, in the order given by the starting race's neighbours.
 * The last city of each region is a walled region capital.
 *
 * After the race regions lies a rival wizard's domain. Mortal armies cannot
 * pass its wards — that is Layer 1's ceiling. Wizards (Layer 2) break the
 * wards with spell power (engine/wards.ts); then the army can take the domain,
 * which ends in the rival's Fortress, and beyond it the frontier continues
 * through more races and more rival wizards until the edge of Arcanus.
 */
import { D, Decimal } from "../engine/decimal";
import { hash, hashFloat, hashPick } from "../engine/rng";
import { RACES, RaceId, neighborOrder } from "./races";
import { TraitId } from "./traits";

export const REGION_SIZE = 8;
/** Race regions (after the Borderlands) before the first wizard's domain */
export const BASE_RACE_REGIONS = 4;
/** Race regions between later wizards' domains */
export const LATER_RACE_REGIONS = 3;
/** Rival wizards on Arcanus (MoM allows up to four opponents) */
export const ARCANUS_WIZARDS = 4;

/** Mutable so the balance simulator can try alternatives from the command line */
export const FRONTIER_TUNING = {
    /**
     * The opening (first 24 cities) starts tougher and grows more gently, so
     * the first half hour isn't a blur of conquests; tuned with the sim to
     * ~7 cities by 10 minutes, ~23 by 30 and the wall at ~2.5h on run 1.
     */
    defenseBase: 800,
    openingIndex: 24,
    openingGrowth: 1.55,
    defenseGrowth: 1.6,
    /** Beyond the Layer 1 wall (wizards only) defense grows more slowly */
    lateIndex: 40,
    lateGrowth: 1.45,
    capitalMult: 3,
    domainMult: 2,
    fortressMult: 10,
};

export const RIVAL_WIZARDS = [
    "Merlin", "Raven", "Sharee", "Lo Pan", "Jafar", "Oberic", "Rjak",
    "Sss'ra", "Tauron", "Freya", "Horus", "Ariel", "Tlaloc", "Kali",
] as const;

export type RegionKind = "borderlands" | "race" | "wizard";

export interface RegionDef {
    index: number;
    kind: RegionKind;
    /** The race of the region's cities */
    race: RaceId;
    name: string;
    /** Wizard domains: the rival wizard's name */
    wizard?: string;
    /** Race regions: which one this is (0 = the first after the Borderlands), for the route */
    raceRegion?: number;
}

export interface FrontierCity {
    index: number;
    region: RegionDef;
    name: string;
    race: RaceId;
    traits: TraitId[];
    defense: Decimal;
    /** Population (thousands) the city has when conquered */
    pop: number;
    isRegionCapital: boolean;
    /** Set on a rival wizard's Fortress, the end of their domain (the wizard falls when their wards break) */
    fortressOf?: string;
}

/**
 * The rival wizards met by a run starting as `start`, in order (distinct).
 * Only for saves from before rivals were fixed per Ascension (see rivalsFor).
 */
export function rivalWizards(start: RaceId, count: number): string[] {
    const pool: string[] = [...RIVAL_WIZARDS];
    const result: string[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const pick = pool.splice(hash("wizard", start, i) % pool.length, 1)[0];
        result.push(pick);
    }
    return result;
}

/**
 * The four rival wizards of Arcanus for one Ascension, in the order their
 * domains lie on the frontier. Fixed for the whole Ascension (so the next
 * one's can be shown while you plan your books) and seeded by where you are
 * in the game. `exclude` is the wizard you are playing as (a challenge).
 */
export function rivalsFor(seed: Array<string | number>, exclude: string | null = null): string[] {
    const pool: string[] = RIVAL_WIZARDS.filter((w) => w !== exclude);
    const result: string[] = [];
    for (let i = 0; i < ARCANUS_WIZARDS && pool.length > 0; i++) {
        result.push(pool.splice(hash("rivals", ...seed, i) % pool.length, 1)[0]);
    }
    return result;
}

/**
 * The route (DESIGN.md §15.4): at each boundary the frontier can turn to one
 * of two races, the nearest neighbours of the start not met yet. Returns, for
 * `count` race regions, each one's race and its two options. A region without
 * a (valid) choice in `route` takes the nearer option.
 */
export function planRoute(start: RaceId, count: number, route: readonly (RaceId | null)[] = []): { picks: RaceId[]; options: RaceId[][] } {
    const order = neighborOrder(start);
    const used = new Set<RaceId>();
    const picks: RaceId[] = [];
    const options: RaceId[][] = [];
    for (let k = 0; k < count; k++) {
        // every race met: the road goes round again
        if (used.size >= order.length) used.clear();
        const open = order.filter((r) => !used.has(r)).slice(0, 2);
        const chosen = route[k];
        const pick = chosen && open.includes(chosen) ? chosen : open[0];
        options.push(open);
        picks.push(pick);
        used.add(pick);
    }
    return { picks, options };
}

/** Race regions in a plan with these many wizards' domains */
export function raceRegionCount(raceRegions: number, wizards: number): number {
    return raceRegions + Math.max(0, wizards - 1) * LATER_RACE_REGIONS;
}

/**
 * Builds the region list. `wizards` are the rival wizards whose domains are
 * included, in order (Layer 1 only ever sees the first one); `route` the races
 * chosen at the boundaries.
 */
export function regionPlan(
    start: RaceId,
    raceRegions = BASE_RACE_REGIONS,
    wizards: readonly string[] = rivalsFor([0, 0, 0]).slice(0, 1),
    route: readonly (RaceId | null)[] = [],
): RegionDef[] {
    const regions: RegionDef[] = [
        { index: 0, kind: "borderlands", race: start, name: `${RACES[start].adjective} Borderlands` },
    ];
    const order = neighborOrder(start);
    const { picks } = planRoute(start, raceRegionCount(raceRegions, wizards.length), route);
    let cursor = 0;
    wizards.forEach((wizard, d) => {
        const block = d === 0 ? raceRegions : LATER_RACE_REGIONS;
        for (let i = 0; i < block; i++) {
            const r = picks[cursor++];
            regions.push({ index: regions.length, kind: "race", race: r, name: RACES[r].plural, raceRegion: cursor - 1 });
        }
        regions.push({
            index: regions.length,
            kind: "wizard",
            race: hashPick(order, "domainRace", start, wizard),
            name: `Domain of ${wizard}`,
            wizard,
        });
    });
    return regions;
}

/** Index of the first city that lies inside the first wizard's domain */
export function wallIndex(plan: RegionDef[]): number {
    const first = plan.findIndex((r) => r.kind === "wizard");
    return (first < 0 ? plan.length : first) * REGION_SIZE;
}

/** One past the last reachable frontier index */
export function frontierEnd(plan: RegionDef[], wizardsPassable: boolean): number {
    return wizardsPassable ? plan.length * REGION_SIZE : wallIndex(plan);
}

export function regionOf(plan: RegionDef[], index: number): RegionDef {
    return plan[Math.min(Math.floor(index / REGION_SIZE), plan.length - 1)];
}

export function baseDefense(index: number): Decimal {
    const t = FRONTIER_TUNING;
    const opening = Math.min(index, t.openingIndex);
    const early = Math.max(0, Math.min(index, t.lateIndex) - t.openingIndex);
    const late = Math.max(0, index - t.lateIndex);
    return D(t.defenseBase)
        .times(Decimal.pow(t.openingGrowth, opening))
        .times(Decimal.pow(t.defenseGrowth, early))
        .times(Decimal.pow(t.lateGrowth, late));
}

/**
 * Returns the city at `index`, or null if it can't be reached: inside a
 * wizard's domain when `wizardsPassable` is false, or beyond the last region.
 */
export function frontierCity(
    start: RaceId,
    plan: RegionDef[],
    index: number,
    wizardsPassable = false,
): FrontierCity | null {
    if (index >= frontierEnd(plan, wizardsPassable)) {
        return null;
    }
    const region = regionOf(plan, index);
    const raceId = region.race;
    const local = index % REGION_SIZE;
    const isRegionCapital = local === REGION_SIZE - 1;
    let defense = baseDefense(index);
    const traits: TraitId[] = [];
    let fortressOf: string | undefined;

    if (region.kind === "wizard") {
        traits.push("wards");
        defense = defense.times(FRONTIER_TUNING.domainMult);
        if (isRegionCapital) {
            traits.push("walls");
            defense = defense.times(FRONTIER_TUNING.fortressMult / FRONTIER_TUNING.domainMult);
            fortressOf = region.wizard;
        }
    } else if (isRegionCapital) {
        traits.push("walls");
        defense = defense.times(FRONTIER_TUNING.capitalMult);
    } else if (index >= 3) {
        const roll = hashFloat("trait", start, index);
        if (roll < 0.45) {
            traits.push(RACES[raceId].favoredTrait);
        } else if (roll < 0.7) {
            traits.push(hashPick(["archers", "cavalryScreen", "shieldWall"] as TraitId[], "trait2", start, index));
        }
        if (index >= 12 && hashFloat("walls", start, index) < 0.2 && !traits.includes("walls")) {
            traits.push("walls");
        }
    }

    const pop = 1 + Math.floor(index / 5) + (isRegionCapital ? 2 : 0);

    return {
        index,
        region,
        name: fortressOf ? `Fortress of ${fortressOf}` : cityName(raceId, start, index),
        race: raceId,
        traits,
        defense,
        pop,
        isRegionCapital,
        fortressOf,
    };
}

export function cityName(raceId: RaceId, ...seed: Array<string | number>): string {
    const parts = RACES[raceId].nameParts;
    return hashPick(parts.start, "ns", raceId, ...seed) + hashPick(parts.end, "ne", raceId, ...seed);
}
