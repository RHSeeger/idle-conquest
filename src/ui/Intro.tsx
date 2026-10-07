/**
 * The new-player introduction (texts in content/intro.ts): a welcome box on a
 * new game, a card the first time each tab is opened, and a How to play
 * section for the About tab.
 */
import { useEffect, useState } from "preact/hooks";
import { GLOSSARY, TAB_INTROS, WELCOME, WELCOME_ID } from "../content/intro";
import { GameState } from "../engine/state";
import { game } from "./game";

export function introSeen(state: GameState, id: string): boolean {
    return state.meta.introsSeen.includes(id);
}

function markSeen(state: GameState, id: string) {
    if (!introSeen(state, id)) state.meta.introsSeen.push(id);
}

/** A tab with an introduction the player hasn't read yet */
export function tabIsNew(state: GameState, tab: string): boolean {
    return !!TAB_INTROS[tab] && !introSeen(state, tab);
}

export function Welcome() {
    const state = game();
    if (introSeen(state, WELCOME_ID)) return null;
    const close = () => markSeen(state, WELCOME_ID);
    return (
        <div class="modal-backdrop" onClick={close}>
            <div class="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Welcome to Idle Conquest</h2>
                {WELCOME.map((p, i) => (
                    <p key={i}>{p}</p>
                ))}
                <p class="hint">You can read this again in the About tab.</p>
                <button onClick={close}>Begin</button>
            </div>
        </div>
    );
}

/**
 * Opening a tab counts as seeing its introduction (so its "new" label goes),
 * but the card stays for that visit, until dismissed or the tab is left.
 */
export function TabIntro(props: { tab: string }) {
    const state = game();
    const welcomed = introSeen(state, WELCOME_ID);
    const [showing, setShowing] = useState<string | null>(null);
    useEffect(() => {
        if (welcomed && TAB_INTROS[props.tab] && !introSeen(state, props.tab)) {
            markSeen(state, props.tab);
            setShowing(props.tab);
        }
    }, [props.tab, welcomed]);
    const intro = TAB_INTROS[props.tab];
    if (!intro || showing !== props.tab) return null;
    return (
        <div class="tab-intro">
            <b>{intro.title}:</b> {intro.text}{" "}
            <button class="toggle" onClick={() => setShowing(null)}>
                Got it
            </button>
        </div>
    );
}

export function HowToPlay() {
    const state = game();
    return (
        <section>
            <h2>How to play</h2>
            {WELCOME.map((p, i) => (
                <p key={i}>{p}</p>
            ))}
            <dl class="glossary">
                {GLOSSARY.map(([term, text]) => (
                    <div key={term}>
                        <dt>{term}</dt>
                        <dd>{text}</dd>
                    </div>
                ))}
            </dl>
            <button class="toggle" onClick={() => (state.meta.introsSeen = [WELCOME_ID])}>
                Show the tab introductions again
            </button>
        </section>
    );
}
