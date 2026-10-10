/**
 * Automation ("autobuyers"), unlocked by Refound milestones. This is how the
 * game remembers what the player already solved (DESIGN.md §5).
 *
 * The same functions drive the balance-sim bot (with `force` set, ignoring
 * whether the player has unlocked/enabled them).
 */
import { BUILDING_ORDER } from "../content/buildings";
import { LORE_ORDER } from "../content/lore";
import { Role, ROLES, traitRoleMult } from "../content/traits";
import { UNITS } from "../content/units";
import {
    buyBuilding,
    buyLore,
    buyUnits,
    canBuyBuilding,
    canRushBuilding,
    foundSettlers,
    isBuildingVisible,
    isLoreUnlocked,
    rushBuilding,
    rushPrice,
} from "./actions";
import { availableUnits, currentTarget, powerByRole, siegePower, siegePowerFrom, unitPower } from "./army";
import { setArmyTarget } from "./exploration";
import { getStats } from "./collect";
import { buildingPrice, lorePrice, unitAffordableWith, unitPrice, wallet } from "./costs";
import { Decimal, ZERO } from "./decimal";
import { realmEconomy } from "./economy";
import {
    buyFameUpgrade,
    canBuyFameUpgrade,
    canRefound,
    fameOnRefound,
    fameUpgradeCost,
    fameUpgradeLevel,
    hasMilestone,
    refound,
} from "./prestige";
import {
    ascend,
    ascensionRaceOptions,
    canAscend,
    hasAscensionMilestone,
    insightOnAscend,
    insightUpgradeLevel,
} from "./ascension";
import { FAME_UPGRADE_ORDER, FAME_UPGRADES } from "../content/fame";
import { completeChallenge } from "./mastery";
import { autoWorks, hasPlaneshiftMilestone } from "./planes";
import { RaceId } from "../content/races";
import {
    availableSpells,
    canCastEnchantment,
    canCastInstant,
    castEnchantment,
    castInstant,
    enchantmentCost,
    inLoadout,
    instantCost,
    isWizard,
    knowsSpell,
    manaRate,
    research,
    researchCost,
    validateBooks,
} from "./magic";
import { lairTarget } from "./exploration";
import { SPELLS } from "../content/spells";
import { GameState } from "./state";
import { currentRival, wardSecondsLeft } from "./wards";
import { hireCost, heroesAllowed, isTavernOpen } from "./heroes";
import { MAX_HEROES } from "../content/heroes";

/** How long (seconds of income) automation will save up for the next building */
export const SAVE_FOR_BUILDING_SECONDS = 90;
/** Automation acts at most this often (seconds of game time) */
const AUTOMATION_INTERVAL = 1;

export type AutomationKind =
    | "buildings"
    | "units"
    | "lore"
    | "settlers"
    | "lairs"
    | "research"
    | "cast"
    | "refound"
    | "ascend"
    | "fame"
    | "works";

/** Auto-Refound/Ascend also fire when no Arcanus city has fallen for this long (seconds) */
export const AUTO_PRESTIGE_STALL_SECONDS = 600;
/** ...and never in the first minute of a run */
const AUTO_PRESTIGE_MIN_RUN = 60;

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
        case "refound":
            return hasPlaneshiftMilestone(state, "planewalker");
        case "ascend":
        case "works":
            return hasPlaneshiftMilestone(state, "autoAscend");
        case "fame":
            return insightUpgradeLevel(state, "royalStewards") > 0;
    }
}

// --- Fame upgrades (Royal Stewards) ---

/**
 * The next purchase in the Fame Chronicle (the last Ascension's order) that
 * hasn't been matched yet this Ascension, or null once it's all been bought.
 * An entry is matched once the upgrade's level reaches how often it appears so far.
 */
export function nextFameChronicleStep(state: GameState): string | null {
    const seen: Record<string, number> = {};
    for (const id of state.ascension.fameChronicle) {
        const u = FAME_UPGRADES[id];
        if (!u) continue;
        seen[id] = (seen[id] ?? 0) + 1;
        if (fameUpgradeLevel(state, id) < Math.min(seen[id], u.maxLevel)) return id;
    }
    return null;
}

function cheapestFameUpgrade(state: GameState): string | null {
    const affordable = FAME_UPGRADE_ORDER.filter((id) => canBuyFameUpgrade(state, id));
    affordable.sort((a, b) => fameUpgradeCost(state, a) - fameUpgradeCost(state, b));
    return affordable[0] ?? null;
}

/**
 * Auto-buy Fame upgrades. Chronicle mode replays the last Ascension's order,
 * waiting for each purchase in turn, then buys cheapest-first once it's done.
 */
export function autoFame(state: GameState): void {
    for (let guard = 0; guard < 200; guard++) {
        const step = state.automation.fameMode === "chronicle" ? nextFameChronicleStep(state) : null;
        const id = step ?? cheapestFameUpgrade(state);
        if (id === null || !buyFameUpgrade(state, id)) return;
    }
}

/** The race with the least Mastery among `options` (so automation collects Mastery evenly) */
function leastMastered(state: GameState, options: RaceId[]): RaceId {
    const m = state.prestige.raceMastery;
    return [...options].sort((a, b) => (m[a] ?? 0) - (m[b] ?? 0))[0] ?? state.run.startingRace;
}

function runStalled(state: GameState): boolean {
    return state.run.time - state.run.lastConquestAt > AUTO_PRESTIGE_STALL_SECONDS;
}

/** A stalled kingdom doesn't make auto-Ascend give up on wards that will break within this long */
export const CONTEST_PATIENCE_SECONDS = 3600;

/** Whether the current rival's wards will break soon (auto-Ascend waits for them on a stall) */
export function contestClose(state: GameState): boolean {
    return currentRival(state) !== null && wardSecondsLeft(state, getStats(state)) < CONTEST_PATIENCE_SECONDS;
}

/** Seconds since the last Arcanus city fell (auto-Refound/Ascend's stall clock) */
export function secondsSinceConquest(state: GameState): number {
    return Math.max(0, state.run.time - state.run.lastConquestAt);
}

/** Whether Ascending is possible now with the planned profile (ignoring the Insight threshold) */
function ascendPossible(state: GameState): boolean {
    const a = state.ascension;
    return canAscend(state) && validateBooks(state, a.planBooks, a.planRetorts) === null;
}

/** Whether Refounding is possible now and gives Fame (ignoring the Fame threshold) */
function refoundPossible(state: GameState): boolean {
    return canRefound(state) && fameOnRefound(state).gt(0);
}

/**
 * What a stall would trigger right now, given which automations are on.
 * Auto-Ascend is checked first, so it wins whenever it's possible.
 */
export function stallAction(state: GameState): "ascend" | "refound" | null {
    if (isAutomationActive(state, "ascend") && ascendPossible(state) && !contestClose(state)) return "ascend";
    if (isAutomationActive(state, "refound") && refoundPossible(state)) return "refound";
    return null;
}

/**
 * Auto-Ascend: once the gate is met and Insight on Ascending reaches
 * `ascendAt` × all Insight earned so far (or the run has stalled).
 * Uses the planned wizard profile (Ascension tab).
 */
export function autoAscend(state: GameState): boolean {
    if (!autoPrestigeDue(state, "ascend")) return false;
    const a = state.ascension;
    return ascend(state, a.planBooks, leastMastered(state, ascensionRaceOptions(state)), a.planRetorts);
}

/**
 * Whether auto-Ascend or auto-Refound would act right now if it were on (its
 * threshold is reached or the kingdom has stalled), whether or not it is on
 */
export function autoPrestigeDue(state: GameState, kind: "ascend" | "refound"): boolean {
    if (state.run.time < AUTO_PRESTIGE_MIN_RUN) return false;
    if (kind === "ascend") {
        if (!ascendPossible(state)) return false;
        const target = state.ascension.insightTotal.times(state.automation.ascendAt).max(1);
        return insightOnAscend(state).gte(target) || (runStalled(state) && !contestClose(state));
    }
    if (!refoundPossible(state)) return false;
    const target = state.prestige.fameTotal.times(state.automation.refoundAt).max(1);
    return fameOnRefound(state).gte(target) || runStalled(state);
}

/**
 * Auto-Refound: once Fame on Refound reaches `refoundAt` × all Fame earned so
 * far (or the run has stalled), as the least-mastered race in the Annals.
 */
export function autoRefound(state: GameState): boolean {
    if (!autoPrestigeDue(state, "refound")) return false;
    const options = [...new Set([...state.prestige.annals, ...state.run.racesConquered])];
    return refound(state, leastMastered(state, options));
}

/** Whether an automation is unlocked and switched on */
export function isAutomationActive(state: GameState, kind: AutomationKind): boolean {
    return isAutomationUnlocked(state, kind) && state.automation[kind];
}

/** Seconds of current income until a building can be bought or rushed (0 if it can now) */
function secondsToAffordBuilding(state: GameState, econ: { production: Decimal; gold: Decimal }, id: string): number {
    if (canBuyBuilding(state, id) || canRushBuilding(state, id)) return 0;
    const price = buildingPrice(getStats(state), id);
    const wait = (have: Decimal, need: Decimal | undefined, rate: Decimal) =>
        !need || have.gte(need) ? 0 : need.minus(have).div(rate.max(1e-9)).toNumber();
    return Math.max(
        wait(state.run.production, price.production, econ.production),
        wait(state.run.gold, price.gold, econ.gold),
    );
}

/**
 * Building order for auto-build:
 *  - "chronicle": the last run's build order first, then the rest as "cheapest"
 *    orders them (so with no Chronicle yet, it's the same as "cheapest")
 *  - "cheapest": whatever can be bought (or rushed) now, cheapest first; then
 *    the rest by how soon current income affords them. So it always buys
 *    something when anything is affordable, and otherwise saves for the
 *    building it can get soonest.
 * Only buildings not yet built and visible are listed.
 */
export function buildQueue(state: GameState, mode = state.automation.buildMode): string[] {
    const econ = realmEconomy(state, getStats(state));
    const cheapest = BUILDING_ORDER.filter((id) => !state.run.buildings.includes(id) && isBuildingVisible(state, id))
        .map((id) => ({ id, seconds: secondsToAffordBuilding(state, econ, id), price: rushPrice(state, id) }))
        .sort((a, b) => a.seconds - b.seconds || a.price.cmp(b.price))
        .map((x) => x.id);
    if (mode === "cheapest") return cheapest;
    const chronicle = state.prestige.chronicle.buildOrder.filter((id) => cheapest.includes(id));
    return [...chronicle, ...cheapest.filter((id) => !chronicle.includes(id))];
}

/**
 * Buys affordable buildings in queue order. Returns the next building worth
 * saving for (affordable within SAVE_FOR_BUILDING_SECONDS), if any.
 */
export function autoBuild(state: GameState): string | null {
    const econ = realmEconomy(state, getStats(state));
    // the queue is worked out again after each purchase (the cheapest order depends on what's left)
    for (let guard = 0; guard < BUILDING_ORDER.length; guard++) {
        let bought = false;
        for (const id of buildQueue(state)) {
            if (state.run.buildings.includes(id) || !isBuildingVisible(state, id)) continue;
            // buy normally, or rush with gold when the treasury can cover it all
            if (buyBuilding(state, id) || rushBuilding(state, id)) {
                bought = true;
                break;
            }
            if (secondsToAffordBuilding(state, econ, id) < SAVE_FOR_BUILDING_SECONDS) {
                return id;
            }
        }
        if (!bought) return null;
    }
    return null;
}

/** Whether the wizard has a spell left to research (auto-study then holds back Knowledge) */
export function isSavingForSpell(state: GameState): boolean {
    return isWizard(state) && availableSpells(state).some((s) => !knowsSpell(state, s.id));
}

/**
 * The most auto-study will pay for one study right now: `loreSpendCap` of the
 * Knowledge on hand while a spell is left to research, so most Knowledge piles
 * up for spells while cheap studies still get bought. No limit otherwise.
 */
export function loreSpendLimit(state: GameState): Decimal {
    return isSavingForSpell(state) ? state.run.knowledge.times(state.automation.loreSpendCap) : state.run.knowledge;
}

export function autoLore(state: GameState): void {
    if (!isLoreUnlocked(state)) return;
    for (let guard = 0; guard < 100; guard++) {
        const stats = getStats(state);
        const cheapest = LORE_ORDER.map((id) => ({ id, price: lorePrice(state, stats, id) })).sort((a, b) =>
            a.price.cmp(b.price),
        )[0];
        if (cheapest.price.gt(loreSpendLimit(state)) || !buyLore(state, cheapest.id)) return;
    }
}

export function autoSettle(state: GameState): void {
    for (let guard = 0; guard < 20 && foundSettlers(state, true); guard++) {
        /* keep founding while affordable */
    }
}

/**
 * Auto-recruit's Most efficient mode (best power per cost against the current
 * target) is a later unlock: until then it follows your doctrine (DESIGN.md §15.4)
 */
export function isEfficientRecruitUnlocked(state: GameState): boolean {
    return hasAscensionMilestone(state, "legacyRenown");
}

/** Every role at the same weight: the doctrine before you've set one or fought with an army */
const BALANCED: Record<Role, number> = Object.fromEntries(ROLES.map((r) => [r, 1])) as Record<Role, number>;

/**
 * The doctrine auto-recruit follows: the weights you set, or until then the
 * mix of power by role that your last kingdom's army had (balanced if none).
 */
export function activeDoctrine(state: GameState): Record<Role, number> {
    const set = state.automation.doctrine;
    if (set) return Object.fromEntries(ROLES.map((r) => [r, Math.max(0, set[r] ?? 0)])) as Record<Role, number>;
    const weights = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
    for (const [id, count] of Object.entries(state.prestige.chronicle.unitMix)) {
        const u = UNITS[id];
        if (u && count > 0) weights[u.role] += u.power * count;
    }
    // on the doctrine's 0–10 scale, the strongest role at 10
    const max = Math.max(...ROLES.map((r) => weights[r]));
    if (max <= 0) return BALANCED;
    return Object.fromEntries(ROLES.map((r) => [r, Math.round((10 * weights[r]) / max)])) as Record<Role, number>;
}

/** Shares of army power the doctrine aims for, over the roles you can train troops of now */
export function doctrineShares(state: GameState, units = availableUnits(state)): Record<Role, number> {
    const weights = activeDoctrine(state);
    const trainable = new Set(units.map((id) => UNITS[id].role));
    const total = ROLES.reduce((sum, r) => sum + (trainable.has(r) ? weights[r] : 0), 0);
    return Object.fromEntries(ROLES.map((r) => [r, trainable.has(r) && total > 0 ? weights[r] / total : 0])) as Record<Role, number>;
}

/** Sets one role's weight in the doctrine (starting from the doctrine in force) */
export function setDoctrineWeight(state: GameState, role: Role, weight: number): void {
    state.automation.doctrine = { ...activeDoctrine(state), [role]: Math.max(0, Math.min(10, Math.round(weight))) };
}

/**
 * Spends production/gold on troops, keeping `reserve` of each untouched.
 *  - "doctrine": the role furthest below its share of your doctrine first,
 *    with that role's best power per cost
 *  - "efficient": best siege power per cost against the current target
 */
export function autoRecruit(
    state: GameState,
    mode: "efficient" | "doctrine",
    reserve: { production: Decimal; gold: Decimal; mana: Decimal },
): void {
    const traits = currentTarget(state)?.traits ?? [];
    const units = availableUnits(state);
    const stats = getStats(state);
    const shares = mode === "doctrine" ? doctrineShares(state, units) : null;

    for (let guard = 0; guard < 60; guard++) {
        // the doctrine's deficit per role: target share minus the share of power it has now
        let deficit: Record<Role, number> | null = null;
        let total = ZERO;
        if (shares) {
            const byRole = powerByRole(state, stats);
            total = ROLES.reduce((sum, r) => sum.plus(byRole[r]), ZERO);
            deficit = Object.fromEntries(
                ROLES.map((r) => [r, shares[r] - (total.gt(0) ? byRole[r].div(total).toNumber() : 0)]),
            ) as Record<Role, number>;
        }
        // following a doctrine, only roles below their share are bought: if those cost more than
        // you have now, it saves for them rather than pile more onto roles that are already ahead
        const anyBelow = deficit !== null && ROLES.some((r) => deficit![r] > 1e-9);
        let best: { id: string; deficit: number; score: number; budget: Decimal } | null = null;
        for (const id of units) {
            const u = UNITS[id];
            if (shares && shares[u.role] <= 0) continue;
            if (deficit && anyBelow && deficit[u.role] <= 1e-9) continue;
            const price = unitPrice(state, stats, id, 1);
            const available = wallet(state, u.currency).minus(reserve[u.currency]);
            if (available.lt(price)) continue;
            const owned = state.run.units[id] ?? 0;
            const perCost = unitPower(stats, id, owned + 1).div(price);
            const score = (deficit ? perCost : perCost.times(traitRoleMult(traits, u.role))).toNumber();
            const d = deficit ? deficit[u.role] : 0;
            if (!best || d > best.deficit + 1e-9 || (Math.abs(d - best.deficit) <= 1e-9 && score > best.score)) {
                best = { id, deficit: d, score, budget: available };
            }
        }
        // buy in chunks (an eighth of what the budget allows) so large incomes need few iterations;
        // following the doctrine, no more than closes that role's gap (so one role doesn't overshoot)
        let chunk = best ? Math.max(1, Math.floor(unitAffordableWith(state, stats, best.id, best.budget) / 8)) : 0;
        if (best && deficit && total.gt(0) && best.deficit > 0) {
            const each = unitPower(stats, best.id, state.run.units[best.id] ?? 0);
            const gap = total.times(best.deficit).div(each.max(1e-9)).toNumber();
            chunk = Math.max(1, Math.min(chunk, Math.ceil(gap)));
        }
        if (!best || buyUnits(state, best.id, chunk) === 0) return;
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

/** Casts every affordable enchantment of your loadout that fits your casting skill, then any instant that's ready */
export function autoCast(state: GameState): void {
    const known = state.ascension.spellsKnown.map((id) => SPELLS[id]);
    const enchantments = known
        .filter((s) => s.kind === "enchantment" && inLoadout(state, s.id) && !state.run.enchantments.includes(s.id))
        .sort((a, b) => enchantmentCost(state, a).cmp(enchantmentCost(state, b)));
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

/** Auto-recruit leaves mana for every known instant that costs at most this many seconds of mana income */
export const INSTANT_RESERVE_SECONDS = 120;

/**
 * Mana auto-recruit leaves alone: the cheapest known enchantment not yet cast
 * this run, or the instants within reach (INSTANT_RESERVE_SECONDS of income),
 * whichever is more. Summons would otherwise spend every mana point first.
 */
export function manaReserve(state: GameState): Decimal {
    const known = state.ascension.spellsKnown.map((id) => SPELLS[id]).filter((s) => s);
    const pending = known
        .filter((s) => s.kind === "enchantment" && !state.run.enchantments.includes(s.id))
        .map((s) => enchantmentCost(state, s))
        .sort((a, b) => a.cmp(b))[0];
    const reach = manaRate(state, getStats(state)).times(INSTANT_RESERVE_SECONDS);
    const instants = known
        .filter((s) => s.kind === "instant")
        .map((s) => instantCost(state, s))
        .filter((c) => c.lte(reach))
        .reduce((sum, c) => sum.plus(c), ZERO);
    return (pending ?? ZERO).max(instants).min(state.run.mana);
}

/** Every currency troops can cost (summoned units cost mana) */
const BUDGET_CURRENCIES = ["production", "gold", "mana"] as const;

/** Whether auto-recruit is limited to its army budget (Quartermasters milestone, share below 100%) */
export function isRecruitBudgeted(state: GameState): boolean {
    return hasMilestone(state, "quartermasters") && state.automation.recruitShare < 1;
}

/**
 * Adds `recruitShare` of the production, gold and mana gained since the last pass to
 * the army budget. The budget never exceeds what's on hand.
 */
function accrueRecruitBudget(state: GameState): void {
    const run = state.run;
    for (const c of BUDGET_CURRENCIES) {
        const gained = wallet(state, c).minus(run.recruitSeen[c]);
        if (gained.gt(0)) {
            run.recruitBudget[c] = run.recruitBudget[c].plus(gained.times(state.automation.recruitShare));
        }
        run.recruitBudget[c] = run.recruitBudget[c].min(wallet(state, c));
    }
}

// --- Auto-tax (unlocked with auto-build) ---

/** Floors the player can pick for auto-tax (share of non-farming citizens kept on taxes) */
export const TAX_FLOORS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];

export function isAutoTaxActive(state: GameState): boolean {
    return isAutomationUnlocked(state, "buildings") && state.automation.taxAuto;
}

export interface TaxPlan {
    /** What it's saving for: the next building auto-build wants, and/or the next hero */
    building: string | null;
    hero: boolean;
    /** The tax share it sets */
    share: number;
    /** Seconds until both currencies are there at that share (0 if they already are, Infinity if never) */
    seconds: number;
    /** Whether anything being saved for still needs gold */
    needsGold: boolean;
}

/**
 * The tax share at which production and gold for what you're saving for arrive
 * together, counting what's on hand. While nothing needs gold, the floor.
 * Production is linear in the share (workers), and so is gold (taxpayers), so the
 * balance has a closed form: Pn / (P1 + (P0 − P1)(1 − t)) = Gn / (G1 · t).
 */
export function taxPlan(state: GameState): TaxPlan {
    const run = state.run;
    const stats = getStats(state);
    const floor = Math.max(0, Math.min(1, state.automation.taxFloor));
    const building = buildQueue(state)[0] ?? null;
    const hero = heroesAllowed(state) && isTavernOpen(state) && run.heroes.length < MAX_HEROES;
    const price = building ? buildingPrice(stats, building) : {};
    const prodNeed = (price.production ?? ZERO).minus(run.production).max(0).toNumber();
    const goldNeed = (price.gold ?? ZERO).plus(hero ? hireCost(state) : ZERO).minus(run.gold).max(0).toNumber();

    // income at no tax and at full tax (the economy reads the share from the run)
    const saved = run.taxShare;
    run.taxShare = 0;
    const p0 = realmEconomy(state, stats).production.toNumber();
    run.taxShare = 1;
    const full = realmEconomy(state, stats);
    run.taxShare = saved;
    const p1 = full.production.toNumber();
    const g1 = full.gold.toNumber();
    const prodAt = (t: number) => p1 + (p0 - p1) * (1 - t);
    const wait = (need: number, rate: number) => (need <= 0 ? 0 : rate <= 0 ? Infinity : need / rate);

    let share = floor;
    if (goldNeed > 0 && g1 > 0) {
        const balanced = prodNeed <= 0 ? 1 : (goldNeed * p0) / (prodNeed * g1 + goldNeed * (p0 - p1));
        share = Math.max(floor, Math.min(1, balanced));
    }
    const seconds = Math.max(wait(prodNeed, prodAt(share)), wait(goldNeed, g1 * share));
    return { building, hero, share, seconds, needsGold: goldNeed > 0 };
}

/** Sets the Work/Tax split from taxPlan */
export function autoTax(state: GameState): void {
    state.run.taxShare = taxPlan(state).share;
}

/** Runs every automation the player has unlocked and enabled */
export function runAutomation(state: GameState, force = false): void {
    // prestige automation first (never forced: the bot decides those itself)
    if (!force) {
        // a won challenge ends with its own Ascension, so auto-Ascend completes it
        if (isAutomationActive(state, "ascend") && completeChallenge(state)) return;
        if (isAutomationActive(state,"ascend") && autoAscend(state)) return;
        if (isAutomationActive(state,"refound") && autoRefound(state)) return;
        // Fame upgrades: the bot buys its own
        if (isAutomationActive(state, "fame")) autoFame(state);
        // Myrran works: the bot buys its own
        if (isAutomationActive(state, "works")) autoWorks(state);
    }
    // measure gains before anything spends; remember what's left afterwards
    const budgeted = !force && isAutomationActive(state,"units") && isRecruitBudgeted(state);
    if (budgeted) accrueRecruitBudget(state);
    runAutomationSteps(state, force, budgeted);
    for (const c of BUDGET_CURRENCIES) {
        state.run.recruitSeen[c] = wallet(state, c);
    }
}

function runAutomationSteps(state: GameState, force: boolean, budgeted: boolean): void {
    const on = (kind: AutomationKind) => force || isAutomationActive(state,kind);
    const savingFor = on("buildings") ? autoBuild(state) : null;
    // after auto-build, so the split follows what it's now saving for
    if (force || isAutoTaxActive(state)) autoTax(state);
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
            // (also without auto-cast, so mana is there when you cast by hand)
            mana: isWizard(state) ? manaReserve(state) : ZERO,
        };
        const before = { production: state.run.production, gold: state.run.gold, mana: state.run.mana };
        if (budgeted) {
            // with an army budget, everything beyond the budget is off limits too
            for (const c of BUDGET_CURRENCIES) {
                reserve[c] = reserve[c].max(wallet(state, c).minus(state.run.recruitBudget[c]));
            }
        }
        const mode = force || (state.automation.unitMode === "efficient" && isEfficientRecruitUnlocked(state)) ? "efficient" : "doctrine";
        autoRecruit(state, mode, reserve);
        if (budgeted) {
            for (const c of BUDGET_CURRENCIES) {
                const spent = before[c].minus(wallet(state, c)).max(0);
                state.run.recruitBudget[c] = state.run.recruitBudget[c].minus(spent).max(0);
            }
        }
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
