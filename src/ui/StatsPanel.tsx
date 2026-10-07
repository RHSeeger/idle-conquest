import { RACES } from "../content/races";
import { fmtInt, fmtTime } from "../engine/format";
import { RunRecord } from "../engine/state";
import { game } from "./game";

const ENDED: Record<RunRecord["ended"], { verb: string; currency: string; cls: string }> = {
    refound: { verb: "Refounded", currency: "Fame", cls: "fame" },
    ascend: { verb: "Ascended", currency: "Insight", cls: "insight" },
    planeshift: { verb: "Planeshifted", currency: "Essence", cls: "essence" },
    mastery: { verb: "Claimed a Mastery", currency: "Mastery", cls: "mastery" },
    challenge: { verb: "Left a challenge", currency: "Insight", cls: "insight" },
};

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
                            <td>Ascensions (this Planeshift, all time)</td>
                            <td class="num">
                                {fmtInt(state.ascension.ascensions)}, {fmtInt(r.totalAscensions)}
                            </td>
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
                            <td>Rival wizards banished from Arcanus</td>
                            <td class="num">{state.ascension.wizardsDefeated.length} / 14</td>
                        </tr>
                        {r.totalPlaneshifts > 0 && (
                            <>
                                <tr>
                                    <td>Planeshifts (all time)</td>
                                    <td class="num">{fmtInt(r.totalPlaneshifts)}</td>
                                </tr>
                                <tr>
                                    <td>Best Myrror frontier</td>
                                    <td class="num">{fmtInt(state.planes.bestMyrror)}</td>
                                </tr>
                                <tr>
                                    <td>Rival wizards banished from Myrror</td>
                                    <td class="num">{state.planes.wizardsDefeated.length} / 14</td>
                                </tr>
                            </>
                        )}
                        {state.mastery.masteries > 0 && (
                            <>
                                <tr>
                                    <td>Masteries claimed</td>
                                    <td class="num">{fmtInt(state.mastery.masteries)}</td>
                                </tr>
                                <tr>
                                    <td>Challenge Wizards beaten</td>
                                    <td class="num">{state.mastery.completed.length} / 14</td>
                                </tr>
                            </>
                        )}
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
                                    <td>{ENDED[h.ended].verb}</td>
                                    <td>{RACES[h.race].plural}</td>
                                    <td class="num">{fmtTime(h.length)}</td>
                                    <td class="num">{h.frontier}</td>
                                    <td class={"num " + ENDED[h.ended].cls}>
                                        +{fmtInt(h.gain)} {ENDED[h.ended].currency}
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
