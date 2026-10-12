/**
 * The report on each reset (TODO #29 A1): the stretch that just ended, against
 * the one before it of the same kind. The card itself is ui/ResetReport.tsx.
 *
 * Auto-Refound and auto-Ascend can reset every few minutes late on, so their
 * reports don't pop up by default (Options → Reset reports); one that went
 * much worse than the last gets a Chronicle line instead, so it isn't missed.
 */
import { GameState, log, ResetReport, RunRecord } from "./state";

/** Below this share of the last one's gain per hour, an auto reset is called out in the Chronicle */
export const WORSE_SHARE = 0.5;

const CURRENCY: Record<string, string> = { refound: "Fame", ascend: "Insight", planeshift: "Essence" };

/** What the reset earned per hour of the stretch it ended (null: older record without its length) */
export function gainPerHour(r: RunRecord): number | null {
    const t = r.stretch ?? (r.ended === "refound" ? r.length : undefined);
    if (!t || t <= 0) return null;
    return r.gain.times(3600 / t).toNumber();
}

/** This reset's gain per hour against the last one's (1 = the same; null: nothing to compare) */
export function rateRatio(report: ResetReport): number | null {
    if (!report.previous) return null;
    const now = gainPerHour(report.current);
    const before = gainPerHour(report.previous);
    if (now === null || before === null || before <= 0) return null;
    return now / before;
}

/** Called by auto-Refound and auto-Ascend right after they reset */
export function markAutoReset(state: GameState): void {
    const report = state.records.report;
    if (!report) return;
    report.current.auto = true;
    const ratio = rateRatio(report);
    if (ratio !== null && ratio < WORSE_SHARE) {
        const what = report.current.ended === "refound" ? "Auto-Refound" : "Auto-Ascend";
        const currency = CURRENCY[report.current.ended];
        log(
            state,
            "prestige",
            `${what}: that ${report.current.ended === "refound" ? "kingdom" : "Ascension"} earned ${Math.round(ratio * 100)}% of the last one's ${currency} per hour. Statistics → Last reset has the details.`,
        );
    }
}
