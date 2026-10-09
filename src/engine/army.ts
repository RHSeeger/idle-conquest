/**
 * Army power and the conquest frontier.
 *
 * Troops generate siege power every second. Siege progress builds against the
 * current frontier city; when it reaches the city's defense the city falls,
 * its defense is subtracted, and any overflow carries on to the next city.
 * There is no randomness — the same army always takes the same time.
 */
import {
    BASE_RACE_REGIONS,
    FrontierCity,
    frontierCity,
    planRoute,
    regionPlan,
    RegionDef,
    REGION_SIZE,
    wallIndex,
} from "../content/frontier";
import { RaceId, RACES } from "../content/races";
import { Role, ROLES, TraitId, traitRoleMult } from "../content/traits";
import { DRILL_STEP, UNITS, UNIT_ORDER } from "../content/units";
import { MAX_LINKS, SHARE_PER_LINK } from "../content/myrror";
import { XP_PER_CONQUEST } from "../content/heroes";
import { challengeBans } from "../content/challenges";
import { grantHeroXp } from "./heroes";
import { getStats, racesInRealm } from "./collect";
import { D, Decimal, ONE, ZERO } from "./decimal";
import { roleStat, Stats, unitPowerStat } from "./effects";
import { effectiveTraits, isWizard, knowsSpell } from "./magic";
import { activeFameLevel, renownLimit, scoutingInUse } from "./prestige";
import { bump, GameState, log } from "./state";
import { ascensionRivals, isBanished } from "./wards";

export function isUnitAvailable(state: GameState, id: string, races: readonly string[] = racesInRealm(state)): boolean {
    const u = UNITS[id];
    // Challenge Wizards' rules
    if (u.role === "siege" && challengeBans(state, "siege")) return false;
    if (u.spell === undefined && challengeBans(state, "mortalTroops")) return false;
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

/** Units still needed to reach the next drill doubling (1..DRILL_STEP) */
export function toNextDrill(owned: number): number {
    return DRILL_STEP - (owned % DRILL_STEP);
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
    // the share fighting on Myrror (Layer 3) isn't here
    const myrror = myrrorShare(state);
    return myrror > 0 ? total.times(1 - myrror) : total;
}

/**
 * Share of the army fighting on Myrror: what the player asked for, capped by
 * planar links (10% each) plus Planar Anchor. 0 before Myrror opens.
 */
export function maxMyrrorShare(state: GameState): number {
    const m = state.planes.myrror;
    if (!m) return 0;
    const anchor = state.planes.upgrades["planarAnchor"] ?? 0;
    return Math.min(0.9, SHARE_PER_LINK * (planarLinks(state) + anchor));
}

/** Planar links in use: the Towers of Wizardry held this Planeshift plus Planar Gates (Myrran work), at most MAX_LINKS */
export function planarLinks(state: GameState): number {
    const m = state.planes.myrror;
    if (!m) return 0;
    return Math.min(MAX_LINKS, m.links + (m.works.planarGate ?? 0));
}

/** Myrror pauses during a challenge (Layer 4): the whole army fights on Arcanus */
export function myrrorShare(state: GameState): number {
    if (state.mastery.challenge) return 0;
    return Math.min(state.planes.armyShare, maxMyrrorShare(state));
}

export function raceRegions(state: GameState): number {
    return BASE_RACE_REGIONS + Math.floor(scoutingInUse(state));
}

/** Race regions the next realm will have (Far Scouting's chosen levels apply from then) */
export function nextRaceRegions(state: GameState): number {
    return BASE_RACE_REGIONS + Math.floor(Math.min(activeFameLevel(state, "scouting"), state.prestige.scoutingUse));
}

/**
 * Mortals meet one rival wizard (an impassable wall); wizards meet this
 * Ascension's four, and can fight through all of Arcanus once their wards fall.
 */
export function currentPlan(state: GameState): RegionDef[] {
    const rivals = ascensionRivals(state);
    return regionPlan(state.run.startingRace, raceRegions(state), isWizard(state) ? rivals : rivals.slice(0, 1), state.run.route);
}

// --- The route (DESIGN.md §15.4) ---

export interface RouteChoice {
    /** Which race region (0 = the first after the Borderlands) */
    raceRegion: number;
    /** Its index in the plan */
    region: number;
    options: RaceId[];
    chosen: RaceId;
}

/** The race regions the army hasn't entered yet, with the two races each could be */
export function upcomingRoute(state: GameState): RouteChoice[] {
    const plan = currentPlan(state);
    const current = Math.floor(state.run.frontier.index / REGION_SIZE);
    const count = plan.filter((r) => r.kind === "race").length;
    const { options } = planRoute(state.run.startingRace, count, state.run.route);
    return plan
        .filter((r) => r.kind === "race" && r.index > current && r.raceRegion !== undefined)
        .map((r) => ({ raceRegion: r.raceRegion!, region: r.index, options: options[r.raceRegion!], chosen: r.race }));
}

/**
 * Chooses the race of a region the army hasn't entered yet. Later choices
 * that no longer fit fall back to the nearer option. Remembered for the next
 * kingdom of the same starting race.
 */
export function chooseRoute(state: GameState, raceRegion: number, race: RaceId): boolean {
    const choice = upcomingRoute(state).find((c) => c.raceRegion === raceRegion);
    if (!choice || !choice.options.includes(race)) return false;
    const route = [...state.run.route];
    while (route.length < raceRegion) route.push(null);
    route[raceRegion] = race;
    state.run.route = route;
    state.prestige.routeMemory[state.run.startingRace] = [...route];
    bump(state);
    return true;
}

/**
 * The frontier city at `index`, or null where the army can't go: past the end,
 * or inside a rival's domain whose wards still stand (break them with spell
 * power, engine/wards.ts).
 */
export function cityAt(state: GameState, index: number, plan = currentPlan(state)): FrontierCity | null {
    let city = frontierCity(state.run.startingRace, plan, index, isWizard(state));
    if (!city) return null;
    if (city.region.kind === "wizard") {
        if (!city.region.wizard || !isBanished(state, city.region.wizard)) return null;
        city = { ...city, traits: city.traits.filter((t) => t !== "wards") };
    }
    // Challenge Wizards' rules and rewards (Ariel, Kali)
    const stats = getStats(state);
    const mult =
        city.region.kind === "wizard" ? stats.get("defense.domain") : city.isRegionCapital ? ONE : stats.get("defense.ordinary");
    return mult.eq(1) ? city : { ...city, defense: city.defense.times(mult) };
}

/** The rival whose wards halt the army right now (null if it isn't waiting at a domain) */
export function blockingRival(state: GameState): string | null {
    const plan = currentPlan(state);
    const index = state.run.frontier.index;
    const region = plan[Math.floor(index / REGION_SIZE)];
    if (!region || region.kind !== "wizard" || !region.wizard) return null;
    return isBanished(state, region.wizard) ? null : region.wizard;
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
 * Adds a frontier city to the realm. `surrendered` cities (Renown) pay Fame
 * only as tribute that builds up over the run (see prestige.ts), otherwise
 * refounding right after Renown would be free Fame.
 */
export function conquer(state: GameState, target: FrontierCity, quiet = false, surrendered = false): void {
    const run = state.run;
    const stats = getStats(state);
    // Oberic's and Rjak's rules change the citizens a city taken by force brings
    const pop = surrendered ? target.pop : target.pop * stats.num("conquest.pop");
    run.cities.push({
        id: run.nextCityId++,
        name: target.name,
        race: target.race,
        pop,
        origin: "conquered",
    });
    run.frontier.index = target.index + 1;
    run.lastConquestAt = run.time;
    if (surrendered) {
        run.surrenderedPop += target.pop;
    } else {
        run.conqueredPop += pop;
        grantHeroXp(state, XP_PER_CONQUEST);
        addFreeTroops(state, stats.num("conquest.troops"));
    }
    const isNewRace = target.race !== run.startingRace && !run.racesConquered.includes(target.race);
    if (isNewRace) {
        run.racesConquered.push(target.race);
    }
    const p = state.prestige;
    p.bestFrontier = Math.max(p.bestFrontier, run.frontier.index);
    p.ascensionBestFrontier = Math.max(p.ascensionBestFrontier, run.frontier.index);
    if (!surrendered && target.index + 1 === wallIndex(currentPlan(state))) {
        const best = state.records.fastestToWall;
        if (best === null || run.time < best) state.records.fastestToWall = run.time;
    }
    // a banished wizard's Fortress (the wizard fell when their wards broke, engine/wards.ts)
    if (target.fortressOf) run.fortressesTaken++;
    bump(state);
    if (quiet && !isNewRace) {
        return;
    }
    log(
        state,
        "conquest",
        `Conquered ${target.name} (${RACES[target.race].adjective}${target.isRegionCapital ? " region capital" : ""}).` +
            (isNewRace ? ` ${RACES[target.race].plural} join your kingdom!` : ""),
    );
}

/** Rjak: the fallen rise as troops of the strongest kind you can field */
function addFreeTroops(state: GameState, n: number): void {
    if (n <= 0) return;
    const best = availableUnits(state).sort((a, b) => UNITS[b].power - UNITS[a].power)[0];
    if (best) state.run.units[best] = (state.run.units[best] ?? 0) + Math.floor(n);
}
