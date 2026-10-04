import { useState } from "preact/hooks";
import { D } from "../engine/decimal";
import { clearStorage, exportSave, importSave, saveToStorage } from "../engine/save";
import { bump, newGame } from "../engine/state";
import { simulate } from "../engine/tick";
import { game, setGame } from "./game";

export function OptionsPanel() {
    const state = game();
    const [exported, setExported] = useState("");
    const [importText, setImportText] = useState("");
    const [message, setMessage] = useState("");

    const doImport = () => {
        try {
            const loaded = importSave(importText);
            loaded.meta.lastTick = Date.now();
            setGame(loaded);
            saveToStorage(loaded);
            setMessage("Save imported.");
            setImportText("");
        } catch (e) {
            setMessage("Could not read that save: " + (e as Error).message);
        }
    };

    const hardReset = () => {
        if (confirm("Erase ALL progress, including prestige? This cannot be undone.")) {
            clearStorage();
            const fresh = newGame();
            setGame(fresh);
            saveToStorage(fresh);
            setMessage("Game reset.");
        }
    };

    return (
        <div class="panel">
            <section>
                <h2>Save</h2>
                <div class="row">
                    <button onClick={() => (saveToStorage(state), setMessage("Saved."))}>Save now</button>
                    <button onClick={() => setExported(exportSave(state))}>Export</button>
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
