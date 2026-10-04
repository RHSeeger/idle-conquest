import { RACES } from "../content/races";
import { fmtInt, fmtTime } from "../engine/format";
import { game } from "./game";

export function StatsPanel() {
    const state = game();
    const r = state.records;
    const history = [...r.history].reverse();
    return (
        <div class="panel">
            <section>
                <h2>Records</h2>
                <table class="records">
                    <tbody>
                        <tr>
                            <td>Total time played</td>
                            <td class="num">{fmtTime(state.meta.playtime)}</td>
                        </tr>
                        <tr>
                            <td>Refounds (all time)</td>
                            <td class="num">{fmtInt(r.totalRefounds)}</td>
                        </tr>
                        <tr>
                            <td>Ascensions</td>
                            <td class="num">{fmtInt(state.ascension.ascensions)}</td>
                        </tr>
                        <tr>
                            <td>Best frontier</td>
                            <td class="num">{fmtInt(state.prestige.bestFrontier)}</td>
                        </tr>
                        <tr>
                            <td>Fastest run to the first rival wizard's domain</td>
                            <td class="num">{r.fastestToWall === null ? "—" : fmtTime(r.fastestToWall)}</td>
                        </tr>
                        <tr>
                            <td>Rival wizards banished</td>
                            <td class="num">{state.ascension.wizardsDefeated.length} / 14</td>
                        </tr>
                    </tbody>
                </table>
            </section>
            <section>
                <h2>
                    Recent runs <span class="count">(last {r.history.length})</span>
                </h2>
                {history.length === 0 && <p class="hint">No finished runs yet.</p>}
                {history.length > 0 && (
                    <table>
                        <thead>
                            <tr>
                                <th>Ended</th>
                                <th>Race</th>
                                <th class="num">Length</th>
                                <th class="num">Frontier</th>
                                <th class="num">Gained</th>
                                <th class="num">Asc.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h, i) => (
                                <tr key={i}>
                                    <td>{h.ended === "ascend" ? "Ascended" : "Refounded"}</td>
                                    <td>{RACES[h.race].plural}</td>
                                    <td class="num">{fmtTime(h.length)}</td>
                                    <td class="num">{h.frontier}</td>
                                    <td class={"num " + (h.ended === "ascend" ? "insight" : "fame")}>
                                        +{fmtInt(h.gain)} {h.ended === "ascend" ? "Insight" : "Fame"}
                                    </td>
                                    <td class="num">{h.ascensions}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
