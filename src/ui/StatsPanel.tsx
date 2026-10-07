import { RACES } from "../content/races";
import { fmtInt, fmtTime } from "../engine/format";
import { LAYER_IDS, LayerId, MAX_LAYER_TIMES, RunRecord } from "../engine/state";
import { game } from "./game";

const ENDED: Record<RunRecord["ended"], { verb: string; currency: string; cls: string }> = {
    refound: { verb: "Refounded", currency: "Fame", cls: "fame" },
    ascend: { verb: "Ascended", currency: "Insight", cls: "insight" },
    planeshift: { verb: "Planeshifted", currency: "Essence", cls: "essence" },
    mastery: { verb: "Claimed a Mastery", currency: "Mastery", cls: "mastery" },
    enterChallenge: { verb: "Began a challenge", currency: "Insight", cls: "insight" },
    challenge: { verb: "Left a challenge", currency: "Insight", cls: "insight" },
};

/** Each column is named for the reset that starts it ("run" is avoided: it means too many things) */
const LAYER_NAMES: Record<LayerId, { name: string; tip: string }> = {
    run: { name: "Refound", tip: "From founding (or Refounding) your realm to the next reset of any kind" },
    ascension: { name: "Ascension", tip: "From an Ascension (or the start) to the next one, or a bigger reset" },
    planeshift: { name: "Planeshift", tip: "From a Planeshift (or the start) to the next one, or a Mastery" },
    mastery: {
        name: "Mastery / challenge",
        tip: "From the start, a Mastery claimed, or a challenge begun or left, to the next of those",
    },
};

/** How long the current Refound, Ascension, Planeshift and Mastery/challenge have lasted, and the last few of each */
function LayerTimesSection() {
    const state = game();
    const r = state.records;
    const shown = LAYER_IDS;
    const rows = 1 + Math.max(...shown.map((id) => r.layers[id].past.length));
    const cell = (id: LayerId, row: number) => {
        const l = r.layers[id];
        if (row === 0) return fmtTime(state.meta.playtime - l.start);
        const t = l.past[l.past.length - row];
        return t === undefined ? "" : fmtTime(t);
    };
    return (
        <section>
            <h2>Time taken</h2>
            <p class="hint">
                How long each lasted: the current one at the top, then the last {MAX_LAYER_TIMES}, newest first. A bigger
                reset also ends the smaller ones (an Ascension starts a new realm too). Beginning or leaving a challenge is
                an Ascension, and starts a new Mastery / challenge stretch.
            </p>
            <table class="layer-times">
                <thead>
                    <tr>
                        <th></th>
                        {shown.map((id) => (
                            <th key={id} class="num" title={LAYER_NAMES[id].tip}>
                                {LAYER_NAMES[id].name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }, (_, row) => (
                        <tr key={row} class={row === 0 ? "current" : ""}>
                            <td>{row === 0 ? "Current" : row === 1 ? "Last" : `${row} ago`}</td>
                            {shown.map((id) => (
                                <td key={id} class="num">
                                    {cell(id, row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

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
            <LayerTimesSection />
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
