import { AutomationKind, isAutomationUnlocked } from "../engine/automation";
import { game } from "./game";

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
