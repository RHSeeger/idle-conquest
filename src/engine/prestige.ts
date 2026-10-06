/**
 * Layer 1 prestige: Refound.
 *
 * Refounding ends the run, converts conquests into Fame, adds conquered races
 * to the Annals, records the run in the Chronicle (for automation), and starts
 * a new run as any race in the Annals.
 */
import { ARCHITECT_BUILDINGS, FAME_UPGRADES, MILESTONES, MilestoneId, warChestAmount } from "../content/fame";
import { cityName } from "../content/frontier";
import { RACES, RaceId } from "../content/races";
import { getStats, registerCollector } from "./collect";
import { D, Decimal } from "./decimal";
import { fmtInt } from "./format";
import { cityMaxPop } from "./economy";
import { Hero, heroCarryLog, mostExperienced } from "./heroes";
import { bump, GameState, log, newRun, recordRun } from "./state";

export const MAX_RACE_MASTERY = 5;

/** Fame = (Fame population / 8)^0.9 × (1 + 0.25 × races conquered) */
const FAME_POP_DIVISOR = 8;
const FAME_POP_EXPONENT = 0.9;
const FAME_PER_RACE = 0.25;
/**
 * Cities that surrendered to Renown count for this share of their population,
 * building up linearly over the first TRIBUTE_SECONDS of the run. The ramp
 * stops "refound the moment Renown finishes" from being free Fame.
 */
export const TRIBUTE_SHARE = 0.5;
export const TRIBUTE_SECONDS = 15 * 60;
/** Each Fame ever earned gives this much bonus to production, gold, knowledge and army power */
export const RENOWN_PER_FAME = 0.02;

// --- Refound ---

export function canRefound(state: GameState): boolean {
    return state.run.racesConquered.length >= 1;
}

export function refoundRequirementText(): string {
    return "Conquer a city of another race (reach the first region beyond your Borderlands).";
}

/**
 * Whether Refounding now grants Mastery for the starting race and records the
 * run in the Chronicle: the run must have taken at least one city by force.
 */
export function earnsMastery(state: GameState): boolean {
    return state.run.conqueredPop > 0;
}

/**
 * What keeps heroes through a Refound: Hall of Heroes (Fame) or Eternal
 * Companions (Insight, which also covers Refounds), whichever keeps more.
 * Eternal Companions counts here so heroes it carried through an Ascension
 * aren't lost at the next Refound, before Hall of Heroes is bought again.
 */
export function refoundHeroKeeper(state: GameState): { name: string; slots: number } {
    const hall = fameUpgradeLevel(state, "hallOfHeroes");
    // read directly: ascension.ts imports this module
    const companions = state.ascension.upgrades.eternalCompanions ?? 0;
    return companions > 0 && companions >= hall
        ? { name: "Eternal Companions", slots: companions }
        : { name: "Hall of Heroes", slots: hall };
}

/** The heroes that would follow you into the next run on a Refound: the most experienced, one per slot */
export function heroesKeptOnRefound(state: GameState): Hero[] {
    return mostExperienced(state, refoundHeroKeeper(state).slots);
}

/** How much of the surrendered cities' tribute has built up (0..TRIBUTE_SHARE) */
export function tributeShare(state: GameState): number {
    return TRIBUTE_SHARE * Math.min(1, state.run.time / TRIBUTE_SECONDS);
}

/** Population that counts for Fame: conquered by force, plus tribute from surrendered cities */
export function famePop(state: GameState, tribute = tributeShare(state)): number {
    return state.run.conqueredPop + state.run.surrenderedPop * tribute;
}

/** Seconds of run time until the tribute from surrendered cities is complete (0 if it already is) */
export function tributeSecondsLeft(state: GameState): number {
    return Math.max(0, TRIBUTE_SECONDS - state.run.time);
}

/** Fame on Refound once the tribute has fully built up (with the current conquests) */
export function fameWithFullTribute(state: GameState): Decimal {
    return fameOnRefound(state, TRIBUTE_SHARE);
}

export function fameOnRefound(state: GameState, tribute = tributeShare(state)): Decimal {
    if (!canRefound(state)) {
        return D(0);
    }
    const run = state.run;
    const base = Math.pow(famePop(state, tribute) / FAME_POP_DIVISOR, FAME_POP_EXPONENT);
    const raceMult = 1 + FAME_PER_RACE * run.racesConquered.length;
    return D(base * raceMult).times(getStats(state).get("fame.mult")).floor();
}

export function refound(state: GameState, nextRace: RaceId): boolean {
    // you may start as any race already in the Annals or conquered this run
    if (!canRefound(state) || !(state.prestige.annals.includes(nextRace) || state.run.racesConquered.includes(nextRace))) {
        return false;
    }
    const run = state.run;
    const p = state.prestige;
    const fame = fameOnRefound(state);

    p.fame = p.fame.plus(fame);
    p.fameTotal = p.fameTotal.plus(fame);
    state.ascension.fameEarned = state.ascension.fameEarned.plus(fame);
    for (const r of run.racesConquered) {
        if (!p.annals.includes(r)) {
            p.annals.push(r);
        }
    }
    // only a run that fought for something earns Mastery and becomes the Chronicle:
    // otherwise Renown would allow instant refounds for free Mastery (and an empty Chronicle)
    if (earnsMastery(state)) {
        p.raceMastery[run.startingRace] = Math.min(MAX_RACE_MASTERY, (p.raceMastery[run.startingRace] ?? 0) + 1);
        p.chronicle = {
            buildOrder: [...run.buildings],
            unitMix: { ...run.units },
            lore: { ...run.lore },
        };
    }
    if (run.peakPower.gt(p.bestPower)) {
        p.bestPower = run.peakPower;
    }
    p.refounds++;
    state.records.totalRefounds++;
    recordRun(state, "refound", fame);

    const newRaces = run.racesConquered.map((r) => RACES[r].plural).join(", ");
    log(
        state,
        "prestige",
        `Refounded as ${RACES[nextRace].plural} after ${Math.round(run.time / 60)} minutes. +${fmtInt(fame)} Fame. Races in the Annals: ${newRaces}.`,
    );

    const kept = heroesKeptOnRefound(state);
    heroCarryLog(state, kept, refoundHeroKeeper(state).name);

    state.run = newRun(nextRace);
    state.run.heroes = kept.map((h) => ({ ...h }));
    applyRunStart(state);
    bump(state);
    for (const m of MILESTONES) {
        if (m.refounds === effectiveRefounds(state)) {
            log(state, "milestone", `Milestone: ${m.name}. ${m.text}`);
        }
    }
    return true;
}

/** Applies legacy bonuses (milestones, Fame upgrades) to a freshly started run */
export function applyRunStart(state: GameState): void {
    const run = state.run;
    const give = (ids: string[]) => {
        for (const id of ids) {
            if (!run.buildings.includes(id)) {
                run.buildings.push(id);
            }
        }
    };
    if (hasMilestone(state, "foundations")) {
        give(["barracks", "buildersHall"]);
    }
    const architects = fameUpgradeLevel(state, "royalArchitects");
    for (let l = 1; l <= architects; l++) {
        give(ARCHITECT_BUILDINGS[l]);
    }
    const chest = warChestAmount(fameUpgradeLevel(state, "warChest"));
    run.production = D(chest);
    run.gold = D(chest);
    if (hasMilestone(state, "autoSettle")) {
        for (let i = 1; i <= 2; i++) {
            run.cities.push({
                id: run.nextCityId++,
                name: cityName(run.startingRace, "pioneer", i),
                race: run.startingRace,
                pop: 1,
                origin: "settled",
            });
        }
    }
    bump(state);
    if (hasMilestone(state, "secondCapital")) {
        const capital = run.cities[0];
        capital.pop = cityMaxPop(getStats(state), capital);
    }
}

// --- Milestones ---

/**
 * Refounds as counted for milestones: real refounds plus the bonus from
 * Ascension milestones ("A Wizard's Household": +2, "Legend Never Dies": +4).
 */
export function effectiveRefounds(state: GameState): number {
    const asc = effectiveAscensions(state);
    const bonus = asc >= 2 ? 4 : asc >= 1 ? 2 : 0;
    return state.prestige.refounds + bonus;
}

/** Ascensions as counted for Ascension milestones: Planewalker (1 Planeshift) adds 3 */
export function effectiveAscensions(state: GameState): number {
    return state.ascension.ascensions + (state.planes.planeshifts >= 1 ? 3 : 0);
}

export function hasMilestone(state: GameState, id: MilestoneId): boolean {
    const m = MILESTONES.find((x) => x.id === id);
    return !!m && effectiveRefounds(state) >= m.refounds;
}

// --- Renown (instant surrender) ---

export function renownFraction(state: GameState): number {
    if (!hasMilestone(state, "renown")) {
        return 0;
    }
    let f = 0.5 + 0.1 * fameUpgradeLevel(state, "legend");
    if (hasMilestone(state, "secondCapital")) {
        f += 0.25;
    }
    return Math.min(0.95, f);
}

/**
 * Frontier cities with an index below this surrender without a fight. Uses the
 * best frontier of this Ascension: a new wizard's realm has to earn its name
 * again (otherwise it is dropped deep in the frontier with a fresh economy).
 */
export function renownLimit(state: GameState): number {
    return Math.floor(state.prestige.ascensionBestFrontier * renownFraction(state));
}

// --- Fame upgrades ---

export function fameUpgradeLevel(state: GameState, id: string): number {
    return state.prestige.upgrades[id] ?? 0;
}

export function fameUpgradeCost(state: GameState, id: string): number {
    return FAME_UPGRADES[id].cost(fameUpgradeLevel(state, id));
}

export function canBuyFameUpgrade(state: GameState, id: string): boolean {
    const u = FAME_UPGRADES[id];
    return !!u && fameUpgradeLevel(state, id) < u.maxLevel && state.prestige.fame.gte(fameUpgradeCost(state, id));
}

export function buyFameUpgrade(state: GameState, id: string): boolean {
    if (!canBuyFameUpgrade(state, id)) {
        return false;
    }
    state.prestige.fame = state.prestige.fame.minus(fameUpgradeCost(state, id));
    state.prestige.upgrades[id] = fameUpgradeLevel(state, id) + 1;
    state.prestige.fameOrder.push(id);
    bump(state);
    return true;
}

/**
 * Called when the Fame tree resets (Ascension, Planeshift): this Ascension's
 * purchase order becomes the Fame Chronicle that auto-buy can replay.
 */
export function closeFameChronicle(state: GameState): void {
    const p = state.prestige;
    if (p.fameOrder.length > 0) state.ascension.fameChronicle = [...p.fameOrder];
    p.fameOrder = [];
}

// --- Effect sources ---

registerCollector((state, stats) => {
    for (const [id, level] of Object.entries(state.prestige.upgrades)) {
        const u = FAME_UPGRADES[id];
        if (u && level > 0) {
            stats.applyEffects(`Fame: ${u.name} ${level}`, u.effects, level);
        }
    }
});

registerCollector((state, stats) => {
    const total = state.prestige.fameTotal;
    if (total.gt(0)) {
        const mult = total.times(RENOWN_PER_FAME).plus(1);
        for (const stat of ["prod.mult", "gold.mult", "knowledge.mult", "army.power"]) {
            stats.addModifier(stat, { source: `Renown (${fmtInt(total)} Fame earned)`, op: "mult", value: mult });
        }
    }
});

registerCollector((state, stats) => {
    for (const [raceId, level] of Object.entries(state.prestige.raceMastery)) {
        if (level && level > 0) {
            const name = RACES[raceId as RaceId].plural;
            stats.addModifier("prod.mult", { source: `${name} mastery ${level}`, op: "mult", value: D(1 + 0.1 * level), scope: raceId });
            stats.addModifier("pop.max", { source: `${name} mastery ${level}`, op: "add", value: D(0.5 * level), scope: raceId });
        }
    }
});
