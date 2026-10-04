/**
 * Headless balance simulator.
 *
 *   npm run sim                         one run, 4 hours, High Men
 *   npm run sim -- hours=6 race=orc     one run with options
 *   npm run sim -- runs=6               several runs with Refounds in between
 *   npm run sim -- growth=1.7 base=20   override frontier defense tuning
 *   npm run sim -- verbose              also print 15-minute economy snapshots
 *
 * The greedy bot (src/dev/bot.ts) plays; the report shows when each region
 * was reached, and for multi-run mode how fast each successive run goes.
 */
import { FRONTIER_TUNING, REGION_SIZE } from "../src/content/frontier";
import { RACES, RaceId } from "../src/content/races";
import { currentPlan, currentTarget, siegePower } from "../src/engine/army";
import { getStats } from "../src/engine/collect";
import { fmt, fmtTime } from "../src/engine/format";
import { ECONOMY_TUNING, realmEconomy } from "../src/engine/economy";
import { BUILDING_TUNING } from "../src/engine/costs";
import { fameOnRefound } from "../src/engine/prestige";
import { ascensionProgress } from "../src/engine/ascension";

import { spellbookCount, spellbookRealmCount } from "../src/engine/exploration";
import { GameState, newGame, newRun } from "../src/engine/state";
import { tick } from "../src/engine/tick";
import { botAct, botEndRun, botShouldRefound, newTracker } from "../src/dev/bot";
import { insightOnAscend, planeshiftProgress } from "../src/engine/ascension";
import { essenceOnPlaneshift } from "../src/engine/planes";

const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.split("=");
        return [k, v ?? "true"];
    }),
);
const hours = Number(args.hours ?? 4);
const runs = Number(args.runs ?? 1);
const race = (args.race ?? "highMen") as RaceId;
const verbose = args.verbose === "true";
if (args.growth) FRONTIER_TUNING.defenseGrowth = Number(args.growth);
if (args.lgrowth) FRONTIER_TUNING.lateGrowth = Number(args.lgrowth);
if (args.base) FRONTIER_TUNING.defenseBase = Number(args.base);
if (args.popgrowth) ECONOMY_TUNING.growthScale = Number(args.popgrowth);
if (args.bcost) BUILDING_TUNING.costMult = Number(args.bcost);
if (args.bstep) BUILDING_TUNING.stepMult = Number(args.bstep);
if (args.bcap) BUILDING_TUNING.stepCap = Number(args.bcap);
if (args.oindex) FRONTIER_TUNING.openingIndex = Number(args.oindex);
if (args.ogrowth) FRONTIER_TUNING.openingGrowth = Number(args.ogrowth);

const DT = 1;
const BOT_EVERY = 5;
const REPORT_EVERY = 15 * 60;

interface RunReport {
    race: RaceId;
    time: number;
    frontier: number;
    fame: string;
    regionTimes: number[];
    longestGap: number;
    conquests: string[];
    buildings: string[];
    ascensionReady: number | null;
    planeshiftReady: number | null;
    books: string;
    sites: number;
}

function playRun(state: GameState, maxSeconds: number, allowRefound: boolean): RunReport {
    const tracker = newTracker();
    const report: RunReport = {
        race: state.run.startingRace,
        time: 0,
        frontier: 0,
        fame: "0",
        regionTimes: [],
        longestGap: 0,
        conquests: [],
        buildings: [],
        ascensionReady: null,
        planeshiftReady: null,
        books: "",
        sites: 0,
    };
    let lastIndex = state.run.frontier.index;
    let lastConquest = 0;

    for (let t = 0; t < maxSeconds; t += DT) {
        if (t % BOT_EVERY === 0) {
            botAct(state);
            if (allowRefound && botShouldRefound(state, tracker)) break;
        }
        tick(state, DT);

        while (report.buildings.length < state.run.buildings.length) {
            report.buildings.push(`${state.run.buildings[report.buildings.length]}@${short(state.run.time)}`);
        }
        const idx = state.run.frontier.index;
        if (idx !== lastIndex) {
            report.longestGap = Math.max(report.longestGap, state.run.time - lastConquest);
            lastConquest = state.run.time;
            report.conquests.push(`${idx}@${short(state.run.time)}`);
            const regionBefore = Math.floor(lastIndex / REGION_SIZE);
            const regionNow = Math.floor(idx / REGION_SIZE);
            for (let r = regionBefore + 1; r <= regionNow; r++) report.regionTimes[r] = state.run.time;
            lastIndex = idx;
        }
        if (report.ascensionReady === null && ascensionProgress(state).ready) {
            report.ascensionReady = state.run.time;
        }
        if (report.planeshiftReady === null && planeshiftProgress(state).ready) {
            report.planeshiftReady = state.run.time;
        }
        if (verbose && (t + DT) % REPORT_EVERY === 0) snapshot(state);
    }
    report.books = `${spellbookCount(state)}b/${spellbookRealmCount(state)}r`;
    report.sites = state.run.sites.length;
    report.time = state.run.time;
    report.frontier = state.run.frontier.index;
    report.fame = fameOnRefound(state).toString();
    return report;
}

function snapshot(state: GameState) {
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const target = currentTarget(state);
    const power = siegePower(state, stats, target?.traits ?? []);
    console.log(
        `${fmtTime(state.run.time).padStart(8)} | frontier ${String(state.run.frontier.index).padStart(3)} | cities ${String(state.run.cities.length).padStart(3)}` +
            ` | pop ${econ.population.toFixed(1).padStart(6)} | prod/s ${fmt(econ.production).padStart(8)} | gold/s ${fmt(econ.gold).padStart(7)}` +
            ` | know/s ${fmt(econ.knowledge).padStart(6)} | siege/s ${fmt(power).padStart(8)} | target ${target ? fmt(target.defense) : "WALL"}`,
    );
}

/** Parses short() output ("1h6m", "5m9s", "32s") back to seconds */
function parseTime(s: string): number {
    let total = 0;
    for (const [, n, unit] of s.matchAll(/(\d+)([hms])/g)) {
        total += Number(n) * (unit === "h" ? 3600 : unit === "m" ? 60 : 1);
    }
    return total;
}

function short(seconds: number): string {
    return fmtTime(seconds).replace(" ", "");
}

const state = newGame(0);
state.run = newRun(race);

if (runs <= 1) {
    const r = playRun(state, hours * 3600, false);
    const plan = currentPlan(state);
    // pacing summary: how many conquests/buildings by each checkpoint
    const countBy = (items: string[], minutes: number) =>
        items.filter((s) => parseTime(s.split("@")[1]) <= minutes * 60).length;
    console.log(
        "Pacing: " +
            [5, 10, 20, 30, 60, 90, 120]
                .map((m) => `${m}m: ${countBy(r.conquests, m)}c/${countBy(r.buildings, m)}b`)
                .join("  "),
    );
    console.log("Conquests: " + r.conquests.join(" "));
    console.log("\nBuildings: " + r.buildings.join(" "));
    console.log("\nRegion timeline:");
    r.regionTimes.forEach((t, i) => t !== undefined && console.log(`  ${fmtTime(t).padStart(8)}  region ${i}: ${plan[i]?.name}`));
    console.log(`\nLongest gap between conquests: ${fmtTime(r.longestGap)}`);
    console.log(`Frontier ${r.frontier}, Fame if refounded now: ${r.fame}`);
    console.log(`Races conquered: ${state.run.racesConquered.join(", ") || "none"}`);
    console.log(`Sites ${r.sites}, spellbooks ${r.books}, Ascension ready at ${r.ascensionReady === null ? "never" : fmtTime(r.ascensionReady)}`);
} else {
    console.log(
        "run | ps | asc | race        | length   | total    | frontier | fame | reg2     wall(40) | gap      | sites books  | spells | wiz | myrror | asc ready | L3 ready  | ended",
    );
    let totalTime = 0;
    for (let i = 1; i <= runs; i++) {
        const asc = state.ascension.ascensions;
        const ps = state.planes.planeshifts;
        const r = playRun(state, hours * 3600, true);
        totalTime += r.time;
        const myrror = state.planes.myrror ? `${state.planes.myrror.index}/${state.planes.myrror.links}L` : "-";
        const reg2 = r.regionTimes[2] !== undefined ? fmtTime(r.regionTimes[2]) : "-";
        const wall = r.regionTimes[5] !== undefined ? fmtTime(r.regionTimes[5]) : "-";
        const spells = state.ascension.spellsKnown.length;
        const wiz = state.ascension.wizardsDefeatedThisAscension.length;
        const insight = insightOnAscend(state).toString();
        const essence = essenceOnPlaneshift(state).toString();
        const ended = i < runs ? botEndRun(state) : "";
        console.log(
            `${String(i).padStart(3)} | ${String(ps).padStart(2)} | ${String(asc).padStart(3)} | ${RACES[r.race].plural.padEnd(11)} | ${fmtTime(r.time).padEnd(8)} | ${fmtTime(totalTime).padEnd(8)} | ${String(r.frontier).padStart(8)} | ${r.fame.padStart(4)} | ${reg2.padEnd(8)} ${wall.padEnd(8)} | ${fmtTime(r.longestGap).padEnd(8)} | ${String(r.sites).padStart(5)} ${r.books.padEnd(6)} | ${String(spells).padStart(6)} | ${String(wiz).padStart(3)} | ${myrror.padEnd(6)} | ${(r.ascensionReady === null ? "-" : fmtTime(r.ascensionReady)).padEnd(9)} | ${(r.planeshiftReady === null ? "-" : fmtTime(r.planeshiftReady)).padEnd(9)} | ${ended}${ended === "ascend" ? ` (+${insight} Insight)` : ended === "planeshift" ? ` (+${essence} Essence)` : ""}`,
        );
    }
    const p = state.prestige;
    const a = state.ascension;
    console.log(`\nTotal time ${fmtTime(totalTime)}`);
    console.log(`Fame unspent ${p.fame.toString()}, total ${p.fameTotal.toString()}; refounds ${p.refounds}`);
    console.log(`Annals: ${p.annals.join(", ")}; realms seen: ${p.realmsSeen.join(", ")}`);
    console.log(`Fame upgrades: ${JSON.stringify(p.upgrades)}`);
    console.log(`Ascensions ${a.ascensions}, Insight ${a.insight.toString()} (total ${a.insightTotal.toString()}), books ${JSON.stringify(a.books)}`);
    console.log(`Insight upgrades: ${JSON.stringify(a.upgrades)}; wizards defeated: ${a.wizardsDefeated.join(", ") || "none"}`);
    const pl = state.planes;
    console.log(
        `Planeshifts ${pl.planeshifts}, Essence ${pl.essence.toString()} (total ${pl.essenceTotal.toString()}), upgrades ${JSON.stringify(pl.upgrades)}; ` +
            `Myrror ${pl.myrror ? `${pl.myrror.index} (${pl.myrror.links} links, holdings ${JSON.stringify(pl.myrror.holdings)})` : "closed"}`,
    );
}
