/**
 * Entry point: load the save, catch up offline time, start the loop, render.
 */
import { render } from "preact";
import "./styles.css";
import { loadFromStorage, saveToStorage } from "./engine/save";
import { newGame } from "./engine/state";
import { simulate, tick } from "./engine/tick";
import { botAct, botEndRun, botShouldRefound, newTracker } from "./dev/bot";
import { App } from "./ui/App";
import { game, setGame } from "./ui/game";
import { OfflineSummary, snapshot, summarize } from "./ui/OfflineReport";

/** Offline time beyond this is ignored for now (banked time may come later) */
const OFFLINE_CAP_SECONDS = 24 * 3600;
/** Gaps shorter than this are simulated silently */
const OFFLINE_REPORT_THRESHOLD = 60;
const TICK_MS = 50;

function catchUp(): OfflineSummary | null {
    const state = game();
    const away = Math.max(0, (Date.now() - state.meta.lastTick) / 1000);
    const counted = Math.min(away, OFFLINE_CAP_SECONDS);
    const before = snapshot(state);
    simulate(state, counted);
    state.meta.lastTick = Date.now();
    return away >= OFFLINE_REPORT_THRESHOLD ? summarize(before, state, away, counted) : null;
}

function loop(): void {
    const state = game();
    const now = Date.now();
    const elapsed = Math.max(0, (now - state.meta.lastTick) / 1000);
    state.meta.lastTick = now;
    const dt = elapsed * state.settings.devSpeed;
    if (dt > 1) {
        // the tab was throttled/suspended or dev speed is high: catch up in steps
        simulate(state, Math.min(dt, OFFLINE_CAP_SECONDS));
    } else {
        tick(state, dt);
    }
}

/**
 * Dev mode: `?devbot=<seconds>` starts a throwaway game (never saved) that the
 * balance bot has already played for that long. Used for screenshots/testing.
 */
const params = new URLSearchParams(location.search);
const devBotSeconds = Number(params.get("devbot") ?? 0);
const devRuns = Number(params.get("devruns") ?? 0);
const devMode = devBotSeconds > 0 || devRuns > 0;

function start(): void {
    let offline: OfflineSummary | null = null;
    if (devMode) {
        const state = newGame();
        // `?devruns=N`: first play N complete runs (Refounding when the bot decides to)
        for (let r = 0; r < devRuns; r++) {
            const tracker = newTracker();
            for (let t = 0; t < 6 * 3600; t += 5) {
                botAct(state);
                if (botShouldRefound(state, tracker)) break;
                simulate(state, 5);
            }
            botEndRun(state);
        }
        for (let t = 0; t < devBotSeconds; t += 5) {
            botAct(state);
            simulate(state, 5);
        }
        state.meta.lastTick = Date.now();
        setGame(state);
    } else {
        setGame(loadFromStorage() ?? newGame());
        offline = catchUp();
    }

    setInterval(loop, TICK_MS);

    if (!devMode) {
        let lastSave = Date.now();
        setInterval(() => {
            if (Date.now() - lastSave >= game().settings.autosaveSeconds * 1000) {
                saveToStorage(game());
                lastSave = Date.now();
            }
        }, 1000);
        window.addEventListener("beforeunload", () => saveToStorage(game()));
    }

    // for debugging from the console
    (window as any).game = game;

    render(<App offline={offline} initialTab={params.get("tab") ?? undefined} />, document.getElementById("app")!);
}

// Show something while offline progress (which can take a second or two) is simulated
render(<div class="loading">Your realm carried on without you… catching up.</div>, document.getElementById("app")!);
setTimeout(start, 30);
