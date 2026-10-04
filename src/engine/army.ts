/**
 * Army power and the conquest frontier.
 *
 * Troops generate siege power every second. Siege progress builds against the
 * current frontier city; when it reaches the city's defense the city falls,
 * its defense is subtracted, and any overflow carries on to the next city.
 * There is no randomness — the same army always takes the same time.
 */
import {
    ARCANUS_WIZARDS,
    BASE_RACE_REGIONS,
    FrontierCity,
    frontierCity,
    regionPlan,
    RegionDef,
    wallIndex,
} from "../content/frontier";
import { RACES } from "../content/races";
import { Role, ROLES, TraitId, traitRoleMult } from "../content/traits";
import { DRILL_STEP, UNITS, UNIT_ORDER } from "../content/units";
import { RIVAL_WIZARD_DEFS } from "../content/wizards";
import { XP_PER_CONQUEST } from "../content/heroes";
import { grantHeroXp } from "./heroes";
import { racesInRealm } from "./collect";
import { D, Decimal, ONE, ZERO } from "./decimal";
import { roleStat, Stats, unitPowerStat } from "./effects";
import { effectiveTraits, isWizard, knowsSpell } from "./magic";
import { renownLimit } from "./prestige";
import { bump, GameState, log } from "./state";

export function isUnitAvailable(state: GameState, id: string, races: readonly string[] = racesInRealm(state)): boolean {
    const u = UNITS[id];
    if (u.spell !== undefined) {
        return knowsSpell(state, u.spell);
    }
    if (!u.requires.every((b) => state.run.buildings.includes(b))) {
        return false;
    }
    return u.race === undefined || races.includes(u.race);
}

export function availableUnits(state: GameState): string[] {
    const races = racesInRealm(state);
    return UNIT_ORDER.filter((id) => isUnitAvailable(state, id, races));
}

/**
 * Drill multiplier: ×2 for every DRILL_STEP owned. Computed from the count
 * directly (not via Stats) so buying troops doesn't invalidate the stats cache.
 */
export function drillMult(count: number): Decimal {
    const drills = Math.floor(count / DRILL_STEP);
    return drills > 0 ? Decimal.pow(2, drills) : ONE;
}

/** Siege power per second of one unit, before city traits */
export function unitPower(stats: Stats, id: string, owned = 0): Decimal {
    const u = UNITS[id];
    let power = D(u.power)
        .times(stats.get(unitPowerStat(id)))
        .times(stats.get(roleStat(u.role)))
        .times(stats.get("army.power"))
        .times(drillMult(owned));
    if (u.spell !== undefined) {
        power = power.times(stats.get("summon.power"));
    }
    return power;
}

export function powerByRole(state: GameState, stats: Stats): Record<Role, Decimal> {
    const result = Object.fromEntries(ROLES.map((r) => [r, ZERO])) as Record<Role, Decimal>;
    for (const [id, count] of Object.entries(state.run.units)) {
        if (count > 0 && UNITS[id]) {
            const role = UNITS[id].role;
            result[role] = result[role].plus(unitPower(stats, id, count).times(count));
        }
    }
    return result;
}

/** Total siege power per second against a city with the given traits */
export function siegePower(state: GameState, stats: Stats, traits: readonly TraitId[] = []): Decimal {
    return siegePowerFrom(state, powerByRole(state, stats), traits);
}

/** As siegePower, from an already computed powerByRole (when checking many targets) */
export function siegePowerFrom(state: GameState, byRole: Record<Role, Decimal>, traits: readonly TraitId[]): Decimal {
    const applied = effectiveTraits(state, traits);
    let total = ZERO;
    for (const role of ROLES) {
        total = total.plus(byRole[role].times(traitRoleMult(applied, role)));
    }
    return total;
}

export function raceRegions(state: GameState): number {
    return BASE_RACE_REGIONS + Math.floor(state.prestige.upgrades["scouting"] ?? 0);
}

/** Mortals meet one rival wizard (an impassable wall); wizards can fight through all of Arcanus */
export function currentPlan(state: GameState): RegionDef[] {
    return regionPlan(state.run.startingRace, raceRegions(state), isWizard(state) ? ARCANUS_WIZARDS : 1);
}

export function cityAt(state: GameState, index: number, plan = currentPlan(state)): FrontierCity | null {
    return frontierCity(state.run.startingRace, plan, index, isWizard(state));
}

export function currentTarget(state: GameState): FrontierCity | null {
    return cityAt(state, state.run.frontier.index);
}

/** Advances the siege by dt seconds, conquering as many cities as power allows */
export function tickFrontier(state: GameState, stats: Stats, dt: number): void {
    const run = state.run;
    const plan = currentPlan(state);
    let target = cityAt(state, run.frontier.index, plan);

    // Renown: nearby cities surrender to a famous ruler without a fight (never a rival wizard's)
    const limit = renownLimit(state);
    let surrendered = 0;
    while (target && target.index < limit && target.region.kind !== "wizard") {
        conquer(state, target, true, true);
        surrendered++;
        target = cityAt(state, run.frontier.index, plan);
    }
    if (surrendered > 0) {
        log(state, "conquest", `${surrendered} cit${surrendered === 1 ? "y" : "ies"} surrendered to your renown.`);
    }

    if (!target) {
        run.frontier.siege = ZERO;
        return;
    }
    let power = siegePower(state, stats, target.traits);
    if (power.gt(run.peakPower)) {
        run.peakPower = power;
    }
    if (power.lte(0)) {
        return;
    }

    // Split the time across conquests: overflow time continues against the next city,
    // using that city's traits (so large offline steps match small online ones).
    let remaining = dt;
    while (target && remaining > 0) {
        const needed = target.defense.minus(run.frontier.siege);
        const timeToTake = needed.div(power).toNumber();
        if (timeToTake > remaining) {
            run.frontier.siege = run.frontier.siege.plus(power.times(remaining));
            return;
        }
        remaining -= Math.max(0, timeToTake);
        conquer(state, target);
        run.frontier.siege = ZERO;
        target = cityAt(state, run.frontier.index, plan);
        if (target) {
            power = siegePower(state, stats, target.traits);
            if (power.lte(0)) {
                return;
            }
        }
    }
}

/**
 * Adds a frontier city to the realm. `surrendered` cities (Renown) don't count
 * toward Fame — otherwise refounding right after Renown would be free Fame.
 */
export function conquer(state: GameState, target: FrontierCity, quiet = false, surrendered = false): void {
    const run = state.run;
    run.cities.push({
        id: run.nextCityId++,
        name: target.name,
        race: target.race,
        pop: target.pop,
        origin: "conquered",
    });
    run.frontier.index = target.index + 1;
    if (!surrendered) {
        run.conqueredPop += target.pop;
        grantHeroXp(state, XP_PER_CONQUEST);
    }
    const isNewRace = target.race !== run.startingRace && !run.racesConquered.includes(target.race);
    if (isNewRace) {
        run.racesConquered.push(target.race);
    }
    if (run.frontier.index > state.prestige.bestFrontier) {
        state.prestige.bestFrontier = run.frontier.index;
    }
    if (!surrendered && target.index + 1 === wallIndex(currentPlan(state))) {
        const best = state.records.fastestToWall;
        if (best === null || run.time < best) state.records.fastestToWall = run.time;
    }
    if (target.fortressOf) {
        defeatWizard(state, target.fortressOf);
    }
    bump(state);
    if (quiet && !isNewRace) {
        return;
    }
    log(
        state,
        "conquest",
        `Conquered ${target.name} (${RACES[target.race].adjective}${target.isRegionCapital ? " region capital" : ""}).` +
            (isNewRace ? ` ${RACES[target.race].plural} join your realm!` : ""),
    );
}

function defeatWizard(state: GameState, wizard: string): void {
    const a = state.ascension;
    const first = !a.wizardsDefeated.includes(wizard);
    if (first) a.wizardsDefeated.push(wizard);
    if (!a.wizardsDefeatedThisAscension.includes(wizard)) a.wizardsDefeatedThisAscension.push(wizard);
    const realms = RIVAL_WIZARD_DEFS[wizard]?.realms ?? [];
    const learned = realms.filter((r) => !state.prestige.realmsSeen.includes(r));
    state.prestige.realmsSeen.push(...learned);
    log(
        state,
        "prestige",
        `${wizard} is banished from Arcanus!` +
            (learned.length > 0 ? ` Their libraries teach you ${learned.join(" and ")} magic.` : ""),
    );
}
