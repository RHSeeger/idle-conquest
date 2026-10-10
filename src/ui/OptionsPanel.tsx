import { useState } from "preact/hooks";
import { D } from "../engine/decimal";
import { clearStorage, exportSave, importSave, saveToStorage } from "../engine/save";
import { bump, newGame } from "../engine/state";
import { simulate } from "../engine/tick";
import { askConfirm } from "./Confirm";
import { game, setGame } from "./game";

/** e.g. "idle-conquest-2026-10-08-1105.txt" (local time) */
function saveFileName(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `idle-conquest-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.txt`;
}

export function OptionsPanel() {
    const state = game();
    const [exported, setExported] = useState("");
    const [importText, setImportText] = useState("");
    const [message, setMessage] = useState("");

    /** Replaces the current game with a save's text (pasted or from a file), once confirmed; then runs `onLoaded` */
    const loadSave = (text: string, source: string, onLoaded?: () => void): void => {
        let loaded: ReturnType<typeof importSave>;
        try {
            loaded = importSave(text);
        } catch (e) {
            setMessage(`Could not read that save (${source}): ` + (e as Error).message);
            return;
        }
        askConfirm({
            title: "Replace your current game?",
            danger: true,
            confirm: "Load this save",
            body: [`Loading the save (${source}) replaces your current game. Your current progress will be lost unless you've exported it.`],
            onConfirm: () => {
                loaded.meta.lastTick = Date.now();
                setGame(loaded);
                saveToStorage(loaded);
                setMessage(`Save loaded (${source}).`);
                onLoaded?.();
            },
        });
    };

    const doImport = () => loadSave(importText, "pasted text", () => setImportText(""));

    const downloadSave = () => {
        const blob = new Blob([exportSave(state)], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = saveFileName(new Date());
        a.click();
        URL.revokeObjectURL(url);
        setMessage(`Downloaded ${a.download}.`);
    };

    const loadFile = (input: HTMLInputElement) => {
        const file = input.files?.[0];
        input.value = ""; // so choosing the same file again still fires
        if (!file) return;
        file.text().then(
            (text) => loadSave(text, file.name),
            (e: Error) => setMessage(`Could not read ${file.name}: ${e.message}`),
        );
    };

    const hardReset = () => {
        askConfirm({
            title: "Erase all progress?",
            danger: true,
            confirm: "Erase everything",
            body: ["Everything goes, including every prestige layer, Mastery and challenge. This cannot be undone. Export your save first if you might want it back."],
            onConfirm: () => {
                clearStorage();
                const fresh = newGame();
                setGame(fresh);
                saveToStorage(fresh);
                setMessage("Game reset.");
            },
        });
    };

    return (
        <div class="panel">
            <section>
                <h2>Save</h2>
                <div class="row">
                    <button onClick={() => (saveToStorage(state), setMessage("Saved."))}>Save now</button>
                    <button onClick={() => setExported(exportSave(state))}>Export</button>
                    <button onClick={downloadSave}>Download save file</button>
                    <label class="button">
                        Load from file
                        <input type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={(e) => loadFile(e.target as HTMLInputElement)} />
                    </label>
                    <span class="hint">The game autosaves every {state.settings.autosaveSeconds}s.</span>
                </div>
                {exported && (
                    <textarea class="save-text" readOnly value={exported} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
                )}
                <div class="row">
                    <textarea
                        class="save-text"
                        placeholder="Paste an exported save here"
                        value={importText}
                        onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)}
                    />
                </div>
                <div class="row">
                    <button disabled={!importText.trim()} onClick={doImport}>
                        Import
                    </button>
                    <button class="danger" onClick={hardReset}>
                        Hard reset
                    </button>
                </div>
                {message && <p class="hint">{message}</p>}
            </section>

            <section>
                <h2>
                    Developer tools{" "}
                    <button class="toggle" onClick={() => (state.settings.showDevTools = !state.settings.showDevTools)}>
                        {state.settings.showDevTools ? "hide" : "show"}
                    </button>
                </h2>
                {state.settings.showDevTools && (
                    <div>
                        <div class="row">
                            <span class="hint">Speed:</span>
                            {[1, 10, 100].map((s) => (
                                <button
                                    key={s}
                                    class={"toggle" + (state.settings.devSpeed === s ? " on" : "")}
                                    onClick={() => (state.settings.devSpeed = s)}
                                >
                                    ×{s}
                                </button>
                            ))}
                        </div>
                        <div class="row">
                            <span class="hint">Skip ahead:</span>
                            {[60, 600, 3600].map((s) => (
                                <button key={s} onClick={() => simulate(state, s)}>
                                    +{s >= 3600 ? s / 3600 + "h" : s / 60 + "m"}
                                </button>
                            ))}
                        </div>
                        <div class="row">
                            <span class="hint">Grant:</span>
                            <button
                                onClick={() => {
                                    state.run.production = state.run.production.times(10).plus(1000);
                                    state.run.gold = state.run.gold.times(10).plus(1000);
                                    state.run.knowledge = state.run.knowledge.times(10).plus(100);
                                    state.run.food = state.run.food.times(10).plus(100);
                                    bump(state);
                                }}
                            >
                                ×10 resources
                            </button>
                            <button onClick={() => ((state.prestige.fame = state.prestige.fame.plus(D(10))), bump(state))}>
                                +10 Fame
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
