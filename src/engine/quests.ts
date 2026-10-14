/**
 * Quests (DESIGN.md §16): Layer B's things to do as a Wizard. Each Ascension
 * deals a set of quests; a few are open at once and one more opens with each
 * rival banished. You send a hero (with an escort) on one: it wears down the
 * quest's strength alongside the frontier, and brings back a reward that lasts
 * the Ascension. Quests wait for you (P8): progress is kept when a hero is
 * recalled or doesn't follow you through a Refound, until the next Ascension.
 *
 * A hero away gives no aura (their max population stays, but cities don't grow
 * into it). A hero of a favoured calling is faster and brings back more.
 * Without a hero, one quest at a time can go on, much more slowly.
 */
import { heroLevel } from "../content/heroes";
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { HERO_CALLINGS, QUESTS, QUEST_ORDER, QUEST_TUNING, QuestDef } from "../content/quests";
import { realmMatchup, RIVAL_WIZARD_DEFS } from "../content/wizards";
import { siegePower } from "./army";
import { hasteMult } from "./artifacts";
import { getStats } from "./collect";
import { D, Decimal } from "./decimal";
import { Stats } from "./effects";
import { heroesAllowed, heroName } from "./heroes";
import { isWizard } from "./magic";
import { hash } from "./rng";
import { bump, GameState, log, QuestState } from "./state";
import { ascensionRivals, banishedCount, currentRival } from "./wards";

const T = QUEST_TUNING;

// --- The Ascension's quests ---

/** Which Ascension the quests belong to: a new one deals new quests */
function questKey(state: GameState): string {
    return [state.planes.planeshifts, state.mastery.masteries, state.ascension.ascensions, state.mastery.challenge ?? ""].join(":");
}

/** Deals this Ascension's quests if they aren't dealt yet (and clears the last Ascension's rewards) */
export function ensureQuests(state: GameState): void {
    if (!isWizard(state)) return;
    const a = state.ascension;
    const key = questKey(state);
    if (a.questKey === key) return;
    a.questKey = key;
    const pool = [...QUEST_ORDER];
    const ids: string[] = [];
    for (let i = 0; i < T.count && pool.length > 0; i++) ids.push(pool.splice(hash("quests", key, i) % pool.length, 1)[0]);
    a.quests = ids.map((id) => ({ id, progress: D(0), active: false, hero: null, done: false, matched: false }));
    a.questSkill = 0;
    a.questNodes = [];
    a.questBooks = {};
    bump(state);
}

/** How many of the quests are open: some at the start, one more for each rival banished */
export function openQuests(state: GameState): number {
    return Math.min(state.ascension.quests.length, T.openAtStart + banishedCount(state));
}

export function questDef(q: QuestState): QuestDef {
    return QUESTS[q.id];
}

/** The k-th quest's strength */
export function questStrength(k: number): Decimal {
    return D(T.base).times(Decimal.pow(T.growth, k));
}

/** Whether the hero is of a calling the quest favours */
export function isFavoured(heroId: string, def: QuestDef): boolean {
    return (HERO_CALLINGS[heroId] ?? []).some((c) => def.callings.includes(c));
}

/** Heroes away on quests (their auras are off) */
export function heroesOnQuests(state: GameState): Set<string> {
    return new Set(state.ascension.quests.filter((q) => q.active && !q.done && q.hero).map((q) => q.hero!));
}

/** The army's share of a quest's speed: grows with the log of its power, so a huge army helps but can't make quests trivial (§15) */
export function escortStrength(state: GameState, stats: Stats): number {
    return 1 + siegePower(state, stats).plus(1).log10();
}

/** Strength worn down per second on quest k with this hero (null: without a hero) */
export function questSpeed(state: GameState, stats: Stats, k: number, heroId: string | null): number {
    const q = state.ascension.quests[k];
    if (!q) return 0;
    let mult = T.heroless;
    if (heroId) {
        const h = state.run.heroes.find((x) => x.id === heroId);
        // Haste artifacts speed the hero up
        mult = (h ? heroLevel(h.xp) : 1) * (isFavoured(heroId, questDef(q)) ? T.matchMult : 1) * hasteMult(state, heroId);
    }
    return escortStrength(state, stats) * mult * stats.num("quest.power");
}

/** Seconds until quest k is done at its current speed (Infinity if it isn't under way) */
export function questSecondsLeft(state: GameState, stats: Stats, k: number): number {
    const q = state.ascension.quests[k];
    if (!q || q.done) return 0;
    if (!q.active) return Infinity;
    const speed = questSpeed(state, stats, k, q.hero);
    return speed > 0 ? questStrength(k).minus(q.progress).max(0).toNumber() / speed : Infinity;
}

// --- Sending heroes ---

/** Sends a hero on quest k (null: without a hero), taking them off any other quest */
export function sendOnQuest(state: GameState, k: number, heroId: string | null): boolean {
    const a = state.ascension;
    const q = a.quests[k];
    if (!q || q.done || k >= openQuests(state)) return false;
    if (heroId !== null && (!heroesAllowed(state) || !state.run.heroes.some((h) => h.id === heroId))) return false;
    for (const other of a.quests) {
        if (other === q || !other.active) continue;
        // a hero is on one quest at a time, and only one quest goes on without a hero
        if (other.hero === heroId) {
            other.active = false;
            other.hero = null;
        }
    }
    q.active = true;
    q.hero = heroId;
    bump(state);
    return true;
}

/** Calls quest k off (its progress is kept for the rest of the Ascension) */
export function recallFromQuest(state: GameState, k: number): void {
    const q = state.ascension.quests[k];
    if (!q || !q.active) return;
    q.active = false;
    q.hero = null;
    bump(state);
}

// --- Progress and rewards ---

/** Your realm that best counters the current rival (the last one once all are banished); null without books */
export function bookRealm(state: GameState): Realm | null {
    const books = state.ascension.books;
    const mine = REALMS.filter((r) => (books[r] ?? 0) > 0);
    if (mine.length === 0) return null;
    const rivals = ascensionRivals(state);
    const rival = currentRival(state) ?? rivals[rivals.length - 1];
    const theirs = RIVAL_WIZARD_DEFS[rival]?.realms ?? [];
    return [...mine].sort((x, y) => realmMatchup(y, theirs) - realmMatchup(x, theirs) || (books[y] ?? 0) - (books[x] ?? 0))[0];
}

/** What quest k brings back, plain or with a favoured hero ("+15% casting skill", "2 Chaos Nodes") */
export function rewardText(state: GameState, k: number, matched: boolean): string {
    const q = state.ascension.quests[k];
    const r = questDef(q).reward;
    const i = matched ? 1 : 0;
    switch (r.kind) {
        case "skill":
            return `+${Math.round(T.skill[i] * 100)}% casting skill`;
        case "node": {
            const n = T.nodes[i];
            const name = r.node === "sorceryNode" ? "Sorcery" : r.node === "natureNode" ? "Nature" : "Chaos";
            return `${n} ${name} Node${n === 1 ? "" : "s"}, melded`;
        }
        case "book": {
            const realm = bookRealm(state);
            const n = T.books[i];
            return realm ? `${n} ${REALM_DEFS[realm].name} spellbook${n === 1 ? "" : "s"}` :`+${Math.round(T.skill[i] * 100)}% casting skill (no books to add to)`;
        }
    }
}

function completeQuest(state: GameState, k: number): void {
    const a = state.ascension;
    const q = a.quests[k];
    const def = questDef(q);
    const hero = q.hero ? state.run.heroes.find((h) => h.id === q.hero) : undefined;
    const matched = hero !== undefined && isFavoured(hero.id, def);
    const text = rewardText(state, k, matched);
    const i = matched ? 1 : 0;
    const r = def.reward;
    const realm = r.kind === "book" ? bookRealm(state) : null;
    if (r.kind === "node") {
        for (let n = 0; n < T.nodes[i]; n++) a.questNodes.push(r.node);
    } else if (r.kind === "book" && realm) {
        a.questBooks = { ...a.questBooks, [realm]: (a.questBooks[realm] ?? 0) + T.books[i] };
    } else {
        a.questSkill += T.skill[i];
    }
    if (hero) hero.xp += (T.xpBase + T.xpPerQuest * k) * getStats(state).num("hero.xp");
    q.done = true;
    q.matched = matched;
    q.brought = text;
    q.active = false;
    q.hero = null;
    log(state, "milestone", `Quest done: ${def.name}${hero ? `, led by ${heroName(hero.id)}` : ""}. It brings back ${text}.`);
    bump(state);
}

export function tickQuests(state: GameState, stats: Stats, dt: number): void {
    if (!isWizard(state)) return;
    ensureQuests(state);
    const a = state.ascension;
    const heroes = new Set(heroesAllowed(state) ? state.run.heroes.map((h) => h.id) : []);
    const open = openQuests(state);
    a.quests.forEach((q, k) => {
        if (!q.active || q.done) return;
        // the hero is gone (didn't follow you through a Refound, or dismissed): the quest waits
        if ((q.hero && !heroes.has(q.hero)) || k >= open) {
            q.active = false;
            q.hero = null;
            bump(state);
            return;
        }
        q.progress = q.progress.plus(questSpeed(state, stats, k, q.hero) * dt);
        if (q.progress.gte(questStrength(k))) completeQuest(state, k);
    });
}

// --- Automation ---

/**
 * Auto-quest: sends idle heroes to the open quests that are waiting, in order.
 * Level 1 (an Ascension milestone) sends the first idle hero; level 2 (Questing
 * Lodge, Essence) the best idle hero for each quest. A quest going on without a
 * hero gets one when one is free; with no heroes at all, one quest goes on without.
 */
export function autoQuests(state: GameState, best: boolean): void {
    if (!isWizard(state)) return;
    ensureQuests(state);
    const a = state.ascension;
    const stats = getStats(state);
    const away = heroesOnQuests(state);
    const idle = heroesAllowed(state) ? state.run.heroes.map((h) => h.id).filter((id) => !away.has(id)) : [];
    const open = openQuests(state);
    for (let k = 0; k < open && idle.length > 0; k++) {
        const q = a.quests[k];
        if (q.done || (q.active && q.hero)) continue;
        const pick = best ? [...idle].sort((x, y) => questSpeed(state, stats, k, y) - questSpeed(state, stats, k, x))[0] : idle[0];
        sendOnQuest(state, k, pick);
        idle.splice(idle.indexOf(pick), 1);
    }
    const running = a.quests.some((q) => q.active && !q.done);
    if (!running) {
        const k = a.quests.findIndex((q, i) => i < open && !q.done);
        if (k >= 0) sendOnQuest(state, k, null);
    }
}
