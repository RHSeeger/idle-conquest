import { D, Decimal, DecimalSource } from "./decimal";

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/**
 * Formats a number for display.
 * - below 1,000: up to `places` decimals (trailing zeros trimmed)
 * - up to 1e36: suffix notation (1.23M)
 * - beyond: scientific (1.23e45)
 */
export function fmt(value: DecimalSource, places = 2): string {
    const d = D(value);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent)) {
        return "∞";
    }
    if (d.lt(0)) {
        return "-" + fmt(d.neg(), places);
    }
    if (d.lt(1000)) {
        const n = d.toNumber();
        if (n !== 0 && n < 0.01) {
            return n.toExponential(1);
        }
        return trimZeros(n.toFixed(places));
    }
    const exponent = d.exponent;
    const tier = Math.floor(exponent / 3);
    if (tier < SUFFIXES.length) {
        const scaled = d.div(Decimal.pow(10, tier * 3)).toNumber();
        return trimZeros(scaled.toFixed(2)) + SUFFIXES[tier];
    }
    return d.mantissa.toFixed(2) + "e" + exponent;
}

/** Whole-number formatting (counts, levels) */
export function fmtInt(value: DecimalSource): string {
    const d = D(value);
    if (d.lt(1e6)) {
        return Math.floor(d.toNumber()).toLocaleString("en-US");
    }
    return fmt(d);
}

export function fmtPercent(fraction: number): string {
    return Math.round(fraction * 100) + "%";
}

export function fmtMult(value: DecimalSource): string {
    return "×" + fmt(value);
}

/** Formats a duration in seconds as e.g. "1h 4m", "3m 12s", "45s" */
export function fmtTime(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return "∞";
    }
    seconds = Math.max(0, Math.floor(seconds));
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function trimZeros(s: string): string {
    return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
