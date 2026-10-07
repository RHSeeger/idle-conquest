/**
 * Save / load / export.
 *
 * Decimals are encoded as {"$d": "1.23e45"} so they survive JSON. Saves carry a
 * version; `migrate` upgrades older saves step by step. Unknown/missing fields
 * are filled from a fresh game so adding new state never breaks old saves.
 */
import { TAB_INTROS, WELCOME_ID } from "../content/intro";
import { Decimal } from "./decimal";
import { backfillCampaign } from "./planes";
import { GameState, newCampaign, newGame, SAVE_VERSION } from "./state";

const STORAGE_KEY = "idle-conquest-save";

function encode(value: unknown): unknown {
    if (value instanceof Decimal) {
        return { $d: value.toString() };
    }
    if (Array.isArray(value)) {
        return value.map(encode);
    }
    if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = encode(v);
        }
        return out;
    }
    return value;
}

function decode(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(decode);
    }
    if (value !== null && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (typeof obj.$d === "string" && Object.keys(obj).length === 1) {
            return new Decimal(obj.$d);
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = decode(v);
        }
        return out;
    }
    return value;
}

/**
 * Fills any field missing from `loaded` with the value from `defaults`
 * (recursively for plain objects). Records keyed by content id (units, lore,
 * upgrades, ...) are left as loaded.
 */
function fillDefaults(loaded: any, defaults: any): any {
    if (loaded === undefined) {
        return defaults;
    }
    if (
        defaults === null ||
        typeof defaults !== "object" ||
        Array.isArray(defaults) ||
        defaults instanceof Decimal
    ) {
        return loaded;
    }
    const out: any = { ...loaded };
    for (const [k, v] of Object.entries(defaults)) {
        out[k] = fillDefaults(loaded?.[k], v);
    }
    return out;
}

type Migration = (raw: any) => any;

/** migrations[n] upgrades a save from version n to n + 1 */
const migrations: Record<number, Migration> = {
    // v2: Renown counts the best frontier of the current Ascension only. Before
    // the first Ascension that's the same as the best ever; after it, start
    // over (the old rule could strand a fresh wizard deep in the frontier).
    1: (raw) => {
        if (raw.prestige) {
            raw.prestige.ascensionBestFrontier = (raw.ascension?.ascensions ?? 0) === 0 ? (raw.prestige.bestFrontier ?? 0) : 0;
        }
        // the next Ascension's planned profile starts as the current one
        if (raw.ascension) {
            raw.ascension.planBooks = { ...(raw.ascension.books ?? {}) };
            raw.ascension.planRetorts = [...(raw.ascension.retorts ?? [])];
        }
        return raw;
    },
};

function migrate(raw: any): any {
    let version: number = raw.version ?? 0;
    while (version < SAVE_VERSION) {
        const m = migrations[version];
        if (m) {
            raw = m(raw);
        }
        version++;
        raw.version = version;
    }
    return raw;
}

export function serialize(state: GameState): string {
    return JSON.stringify(encode(state));
}

export function deserialize(json: string): GameState {
    const raw = migrate(decode(JSON.parse(json)));
    const state = fillDefaults(raw, newGame()) as GameState;
    // saves from before the introduction already know their way around
    if (!raw.meta?.introsSeen) state.meta.introsSeen = [WELCOME_ID, ...Object.keys(TAB_INTROS)];
    // the Myrror campaign defaults to null, so its own new fields are filled here
    const m = state.planes.myrror;
    if (m) {
        const backfill = !raw.planes.myrror.resources;
        state.planes.myrror = fillDefaults(m, newCampaign(m.beachhead, m.links));
        if (backfill) backfillCampaign(state);
    }
    state.rev++; // force derived data to recompute
    return state;
}

export function exportSave(state: GameState): string {
    return btoa(unescape(encodeURIComponent(serialize(state))));
}

export function importSave(text: string): GameState {
    const trimmed = text.trim();
    const json = trimmed.startsWith("{") ? trimmed : decodeURIComponent(escape(atob(trimmed)));
    return deserialize(json);
}

export function saveToStorage(state: GameState): void {
    localStorage.setItem(STORAGE_KEY, serialize(state));
}

export function loadFromStorage(): GameState | null {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
        return null;
    }
    try {
        return deserialize(json);
    } catch (e) {
        // keep the unreadable save so a new game's autosave doesn't destroy it
        console.error("Failed to load save; kept a backup copy", e);
        localStorage.setItem(`${STORAGE_KEY}-unreadable-${Date.now()}`, json);
        return null;
    }
}

export function clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
}
