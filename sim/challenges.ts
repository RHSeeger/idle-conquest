/**
 * Challenge simulator: plays the bot to its first Mastery, then plays each
 * Challenge Wizard from that same moment and reports when each milestone of
 * the challenge falls (for tuning the challenges' goals, decision #3).
 *
 *   npx tsx sim/challenges.ts                    every challenge, 2 hours each
 *   npx tsx sim/challenges.ts hours=1 only=Merlin,Raven
 *   npx tsx sim/challenges.ts save=sim-mastery.json   reuse (or write) the post-Mastery save
 *   npx tsx sim/challenges.ts cupgrades=1        with Insight/Essence upgrades on, for comparison
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CHALLENGE_ORDER, CHALLENGE_TUNING } from "../src/content/challenges";
import { heroLevel } from "../src/content/heroes";
import { BOT_TUNING, botAct, botEndRun, botShouldRefound, newTracker } from "../src/dev/bot";
import { fmtTime } from "../src/engine/format";
import { startChallenge } from "../src/engine/mastery";
import { deserialize, serialize } from "../src/engine/save";
import { GameState, newGame, newRun } from "../src/engine/state";
import { tick } from "../src/engine/tick";
import { banishedCount } from "../src/engine/wards";

const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.split("=");
        return [k, v ?? "true"];
    }),
);
const hours = Number(args.hours ?? 2);
const only = args.only ? String(args.only).split(",") : CHALLENGE_ORDER;
if (args.cupgrades) CHALLENGE_TUNING.upgradeLevels = Number(args.cupgrades);
// the bot keeps at it for the whole time given
BOT_TUNING.challengeSeconds = hours * 3600 + 60;

const DT = 1;
const BOT_EVERY = 5;

/** Plays from a new game until the first Mastery is claimed */
function playToMastery(): GameState {
    const state = newGame(0);
    state.run = newRun("highMen");
    let tracker = newTracker();
    for (let t = 0; t < 48 * 3600; t += DT) {
        if (t % BOT_EVERY === 0) {
            botAct(state);
            if (botShouldRefound(state, tracker)) {
                const ended = botEndRun(state);
                tracker = newTracker();
                if (ended === "mastery") {
                    console.log(`First Mastery at ${fmtTime(state.meta.playtime)}`);
                    return state;
                }
                // the bot may start a challenge after a Mastery; not before the first
            }
        }
        tick(state, DT);
    }
    throw new Error("no Mastery in 48h");
}

function postMastery(): string {
    const path = args.save ? String(args.save) : null;
    if (path && existsSync(path)) return readFileSync(path, "utf8");
    const save = serialize(playToMastery());
    if (path) writeFileSync(path, save);
    return save;
}

interface Result {
    wizard: string;
    won: number | null;
    banished: (number | null)[];
    fortresses: (number | null)[];
    frontier: number;
    refounds: number;
    lairs: number;
    heroes: number;
    heroRank: number;
}

function playChallenge(save: string, wizard: string): Result {
    const state = deserialize(save);
    // a save already in a challenge (diagnostics) plays that one
    if (state.mastery.challenge) wizard = state.mastery.challenge;
    else if (!startChallenge(state, wizard)) throw new Error(`can't start ${wizard}`);
    const r: Result = { wizard, won: null, banished: [null, null, null, null], fortresses: [null, null, null, null], frontier: 0, refounds: 0, lairs: 0, heroes: 0, heroRank: 0 };
    let tracker = newTracker();
    let fortresses = 0;
    let lastRunFortresses = 0;
    for (let t = 0; t < hours * 3600; t += DT) {
        if (t % BOT_EVERY === 0) {
            if (state.mastery.challengeDone) {
                r.won = t;
                break;
            }
            botAct(state);
            if (!state.mastery.challenge) break;
            if (botShouldRefound(state, tracker)) {
                r.lairs += state.run.sites.filter((s) => s.cleared).length;
                botEndRun(state);
                if (!state.mastery.challenge) break; // gave up (the bot's own limit)
                r.refounds++;
                lastRunFortresses = 0;
                tracker = newTracker();
            }
        }
        tick(state, DT);
        const b = banishedCount(state);
        for (let i = 0; i < b && i < 4; i++) if (r.banished[i] === null) r.banished[i] = t;
        const f = state.run.fortressesTaken;
        if (f > lastRunFortresses) {
            fortresses += f - lastRunFortresses;
            lastRunFortresses = f;
            for (let i = 0; i < Math.min(fortresses, 4); i++) if (r.fortresses[i] === null) r.fortresses[i] = t;
        }
        r.frontier = Math.max(r.frontier, state.run.frontier.index);
        r.heroes = Math.max(r.heroes, state.run.heroes.length);
        for (const h of state.run.heroes) r.heroRank = Math.max(r.heroRank, heroLevel(h.xp));
    }
    r.lairs += state.run.sites.filter((s) => s.cleared).length;
    // auto-Ascend may complete a won challenge within the tick: its best time is the win
    r.won = state.mastery.challengeBest[wizard] ?? r.won;
    return r;
}

const save = postMastery();
const time = (t: number | null) => (t === null ? "-" : fmtTime(t)).padEnd(8);
console.log(`Each challenge from the first Mastery, ${hours}h at most (upgrade levels in challenges: ${CHALLENGE_TUNING.upgradeLevels})`);
console.log("wizard   | won      | banished 1..4                       | fortresses 1..4                     | frontier | refounds | lairs | heroes (top rank)");
for (const w of only) {
    const r = playChallenge(save, w);
    console.log(
        `${w.padEnd(8)} | ${time(r.won)} | ${r.banished.map(time).join(" ")} | ${r.fortresses.map(time).join(" ")} | ${String(r.frontier).padStart(8)} | ${String(r.refounds).padStart(8)} | ${String(r.lairs).padStart(5)} | ${r.heroes} (${r.heroRank})`,
    );
}
