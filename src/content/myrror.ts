/**
 * Layer 3 content: the plane of Myrror (DESIGN.md §7).
 *
 * Myrror is a second conquest frontier that persists across Refounds and
 * Ascensions (it resets only on Planeshift). Part of the army fights there,
 * through the Towers of Wizardry you have cleared. Myrran cities taken are
 * held for the rest of the Planeshift and boost Arcanus.
 */
import { D, Decimal } from "../engine/decimal";
import { EffectDef } from "../engine/effects";
import { hash, hashFloat, hashPick } from "../engine/rng";
import { REGION_SIZE, RIVAL_WIZARDS } from "./frontier";
import { MyrranRaceId, MYRROR_RING, neighborOrder, RACES } from "./races";
import { TraitId } from "./traits";

/** Mutable so the balance simulator can try alternatives */
export const MYRROR_TUNING = {
    /** About the strength of Arcanus's first rival wizard */
    defenseBase: 1e12,
    /** Steeper than Arcanus's late ×1.45: Myrror is meant to take several Planeshifts */
    defenseGrowth: 1.75,
    capitalMult: 3,
    domainMult: 2,
    fortressMult: 10,
};

/** Myrran race regions before the first Myrran wizard, and between the later ones */
const FIRST_RACE_REGIONS = 5;
const LATER_RACE_REGIONS = 2;
export const MYRROR_WIZARDS = 4;

/** At most this many links (MoM has six Towers of Wizardry) */
export const MAX_LINKS = 6;
/** Share of the army each link lets fight on Myrror */
export const SHARE_PER_LINK = 0.1;

export interface MyrrorRegion {
    index: number;
    kind: "borderlands" | "race" | "wizard";
    race: MyrranRaceId;
    name: string;
    wizard?: string;
}

export interface MyrrorCity {
    index: number;
    region: MyrrorRegion;
    name: string;
    race: MyrranRaceId;
    traits: TraitId[];
    defense: Decimal;
    pop: number;
    isRegionCapital: boolean;
    fortressOf?: string;
}

/** Myrror's rival wizards for a beachhead race: distinct, and (by seed) different from Arcanus's usual ones */
export function myrranWizards(beachhead: MyrranRaceId): string[] {
    const pool: string[] = [...RIVAL_WIZARDS];
    const result: string[] = [];
    for (let i = 0; i < MYRROR_WIZARDS && pool.length > 0; i++) {
        result.push(pool.splice(hash("myrrorWizard", beachhead, i) % pool.length, 1)[0]);
    }
    return result;
}

export function myrrorPlan(beachhead: MyrranRaceId): MyrrorRegion[] {
    const regions: MyrrorRegion[] = [
        { index: 0, kind: "borderlands", race: beachhead, name: `${RACES[beachhead].adjective} Borderlands` },
    ];
    const order = neighborOrder(beachhead) as MyrranRaceId[];
    let cursor = 0;
    myrranWizards(beachhead).forEach((wizard, d) => {
        const block = d === 0 ? FIRST_RACE_REGIONS : LATER_RACE_REGIONS;
        for (let i = 0; i < block; i++) {
            const r = order[cursor++ % order.length];
            regions.push({ index: regions.length, kind: "race", race: r, name: RACES[r].plural });
        }
        regions.push({
            index: regions.length,
            kind: "wizard",
            race: hashPick(MYRROR_RING, "myrrorDomainRace", beachhead, wizard),
            name: `Domain of ${wizard} (Myrror)`,
            wizard,
        });
    });
    return regions;
}

export function myrrorEnd(plan: MyrrorRegion[]): number {
    return plan.length * REGION_SIZE;
}

export function myrrorDefense(index: number): Decimal {
    const t = MYRROR_TUNING;
    return D(t.defenseBase).times(Decimal.pow(t.defenseGrowth, index));
}

/** The Myrror city at `index`, or null past the edge of Myrror */
export function myrrorCity(beachhead: MyrranRaceId, plan: MyrrorRegion[], index: number): MyrrorCity | null {
    if (index >= myrrorEnd(plan)) return null;
    const region = plan[Math.floor(index / REGION_SIZE)];
    const local = index % REGION_SIZE;
    const isRegionCapital = local === REGION_SIZE - 1;
    const t = MYRROR_TUNING;
    let defense = myrrorDefense(index);
    const traits: TraitId[] = [];
    let fortressOf: string | undefined;
    if (region.kind === "wizard") {
        traits.push("wards");
        defense = defense.times(t.domainMult);
        if (isRegionCapital) {
            traits.push("walls");
            defense = defense.times(t.fortressMult / t.domainMult);
            fortressOf = region.wizard;
        }
    } else if (isRegionCapital) {
        traits.push("walls");
        defense = defense.times(t.capitalMult);
    } else {
        const roll = hashFloat("myrrorTrait", beachhead, index);
        if (roll < 0.5) traits.push(RACES[region.race].favoredTrait);
        else if (roll < 0.8) traits.push(hashPick(["archers", "cavalryScreen", "shieldWall", "flying"] as TraitId[], "myrrorTrait2", beachhead, index));
    }
    const name = fortressOf
        ? `Fortress of ${fortressOf}`
        : hashPick(RACES[region.race].nameParts.start, "mns", beachhead, index) +
          hashPick(RACES[region.race].nameParts.end, "mne", beachhead, index);
    return {
        index,
        region,
        name,
        race: region.race,
        traits,
        defense,
        pop: 4 + Math.floor(index / 4) + (isRegionCapital ? 3 : 0),
        isRegionCapital,
        fortressOf,
    };
}

// --- Holdings ------------------------------------------------------------------

/** What each Myrran race held on Myrror gives: ×(1 + 0.1 × cities) to one stat */
/** Bridgehead: share of the best Myrror frontier that surrenders at once, per level */
export const BRIDGEHEAD_PER_LEVEL = 0.2;
/** Known on Two Worlds: share that surrenders at once; stacks with Bridgehead (see myrrorHeadStartFraction) */
export const KNOWN_ON_TWO_WORLDS = 0.5;

/** Combined head start, in whole percent, for a Bridgehead level with Known on Two Worlds */
export function headStartWithRenownPct(level: number): number {
    return Math.round(100 * Math.min(0.9, 1 - (1 - BRIDGEHEAD_PER_LEVEL * level) * (1 - KNOWN_ON_TWO_WORLDS)));
}

export const HOLDING_PER_CITY = 0.1;
export const HOLDING_STAT: Record<MyrranRaceId, { stat: string; text: string }> = {
    beastmen: { stat: "knowledge.mult", text: "knowledge" },
    darkElf: { stat: "mana.mult", text: "mana" },
    draconian: { stat: "army.power", text: "army power" },
    dwarf: { stat: "prod.mult", text: "production" },
    klackon: { stat: "gold.mult", text: "gold" },
    troll: { stat: "myrror.power", text: "siege power on Myrror" },
};

// --- Planar Essence upgrades -------------------------------------------------------

export interface EssenceUpgradeDef {
    id: string;
    name: string;
    maxLevel: number;
    cost: (level: number) => number;
    effects: EffectDef[];
    text: (level: number) => string;
}

const essenceList: EssenceUpgradeDef[] = [
    {
        id: "planarAnchor",
        name: "Planar Anchor",
        maxLevel: 4,
        cost: (l) => Math.round(3 * Math.pow(3, l)),
        effects: [],
        text: (l) => `+${l * 10}% of the army may fight on Myrror`,
    },
    {
        id: "astralLegions",
        name: "Astral Legions",
        maxLevel: 50,
        cost: (l) => Math.round(2 * Math.pow(1.7, l)),
        effects: [{ stat: "myrror.power", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} siege power on Myrror`,
    },
    {
        id: "echoOfArcanus",
        name: "Echo of Arcanus",
        maxLevel: 50,
        cost: (l) => Math.round(2 * Math.pow(1.7, l)),
        effects: [
            { stat: "prod.mult", op: "mult", value: (l) => Math.pow(2, l) },
            { stat: "gold.mult", op: "mult", value: (l) => Math.pow(2, l) },
            { stat: "knowledge.mult", op: "mult", value: (l) => Math.pow(2, l) },
        ],
        text: (l) => `×${fmtNum(Math.pow(2, l))} production, gold and knowledge`,
    },
    {
        id: "wellspring",
        name: "Wellspring",
        maxLevel: 20,
        cost: (l) => Math.round(4 * Math.pow(2, l)),
        effects: [{ stat: "insight.mult", op: "mult", value: (l) => Math.pow(2, l) }],
        text: (l) => `×${fmtNum(Math.pow(2, l))} Insight from Ascending`,
    },
    {
        id: "bridgehead",
        name: "Bridgehead",
        maxLevel: 4,
        cost: (l) => Math.round(10 * Math.pow(3, l)),
        effects: [],
        text: (l) =>
            l === 0
                ? "Myrror starts from scratch"
                : `Myrror cities below ${Math.round(l * BRIDGEHEAD_PER_LEVEL * 100)}% of your best Myrror frontier surrender at once (${headStartWithRenownPct(l)}% with Known on Two Worlds)`,
    },
    {
        id: "enduringLegacy",
        name: "Enduring Legacy",
        maxLevel: 1,
        cost: () => 20,
        effects: [],
        text: (l) =>
            l === 0
                ? "Ascending resets your Fame upgrades"
                : "Keep your Fame upgrades when you Ascend (can be switched off). Fame you earn afterwards first repays what they cost, before you can buy more",
    },
];

export const ESSENCE_UPGRADES: Record<string, EssenceUpgradeDef> = Object.fromEntries(essenceList.map((u) => [u.id, u]));
export const ESSENCE_UPGRADE_ORDER: string[] = essenceList.map((u) => u.id);

// --- Planeshift milestones -----------------------------------------------------------

export type PlaneshiftMilestoneId = "planewalker" | "autoAscend" | "twinTowers" | "myrrorRenown";

export interface PlaneshiftMilestoneDef {
    id: PlaneshiftMilestoneId;
    planeshifts: number;
    name: string;
    text: string;
}

export const PLANESHIFT_MILESTONES: PlaneshiftMilestoneDef[] = [
    {
        id: "planewalker",
        planeshifts: 1,
        name: "Planewalker",
        text: "You stay a Wizard. Ascension milestones count 3 extra Ascensions (all Layer 2 automation from the start). Unlock auto-Refound.",
    },
    {
        id: "autoAscend",
        planeshifts: 2,
        name: "Eternal Return",
        text: "Unlock auto-Ascend (with your planned wizard profile).",
    },
    {
        id: "twinTowers",
        planeshifts: 3,
        name: "Twin Towers",
        text: "Start each Planeshift with 2 planar links.",
    },
    {
        id: "myrrorRenown",
        planeshifts: 4,
        name: "Known on Two Worlds",
        text: "Myrror cities below half your best Myrror frontier surrender at once. Stacks with Bridgehead: each Bridgehead level adds 10% more (up to 90%).",
    },
];

function fmtNum(n: number): string {
    if (n >= 1e6) return n.toExponential(2);
    if (n >= 100) return Math.round(n).toLocaleString("en-US");
    return Number(n.toFixed(2)).toString();
}
