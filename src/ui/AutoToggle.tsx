import { AutomationKind, AUTO_PRESTIGE_STALL_SECONDS, isAutomationUnlocked } from "../engine/automation";
import { game } from "./game";

const THRESHOLDS = [0.5, 1, 2, 5, 10];

/** Auto-Refound / auto-Ascend: the toggle plus "when the gain reaches N× what you've earned so far" */
export function AutoPrestige(props: { kind: "refound" | "ascend" }) {
    const state = game();
    if (!isAutomationUnlocked(state, props.kind)) return null;
    const key = props.kind === "refound" ? "refoundAt" : "ascendAt";
    const currency = props.kind === "refound" ? "Fame" : "Insight";
    const label = props.kind === "refound" ? "Auto-Refound" : "Auto-Ascend";
    return (
        <div class="row auto-prestige">
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
                the {currency} earned so far, or when no city has fallen for {AUTO_PRESTIGE_STALL_SECONDS / 60} minutes.
                {props.kind === "refound" ? " Starts as your least-mastered race." : " Uses your planned profile."}
            </span>
        </div>
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
            title="Automation unlocked by a Refound milestone"
            onClick={() => (state.automation[props.kind] = !on)}
        >
            {props.label}: {on ? "on" : "off"}
        </button>
    );
}
