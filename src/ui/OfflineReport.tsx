import { Decimal } from "../engine/decimal";
import { fmt, fmtTime } from "../engine/format";
import { GameState } from "../engine/state";

export interface OfflineSummary {
    seconds: number;
    cappedSeconds: number;
    production: Decimal;
    gold: Decimal;
    knowledge: Decimal;
    citiesConquered: number;
    newLog: string[];
}

export function snapshot(state: GameState) {
    return {
        production: state.run.production,
        gold: state.run.gold,
        knowledge: state.run.knowledge,
        frontier: state.run.frontier.index,
        logLength: state.log.length,
        lastLog: state.log[state.log.length - 1],
    };
}

export function summarize(
    before: ReturnType<typeof snapshot>,
    state: GameState,
    seconds: number,
    cappedSeconds: number,
): OfflineSummary {
    const start = before.lastLog ? state.log.indexOf(before.lastLog) + 1 : 0;
    return {
        seconds,
        cappedSeconds,
        production: state.run.production.minus(before.production),
        gold: state.run.gold.minus(before.gold),
        knowledge: state.run.knowledge.minus(before.knowledge),
        citiesConquered: Math.max(0, state.run.frontier.index - before.frontier),
        newLog: state.log.slice(Math.max(0, start)).map((e) => e.text),
    };
}

export function OfflineReport(props: { summary: OfflineSummary; onClose: () => void }) {
    const s = props.summary;
    return (
        <div class="modal-backdrop" onClick={props.onClose}>
            <div class="modal" onClick={(e) => e.stopPropagation()}>
                <h2>While you were away ({fmtTime(s.seconds)})</h2>
                {s.cappedSeconds < s.seconds && (
                    <p class="hint">Only the first {fmtTime(s.cappedSeconds)} of your absence counted.</p>
                )}
                <ul>
                    <li>Net production change: {fmt(s.production)}</li>
                    <li>Net gold change: {fmt(s.gold)}</li>
                    {s.knowledge.gt(0) && <li>Net knowledge change: {fmt(s.knowledge)}</li>}
                    <li>Cities conquered: {s.citiesConquered}</li>
                </ul>
                {s.newLog.length > 0 && (
                    <div class="offline-log">
                        {s.newLog.slice(-12).map((t, i) => (
                            <div key={i}>{t}</div>
                        ))}
                    </div>
                )}
                <button onClick={props.onClose}>Continue</button>
            </div>
        </div>
    );
}
