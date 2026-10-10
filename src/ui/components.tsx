/**
 * Small shared UI pieces: tooltips, stat breakdowns, cost labels, progress bars.
 */
import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Currency } from "../content/buildings";
import { Decimal } from "../engine/decimal";
import { Stats } from "../engine/effects";
import { fmt, fmtSigned } from "../engine/format";

/**
 * Whether a collapsible part of the page is open, remembered per browser once the
 * player toggles it (`fallback` until then). A convenience only: blocked storage just forgets.
 */
export function useStoredOpen(key: string, fallback: boolean): [boolean, (open: boolean) => void] {
    const storageKey = "idle-conquest.open." + key;
    const [stored, setStored] = useState<boolean | null>(() => {
        try {
            const v = localStorage.getItem(storageKey);
            return v === null ? null : v === "1";
        } catch {
            return null;
        }
    });
    const open = stored ?? fallback;
    const setOpen = (o: boolean) => {
        if (o === open) return;
        setStored(o);
        try {
            localStorage.setItem(storageKey, o ? "1" : "0");
        } catch {
            // storage blocked: it just forgets
        }
    };
    return [open, setOpen];
}

export function Tip(props: { tip: ComponentChildren; children: ComponentChildren; class?: string }) {
    return (
        <span class={"tip " + (props.class ?? "")}>
            {props.children}
            <span class="tip-body">{props.tip}</span>
        </span>
    );
}

/** Explains how a stat's value was computed */
export function BreakdownView(props: { stats: Stats; stat: string; scope?: string; title?: string }) {
    const b = props.stats.breakdown(props.stat, props.scope);
    return (
        <div class="breakdown">
            {props.title && <div class="breakdown-title">{props.title}</div>}
            <div class="breakdown-row">
                <span>Base</span>
                <span>{fmt(b.base)}</span>
            </div>
            {b.mods.map((m, i) => (
                <div class="breakdown-row" key={i}>
                    <span>{m.source}</span>
                    <span class={m.op}>
                        {m.op === "add" ? fmtSigned(m.value) : "×" + fmt(m.value)}
                    </span>
                </div>
            ))}
            <div class="breakdown-row total">
                <span>Total</span>
                <span>{fmt(b.value)}</span>
            </div>
        </div>
    );
}

export const CURRENCY_ICON: Record<Currency | "food" | "knowledge", string> = {
    production: "⚒",
    gold: "◉",
    food: "❦",
    knowledge: "✎",
    mana: "✧",
};

export function Price(props: { amount: Decimal; currency: keyof typeof CURRENCY_ICON; have: Decimal }) {
    const ok = props.have.gte(props.amount);
    return (
        <span class={"price " + props.currency + (ok ? "" : " short")}>
            {CURRENCY_ICON[props.currency]} {fmt(props.amount)}
        </span>
    );
}

export function ProgressBar(props: { fraction: number; label?: ComponentChildren; class?: string }) {
    const pct = Math.max(0, Math.min(1, props.fraction)) * 100;
    return (
        <div class={"progress " + (props.class ?? "")}>
            <div class="progress-fill" style={{ width: pct + "%" }} />
            {props.label !== undefined && <div class="progress-label">{props.label}</div>}
        </div>
    );
}

/** A campaign's regions in order (Army and Planes tabs); rival wizards' domains stand out */
export function RegionList(props: { plan: { index: number; name: string; kind: string }[]; current: number }) {
    return (
        <div class="regions">
            {props.plan.map((r) => {
                const wizard = r.kind === "wizard";
                const status = r.index < props.current ? " done" : r.index === props.current ? " current" : "";
                return (
                    <span
                        key={r.index}
                        class={"region" + status + (wizard ? " wizard" : "")}
                        title={wizard ? "A rival wizard's domain, ending at their Fortress" : undefined}
                    >
                        {wizard && "♜ "}
                        {r.name}
                    </span>
                );
            })}
        </div>
    );
}
