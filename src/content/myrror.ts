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
import { Realm, REALM_DEFS } from "./magic";
import { RIVAL_WIZARD_DEFS } from "./wizards";

/** Mutable so the balance simulator can try alternatives */
export const MYRROR_TUNING = {
    /** About the strength of Arcanus's first rival wizard */
    defenseBase: 1e12,
    /** Steeper than Arcanus's late ×1.45: Myrror is meant to take several Planeshifts */
    defenseGrowth: 1.75,
    capitalMult: 3,
    domainMult: 2,
    fortressMult: 10,
    /** A Tower of Wizardry defends like a region capital */
    towerMult: 3,
    /**
     * What one planar link carries across (army power per second) at Myrror's
     * first city, growing by linkGrowth per city: slower than the defenses, so
     * Myrror stiffens even for an army too strong for the links (DESIGN.md §15.6)
     */
    linkCapacity: 3e9,
    linkGrowth: 1.7,
};

/** Myrror regions whose first city is a Tower of Wizardry: one in the long first stretch, then each wizard's domain */
export const TOWER_REGIONS = [3];

/** Myrran race regions before the first Myrran wizard, and between the later ones */
const FIRST_RACE_REGIONS = 5;
const LATER_RACE_REGIONS = 2;
export const MYRROR_WIZARDS = 4;

/** At most this many links (MoM has six Towers of Wizardry: the one you came through, and five on Myrror) */
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
    /** A Tower of Wizardry: taking it adds a planar link */
    tower?: boolean;
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

/** Towers of Wizardry on Myrror: one in the first stretch, and one at the gate of each Myrran wizard's domain */
export const MYRROR_TOWERS = TOWER_REGIONS.length + MYRROR_WIZARDS;

/** Frontier indices of Myrror's Towers of Wizardry */
export function towerIndices(plan: MyrrorRegion[]): number[] {
    return plan.filter((r) => r.kind === "wizard" || TOWER_REGIONS.includes(r.index)).map((r) => r.index * REGION_SIZE);
}

/** Towers already behind a campaign at frontier `index` */
export function towersTaken(plan: MyrrorRegion[], index: number): number {
    return towerIndices(plan).filter((i) => i < index).length;
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
    const tower = local === 0 && (region.kind === "wizard" || TOWER_REGIONS.includes(region.index));
    if (tower) {
        // the Tower: guarded by flying things, and by the wizard's wards in a domain
        traits.push(...(region.kind === "wizard" ? (["wards", "flying"] as TraitId[]) : (["flying", "regenerating"] as TraitId[])));
        defense = defense.times(t.towerMult);
    } else if (region.kind === "wizard") {
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
        : tower
          ? "Tower of Wizardry"
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
        tower: tower || undefined,
    };
}

// --- Holdings ------------------------------------------------------------------

/** Bridgehead: share of the best Myrror frontier that surrenders at once, per level */
export const BRIDGEHEAD_PER_LEVEL = 0.2;
/** Known on Two Worlds: share that surrenders at once; stacks with Bridgehead (see myrrorHeadStartFraction) */
export const KNOWN_ON_TWO_WORLDS = 0.5;

/** Combined head start, in whole percent, for a Bridgehead level with Known on Two Worlds */
export function headStartWithRenownPct(level: number): number {
    return Math.round(100 * Math.min(0.9, 1 - (1 - BRIDGEHEAD_PER_LEVEL * level) * (1 - KNOWN_ON_TWO_WORLDS)));
}

/** What each Myrran race held on Myrror gives: ×(1 + 0.1 × cities) to one stat */
export const HOLDING_PER_CITY = 0.1;
export const HOLDING_STAT: Record<MyrranRaceId, { stat: string; text: string }> = {
    beastmen: { stat: "knowledge.mult", text: "knowledge" },
    darkElf: { stat: "mana.mult", text: "mana" },
    draconian: { stat: "army.power", text: "army power" },
    dwarf: { stat: "prod.mult", text: "production" },
    klackon: { stat: "gold.mult", text: "gold" },
    troll: { stat: "myrror.power", text: "army power on Myrror" },
};

// --- Myrran resources and works ------------------------------------------------------

/**
 * Myrror's own riches (from MoM: Adamantium ore, Quork and Crysx crystals).
 * Every Myrran city taken yields its race's resource; they are spent on Myrran
 * works. Both last until the next Planeshift, like the campaign.
 */
export type MyrranResource = "adamantium" | "quork" | "crysx";
export const MYRRAN_RESOURCES: MyrranResource[] = ["adamantium", "quork", "crysx"];

export const RESOURCE_DEFS: Record<MyrranResource, { name: string; icon: string }> = {
    adamantium: { name: "Adamantium", icon: "⬢" },
    quork: { name: "Quork", icon: "✧" },
    crysx: { name: "Crysx", icon: "✶" },
};

export const RESOURCE_OF_RACE: Record<MyrranRaceId, MyrranResource> = {
    dwarf: "adamantium",
    troll: "adamantium",
    beastmen: "quork",
    klackon: "quork",
    darkElf: "crysx",
    draconian: "crysx",
};

/** Resource yield of a Myrran city taken, and of a region capital or Fortress */
export const CITY_YIELD = 1;
export const CAPITAL_YIELD = 3;

export interface MyrranWorkDef {
    id: string;
    name: string;
    resource: MyrranResource;
    maxLevel: number;
    cost: (level: number) => number;
    effects: EffectDef[];
    text: (level: number) => string;
}

/**
 * Not rounded here: myrranWorkCost rounds once, after the partner works' ×1.5,
 * so a resource's two works cost exactly the same at the same total level
 */
const workCost = (l: number) => 2 * Math.pow(1.5, l);

const workList: MyrranWorkDef[] = [
    {
        id: "adamantiumArms",
        name: "Adamantium Arms",
        resource: "adamantium",
        maxLevel: 20,
        cost: workCost,
        effects: [{ stat: "army.power", op: "mult", value: (l) => Math.pow(1.25, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.25, l))} army power (both planes)`,
    },
    {
        id: "myrranGarrisons",
        name: "Myrran Garrisons",
        resource: "adamantium",
        maxLevel: 20,
        cost: workCost,
        effects: [{ stat: "myrror.power", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} army power on Myrror`,
    },
    {
        id: "quorkFoci",
        name: "Quork Foci",
        resource: "quork",
        maxLevel: 20,
        cost: workCost,
        effects: [
            { stat: "mana.mult", op: "mult", value: (l) => Math.pow(1.5, l) },
            { stat: "knowledge.mult", op: "mult", value: (l) => Math.pow(1.5, l) },
        ],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} mana and knowledge`,
    },
    {
        id: "planarCaravans",
        name: "Planar Caravans",
        resource: "quork",
        maxLevel: 20,
        cost: workCost,
        effects: [
            { stat: "prod.mult", op: "mult", value: (l) => Math.pow(1.5, l) },
            { stat: "gold.mult", op: "mult", value: (l) => Math.pow(1.5, l) },
        ],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} production and gold`,
    },
    {
        id: "planarGate",
        name: "Planar Gate",
        resource: "crysx",
        maxLevel: 5,
        cost: (l) => Math.round(3 * Math.pow(2.5, l)),
        effects: [],
        text: (l) => (l === 0 ? "No extra planar links" : `+${l} planar link${l === 1 ? "" : "s"} (still at most ${MAX_LINKS})`),
    },
    {
        id: "crysxLenses",
        name: "Crysx Lenses",
        resource: "crysx",
        maxLevel: 20,
        cost: workCost,
        effects: [
            { stat: "fame.mult", op: "mult", value: (l) => Math.pow(1.25, l) },
            { stat: "insight.mult", op: "mult", value: (l) => Math.pow(1.25, l) },
        ],
        text: (l) => `×${fmtNum(Math.pow(1.25, l))} Fame and Insight`,
    },
];

export const MYRRAN_WORKS: Record<string, MyrranWorkDef> = Object.fromEntries(workList.map((w) => [w.id, w]));
export const MYRRAN_WORK_ORDER: string[] = workList.map((w) => w.id);

// --- Boons: choices at Myrran region capitals and Fortresses ------------------------

/**
 * Taking a Myrran region capital offers a choice of two boons from its race: one
 * that helps Arcanus, one that pushes Myrror. Banishing a Myrran wizard offers
 * their vaults (resources now) or their spellbooks (a lasting bonus per realm).
 * Boons last until the next Planeshift.
 */
export interface BoonDef {
    id: string;
    name: string;
    /** Which plane a race boon helps (shown on the choice) */
    side?: "arcanus" | "myrror";
    effects: EffectDef[];
    text: string;
    /** Resources granted at once */
    grant?: Partial<Record<MyrranResource, number>>;
}

const mult = (stat: string, value: number): EffectDef => ({ stat, op: "mult", value });

/** Myrran region capitals and Fortresses defend at this multiple with an Infiltrators/Tunnelers boon */
export const CAPITAL_DEFENSE_BOON = 0.6;

export const RACE_BOONS: Record<MyrranRaceId, [BoonDef, BoonDef]> = {
    beastmen: [
        { id: "beastmen.arcanus", name: "Minotaur Sages", side: "arcanus", effects: [mult("knowledge.mult", 1.5)], text: "×1.5 knowledge" },
        { id: "beastmen.myrror", name: "Manticore Outriders", side: "myrror", effects: [mult("myrror.power", 1.3)], text: "×1.3 army power on Myrror" },
    ],
    darkElf: [
        { id: "darkElf.arcanus", name: "Dark Elf Channelers", side: "arcanus", effects: [mult("mana.mult", 1.5)], text: "×1.5 mana" },
        {
            id: "darkElf.myrror",
            name: "Nightblade Infiltrators",
            side: "myrror",
            effects: [mult("myrror.capitalDefense", CAPITAL_DEFENSE_BOON)],
            text: `×${CAPITAL_DEFENSE_BOON} defense of Myrran region capitals and Fortresses`,
        },
    ],
    draconian: [
        { id: "draconian.arcanus", name: "Draconian Air Legions", side: "arcanus", effects: [mult("army.power", 1.3)], text: "×1.3 army power (both planes)" },
        { id: "draconian.myrror", name: "Skyborne Couriers", side: "myrror", effects: [mult("myrror.resources", 1.5)], text: "×1.5 resources from Myrran cities" },
    ],
    dwarf: [
        { id: "dwarf.arcanus", name: "Dwarven Forgemasters", side: "arcanus", effects: [mult("prod.mult", 1.5)], text: "×1.5 production" },
        { id: "dwarf.myrror", name: "Steam Cannon Batteries", side: "myrror", effects: [mult("myrror.power", 1.3)], text: "×1.3 army power on Myrror" },
    ],
    klackon: [
        { id: "klackon.arcanus", name: "Klackon Hives", side: "arcanus", effects: [mult("gold.mult", 1.5)], text: "×1.5 gold" },
        {
            id: "klackon.myrror",
            name: "Klackon Tunnelers",
            side: "myrror",
            effects: [mult("myrror.capitalDefense", CAPITAL_DEFENSE_BOON)],
            text: `×${CAPITAL_DEFENSE_BOON} defense of Myrran region capitals and Fortresses`,
        },
    ],
    troll: [
        { id: "troll.arcanus", name: "Troll Chieftains' Tribute", side: "arcanus", effects: [mult("fame.mult", 1.25)], text: "×1.25 Fame from Refounds" },
        { id: "troll.myrror", name: "War Troll Vanguard", side: "myrror", effects: [mult("myrror.power", 1.4)], text: "×1.4 army power on Myrror" },
    ],
};

/** Resources of each kind in a banished Myrran wizard's vaults */
export const VAULT_AMOUNT = 10;

/** What studying a banished wizard's spellbooks gives, per realm they know */
export const REALM_LORE: Record<Realm, { effects: EffectDef[]; text: string }> = {
    life: {
        effects: [
            { stat: "pop.max", op: "add", value: 1 },
            { stat: "pop.growth", op: "mult", value: 1.5 },
        ],
        text: "+1 max population per city and ×1.5 growth",
    },
    death: { effects: [mult("army.power", 1.3)], text: "×1.3 army power" },
    chaos: { effects: [mult("myrror.power", 1.5)], text: "×1.5 army power on Myrror" },
    nature: { effects: [mult("prod.mult", 1.5)], text: "×1.5 production" },
    sorcery: {
        effects: [mult("mana.mult", 1.5), mult("knowledge.mult", 1.5)],
        text: "×1.5 mana and knowledge",
    },
};

/** A banished Myrran wizard's two boons: their vaults, or their spellbooks */
export function wizardBoons(wizard: string): [BoonDef, BoonDef] {
    const realms = RIVAL_WIZARD_DEFS[wizard]?.realms ?? [];
    // a wizard of a single realm knows it twice as well
    const lore = realms.length === 1 ? [realms[0], realms[0]] : realms;
    const grant = Object.fromEntries(MYRRAN_RESOURCES.map((r) => [r, VAULT_AMOUNT])) as Record<MyrranResource, number>;
    return [
        {
            id: `vault:${wizard}`,
            name: `${wizard}'s Vaults`,
            effects: [],
            grant,
            text: `+${VAULT_AMOUNT} of each Myrran resource now`,
        },
        {
            id: `lore:${wizard}`,
            name: `${wizard}'s Spellbooks`,
            effects: lore.flatMap((r) => REALM_LORE[r].effects),
            text:
                realms.length === 1
                    ? `${REALM_LORE[realms[0]].text}, twice over (${wizard} knows only ${REALM_DEFS[realms[0]].name})`
                    : realms.map((r) => REALM_LORE[r].text).join("; "),
        },
    ];
}

/** Looks up any boon by id (race boons, or a wizard's vault or spellbooks) */
export function boonDef(id: string): BoonDef | null {
    const [race, side] = id.split(".");
    if (side) {
        const pair = RACE_BOONS[race as MyrranRaceId];
        return pair?.find((b) => b.id === id) ?? null;
    }
    const wizard = id.slice(id.indexOf(":") + 1);
    return wizardBoons(wizard).find((b) => b.id === id) ?? null;
}

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
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} army power on Myrror`,
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
        id: "astralSorcery",
        name: "Astral Sorcery",
        maxLevel: 50,
        cost: (l) => Math.round(2 * Math.pow(1.7, l)),
        effects: [{ stat: "spell.power", op: "mult", value: (l) => Math.pow(2, l) }],
        text: (l) => `×${fmtNum(Math.pow(2, l))} spell power (against rival wizards' wards)`,
    },
    {
        id: "planarChannel",
        name: "Planar Channel",
        maxLevel: 20,
        cost: (l) => Math.round(10 * Math.pow(2, l)),
        effects: [{ stat: "mastery.channel", op: "mult", value: (l) => Math.pow(1.5, l) }],
        text: (l) => `×${fmtNum(Math.pow(1.5, l))} channel speed for the Spell of Mastery`,
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
        text: "Unlock auto-Ascend (with your planned wizard profile) and auto-buy for Myrran works.",
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
