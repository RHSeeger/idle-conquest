/**
 * Measures how long offline catch-up takes on a late-game state.
 *   npm run perf
 */
import { botAct, botEndRun, botShouldRefound, newTracker } from "../src/dev/bot";
import { deserialize, serialize } from "../src/engine/save";
import { newGame } from "../src/engine/state";
import { simulate, tick } from "../src/engine/tick";

const state = newGame(0);
const runs = Number(process.argv[2] ?? 10);
for (let r = 0; r < runs; r++) {
    const tracker = newTracker();
    for (let t = 0; t < 6 * 3600; t += 5) {
        botAct(state);
        if (botShouldRefound(state, tracker)) break;
        for (let i = 0; i < 5; i++) tick(state, 1);
    }
    botEndRun(state);
}
for (let t = 0; t < 3600; t += 5) {
    botAct(state);
    for (let i = 0; i < 5; i++) tick(state, 1);
}
console.log(`State: ascensions ${state.ascension.ascensions}, cities ${state.run.cities.length}, frontier ${state.run.frontier.index}`);

// copy via a save round-trip (structuredClone would drop Decimal prototypes)
for (const hours of [1, 8, 24]) {
    const copy = deserialize(serialize(state));
    const start = performance.now();
    simulate(copy, hours * 3600);
    console.log(`${hours}h offline: ${(performance.now() - start).toFixed(0)} ms`);
}
