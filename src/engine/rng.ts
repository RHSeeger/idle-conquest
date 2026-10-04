/**
 * Deterministic pseudo-randomness. Progression never depends on luck; these
 * helpers only give stable "random-looking" variety (city names, traits) that
 * is the same every time for the same inputs.
 */

/** Hashes any number of integers/strings into a 32-bit unsigned int */
export function hash(...parts: Array<number | string>): number {
    let h = 2166136261;
    for (const part of parts) {
        const s = String(part);
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h ^= 0x9e3779b9;
        h = Math.imul(h, 16777619);
    }
    // final avalanche
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

/** A stable float in [0, 1) for the given inputs */
export function hashFloat(...parts: Array<number | string>): number {
    return hash(...parts) / 4294967296;
}

/** Picks a stable element of `items` for the given inputs */
export function hashPick<T>(items: readonly T[], ...parts: Array<number | string>): T {
    return items[hash(...parts) % items.length];
}
