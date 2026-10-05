import { NODES } from "../content/exploration";
import { REALM_DEFS, REALMS } from "../content/magic";
import { ascensionProgress, ASCENSION_BOOKS, ASCENSION_REALMS } from "../engine/ascension";
import { getStats } from "../engine/collect";
import { exploreSpeed, nextSiteCost } from "../engine/exploration";
import { fmt, fmtTime } from "../engine/format";
import { Lairs } from "./ArmyPanel";
import { ProgressBar } from "./components";
import { game } from "./game";

export function ExplorationPanel() {
    const state = game();
    const stats = getStats(state);
    const run = state.run;
    const speed = exploreSpeed(state, stats);
    const cost = nextSiteCost(state);
    const nodeCounts: Record<string, number> = {};
    for (const s of run.sites) {
        if (s.kind === "node") nodeCounts[s.type] = (nodeCounts[s.type] ?? 0) + 1;
    }
    const asc = ascensionProgress(state);

    return (
        <div class="panel">
            <section>
                <h2>Expeditions</h2>
                <ProgressBar
                    class="explore"
                    fraction={run.exploreProgress / cost}
                    label={`Next discovery: ${fmtTime((cost - run.exploreProgress) / speed)} · speed ×${fmt(speed)} (more cities, more lands to explore)`}
                />
                <p class="hint">{run.sites.length} sites discovered this run.</p>
            </section>

            <Lairs />

            <section>
                <h2>Resource sites</h2>
                {Object.keys(nodeCounts).length === 0 && <p class="hint">None yet.</p>}
                <ul class="built">
                    {Object.entries(nodeCounts).map(([id, n]) => (
                        <li key={id}>
                            <b>
                                {NODES[id].name} ×{n}
                            </b>{" "}
                            <span class="hint">{NODES[id].text} each</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2>Spellbooks</h2>
                <div class="books">
                    {REALMS.map((r) => (
                        <div key={r} class={"book realm-" + r + ((run.spellbooks[r] ?? 0) > 0 ? "" : " none")}>
                            <b>{REALM_DEFS[r].name}</b> ×{run.spellbooks[r] ?? 0}
                            <div class="hint">{REALM_DEFS[r].perBookText}</div>
                        </div>
                    ))}
                </div>
                <p class="hint">
                    You are no wizard, but your scholars puzzle over these books. With a <b>Wizards' Guild</b>{" "}
                    {asc.wizardsGuild ? "✓" : "✗"} and {ASCENSION_BOOKS} books (you have {asc.books}) from {ASCENSION_REALMS}{" "}
                    realms (you have {asc.realms}), you could learn to wield magic yourself.
                </p>
            </section>
        </div>
    );
}
