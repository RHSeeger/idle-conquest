/**
 * The shared look (decision #10, TODO #43): a few pieces every tab is built
 * from, so sections, your choices, key numbers and explanations look the same
 * everywhere. Piloted on the Ascension tab; styles under "kit" in styles.css.
 */
import { ComponentChildren } from "preact";
import { Realm, REALM_DEFS, REALMS } from "../content/magic";
import { game } from "./game";

/** A layer's colour, for choice boxes and notices */
export type Tone = "fame" | "insight" | "essence" | "mastery" | "accent";

/**
 * A section's header line: the title, its key number (and a muted note), then
 * the section's switches on the right. The same on every tab.
 */
export function SectionHead(props: { title: ComponentChildren; value?: ComponentChildren; note?: ComponentChildren; children?: ComponentChildren }) {
    return (
        <h2 class="section-head">
            <span class="section-title">{props.title}</span>
            {props.value !== undefined && <span class="section-value">{props.value}</span>}
            {props.note !== undefined && <span class="count">{props.note}</span>}
            {props.children && <span class="section-controls">{props.children}</span>}
        </h2>
    );
}

/** A part of a section, set apart by space and a line above ("This Ascension", "Next Ascension") */
export function Part(props: { title: ComponentChildren; note?: ComponentChildren; children: ComponentChildren }) {
    return (
        <div class="part">
            <h3 class="part-head">
                {props.title}
                {props.note !== undefined && <span class="count"> · {props.note}</span>}
            </h3>
            {props.children}
        </div>
    );
}

/** What you've chosen and what it gives, in one labelled box in the layer's colour */
export function ChoiceBox(props: { label: ComponentChildren; tone: Tone; children: ComponentChildren }) {
    return (
        <div class={"choice-box tone-" + props.tone}>
            <div class="choice-label">{props.label}</div>
            {props.children}
        </div>
    );
}

/** A compact fact: a realm's books ("Life 4"), a retort, a familiar */
export function Chip(props: { realm?: Realm; tone?: Tone; title?: string; children: ComponentChildren }) {
    const cls = props.realm ? "chip realm-" + props.realm : "chip tone-" + (props.tone ?? "accent");
    return (
        <span class={cls} title={props.title}>
            {props.children}
        </span>
    );
}

/** Spellbooks as realm chips */
export function BookChips(props: { books: Partial<Record<Realm, number>> }) {
    const realms = REALMS.filter((r) => (props.books[r] ?? 0) > 0);
    if (realms.length === 0) return <span class="hint">no spellbooks</span>;
    return (
        <>
            {realms.map((r) => (
                <Chip key={r} realm={r}>
                    {REALM_DEFS[r].name} {props.books[r]}
                </Chip>
            ))}
        </>
    );
}

/** A list of requirements with its own heading ("To Ascend") */
export function Checklist(props: { title: ComponentChildren; items: { ok: boolean; text: ComponentChildren }[] }) {
    return (
        <div class="checklist">
            <div class="checklist-title">{props.title}</div>
            <ul class="gate">
                {props.items.map((item, i) => (
                    <li key={i}>
                        <span class={item.ok ? "good" : "bad"}>{item.ok ? "✓" : "✗"}</span> {item.text}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * A section's long explanation, folded behind "How this works". Open until you
 * first close it, then remembered closed (in the save; About → How to play opens them all again).
 */
export function HowItWorks(props: { id: string; children: ComponentChildren }) {
    const state = game();
    const closed = state.meta.helpClosed.includes(props.id);
    const toggle = () => {
        const list = state.meta.helpClosed;
        state.meta.helpClosed = closed ? list.filter((x) => x !== props.id) : [...list, props.id];
    };
    return (
        <div class={"how" + (closed ? "" : " open")}>
            <button class="how-toggle" onClick={toggle} aria-expanded={!closed}>
                ⓘ How this works {closed ? "▸" : "▾"}
            </button>
            {!closed && <div class="how-body">{props.children}</div>}
        </div>
    );
}

/** One style for notices: information, good news, a warning, or something switched off in a challenge */
export function Notice(props: { kind: "info" | "good" | "warn" | "challenge"; children: ComponentChildren }) {
    return <div class={"notice notice-" + props.kind}>{props.children}</div>;
}
