/**
 * The report on the last reset (TODO #29 A1): a card under the tabs after a
 * Refound, Ascension or Planeshift, and the same report on the Statistics tab.
 * By default the card shows only after resets you made yourself: auto ones
 * can come every few minutes late on (Options → Reset reports; engine/report.ts).
 */
import { ComponentChildren } from "preact";
import { ARCANUS_WIZARDS } from "../content/frontier";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import { gainPerHour, rateRatio } from "../engine/report";
import { ReportKind, ResetReport } from "../engine/state";
import { game } from "./game";
import { Chip } from "./kit";

const KIND: Record<ReportKind, { title: string; stretch: string; currency: string; icon: string; cls: string; first: string }> = {
    refound: { title: "Kingdom Refounded", stretch: "kingdom", currency: "Fame", icon: "✦", cls: "fame", first: "The first Refound of this Ascension" },
    ascend: { title: "Ascended", stretch: "Ascension", currency: "Insight", icon: "◈", cls: "insight", first: "The first Ascension of this Planeshift" },
    planeshift: {
        title: "Planeshifted",
        stretch: "Planeshift",
        currency: "Essence",
        icon: "❖",
        cls: "essence",
        first: "The first Planeshift since the start or your last Mastery",
    },
};

/** Ahead of this, a peak before the Refound is worth pointing out */
const PEAK_SLACK = 120;

/** "+18%" in green, "−25%" in red, for a ratio where higher is better */
function Change(props: { ratio: number; higherIsBetter?: boolean }) {
    const pct = Math.round((props.ratio - 1) * 100);
    if (pct === 0) return <span>the same</span>;
    const good = (pct > 0) === (props.higherIsBetter ?? true);
    return <b class={good ? "good" : "bad"}>{(pct > 0 ? "+" : "−") + Math.abs(pct)}%</b>;
}

export function ReportBody(props: { report: ResetReport }) {
    const { current: c, previous: p } = props.report;
    const kind = c.ended as ReportKind;
    const k = KIND[kind];
    const rate = gainPerHour(c);
    const ratio = rateRatio(props.report);
    const stretch = c.stretch ?? c.length;
    const perUnit = kind === "refound" ? "min" : "h";
    const shownRate = rate === null ? null : kind === "refound" ? rate / 60 : rate;

    const facts: ComponentChildren[] =[`${k.stretch} of ${fmtTime(stretch)}`];
    if (kind === "refound") facts.push(`frontier ${c.frontier}`);
    if (kind === "ascend") {
        if (c.kingdoms !== undefined) facts.push(`${c.kingdoms} kingdom${c.kingdoms === 1 ? "" : "s"}`);
        if (c.rivals !== undefined) facts.push(`${c.rivals}/${ARCANUS_WIZARDS} rivals banished`);
    }
    if (kind === "planeshift") facts.push(`${c.ascensions} Ascension${c.ascensions === 1 ? "" : "s"}`);
    facts.push(
        <span class={k.cls}>
            +{fmtInt(c.gain)} {k.icon}
        </span>,
    );
    if (shownRate !== null) facts.push(`${fmt(shownRate)} ${k.currency}/${perUnit}`);

    const vs: ComponentChildren[] = [];
    if (p) {
        if (ratio !== null) {
            vs.push(
                <>
                    {k.currency} per {perUnit === "min" ? "minute" : "hour"} <Change ratio={ratio} />
                </>,
            );
        }
        const pStretch = p.stretch ?? p.length;
        if (pStretch > 0) {
            vs.push(
                <>
                    length <Change ratio={stretch / pStretch} higherIsBetter={false} /> ({fmtTime(pStretch)} before)
                </>,
            );
        }
        if (kind === "refound" && c.frontier !== p.frontier) vs.push(`frontier ${c.frontier > p.frontier ? "+" : "−"}${Math.abs(c.frontier - p.frontier)}`);
        if (kind === "ascend" && c.rivals !== undefined && p.rivals !== undefined && c.rivals !== p.rivals) {
            vs.push(`rivals ${c.rivals > p.rivals ? "+" : "−"}${Math.abs(c.rivals - p.rivals)}`);
        }
    }

    const late = kind === "refound" && c.peakAt !== undefined && c.peakAt > 0 && c.length - c.peakAt >= PEAK_SLACK;
    return (
        <div class="report-body">
            <div class="report-facts">
                {facts.map((f, i) => (
                    <span key={i}>
                        {i > 0 && " · "}
                        {f}
                    </span>
                ))}
            </div>
            <div class="report-vs">
                {p ? (
                    <>
                        Against the last one:{" "}
                        {vs.map((v, i) => (
                            <span key={i}>
                                {i > 0 && " · "}
                                {v}
                            </span>
                        ))}
                    </>
                ) : (
                    <span class="hint">{k.first}: nothing to compare with yet.</span>
                )}
            </div>
            {late && (
                <div class="report-hint hint">
                    Fame per minute peaked at {fmtTime(c.peakAt!)}, {fmtTime(c.length - c.peakAt!)} before this kingdom ended: Refounding nearer the
                    peak earns more Fame per hour (the Fame tab shows the peak as it happens).
                </div>
            )}
        </div>
    );
}

export function ReportTitle(props: { report: ResetReport }) {
    const c = props.report.current;
    return (
        <>
            {KIND[c.ended as ReportKind].title}
            {c.auto && (
                <>
                    {" "}
                    <Chip tone="accent" title="Done by automation">
                        auto
                    </Chip>
                </>
            )}
        </>
    );
}

/** The card under the tabs, until dismissed or replaced by the next reset's */
export function ResetReportCard() {
    const state = game();
    const report = state.records.report;
    const setting = state.settings.resetReports;
    if (!report || report.dismissed || setting === "never" || (setting === "manual" && report.current.auto)) return null;
    return (
        <div class={"reset-report tone-" + KIND[report.current.ended as ReportKind].cls}>
            <div class="report-head">
                <b>
                    <ReportTitle report={report} />
                </b>
                <button class="report-close" aria-label="Dismiss" title="Dismiss (Statistics keeps the last report)" onClick={() => (report.dismissed = true)}>
                    ×
                </button>
            </div>
            <ReportBody report={report} />
        </div>
    );
}
