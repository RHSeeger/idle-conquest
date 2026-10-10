import {
    AutomationKind,
    AUTO_PRESTIGE_STALL_SECONDS,
    CONTEST_PATIENCE_SECONDS,
    isAutomationUnlocked,
    secondsSinceConquest,
    stallAction,
} from "../engine/automation";
import { fmtTime } from "../engine/format";
import { validateBooks } from "../engine/magic";
import { game } from "./game";

const THRESHOLDS = [0.5, 1, 2, 5, 10];

const STALL_MINUTES = AUTO_PRESTIGE_STALL_SECONDS / 60;

/**
 * Auto-Refound / auto-Ascend: the toggle, "when the gain reaches N× what you've
 * earned so far", the shared stall rule, and what a stall would do right now.
 */
export function AutoPrestige(props: { kind: "refound" | "ascend" }) {
    const state = game();
    if (!isAutomationUnlocked(state, props.kind)) return null;
    const refound = props.kind === "refound";
    const key = refound ? "refoundAt" : "ascendAt";
    const currency = refound ? "Fame" : "Insight";
    const label = refound ? "Auto-Refound" : "Auto-Ascend";
    const bothUnlocked = isAutomationUnlocked(state, "refound") && isAutomationUnlocked(state, "ascend");
    return (
        <div class="auto-prestige">
            <div class="row">
                <AutoToggle kind={props.kind} label={label} />
                <span class="hint">when it gives at least</span>
                <select
                    value={String(state.automation[key])}
                    onChange={(e) => (state.automation[key] = Number((e.target as HTMLSelectElement).value))}
                >
                    {THRESHOLDS.map((t) => (
                        <option key={t} value={String(t)}>
                            {t}×
                        </option>
                    ))}
                </select>
                <span class="hint">
                    the {currency} earned so far.{refound ? " Starts as your least-mastered race." : " Uses your planned profile."}
                </span>
            </div>
            <p class="hint">
                Stalls: if no Arcanus city has fallen for {STALL_MINUTES} minutes, it{" "}
                {refound ? "Refounds" : "Ascends"} whatever the gain
                {refound ? "." : `, unless a rival wizard's wards will break within ${fmtTime(CONTEST_PATIENCE_SECONDS)} (the contest is worth waiting for).`}
                {bothUnlocked &&
                    (refound
                        ? " If auto-Ascend is also on and Ascending is possible, a stall Ascends instead."
                        : " Auto-Ascend is checked first, so a stall Ascends whenever it can, and auto-Refound handles it otherwise.")}
            </p>
            {state.automation[props.kind] && <StallStatus kind={props.kind} />}
            {!refound && state.automation.ascend && <PlanBlocked />}
        </div>
    );
}

/** Auto-Ascend can't use an invalid planned profile: say so loudly */
function PlanBlocked() {
    const a = game().ascension;
    const error = validateBooks(game(), a.planBooks, a.planRetorts);
    return error ? <p class="bad">Auto-Ascend is blocked: {error}. Fix the next profile above.</p> : null;
}

/** "No city has fallen for 3m 12s: a stall in 6m 48s would Ascend" */
function StallStatus(props: { kind: "refound" | "ascend" }) {
    const state = game();
    const since = secondsSinceConquest(state);
    const action = stallAction(state);
    const verb = action === "ascend" ? "Ascend" : "Refound";
    let outcome: string;
    if (action === null) {
        outcome = props.kind === "ascend" ? "Ascending isn't possible yet" : "Refounding isn't possible or gives no Fame yet";
    } else if (since >= AUTO_PRESTIGE_STALL_SECONDS) {
        outcome = `stalled: it will ${verb} now`;
    } else {
        outcome = `a stall in ${fmtTime(AUTO_PRESTIGE_STALL_SECONDS - since)} would ${verb}`;
    }
    if (action !== null && action !== props.kind) outcome += " (auto-Ascend goes first)";
    return (
        <p class="hint">
            No city has fallen for {fmtTime(since)}: {outcome}.
        </p>
    );
}

export interface ModeOption<T extends string> {
    value: T;
    label: string;
    tip: string;
}

/**
 * How one kind of automation decides what to buy, as a small segmented switch
 * sized like AutoToggle. Shown once the automation is unlocked, even while it
 * is off, so the mode can be set before turning it on.
 */
export function AutoMode<T extends string>(props: {
    kind: AutomationKind;
    value: T;
    options: ModeOption<T>[];
    onChange: (value: T) => void;
}) {
    const state = game();
    if (!isAutomationUnlocked(state, props.kind)) {
        return null;
    }
    return (
        <span class="auto-mode">
            {props.options.map((o) => (
                <button
                    key={o.value}
                    class={props.value === o.value ? "on" : ""}
                    title={o.tip}
                    onClick={() => props.onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </span>
    );
}

/** An on/off switch for one kind of automation; hidden until unlocked */
export function AutoToggle(props: { kind: AutomationKind; label: string }) {
    const state = game();
    if (!isAutomationUnlocked(state, props.kind)) {
        return null;
    }
    const on = state.automation[props.kind];
    return (
        <button
            class={"toggle auto" + (on ? " on" : "")}
            title="Automation: click to switch it on or off"
            onClick={() => (state.automation[props.kind] = !on)}
        >
            {props.label}: {on ? "on" : "off"}
        </button>
    );
}
