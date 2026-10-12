/**
 * Quests (DESIGN.md §16): places of power a Wizard sends heroes to, in Layer B
 * (the Ascensions on Arcanus). Each favours one or two heroes' callings; a
 * hero of a favoured calling is faster and brings back more.
 */

export type Calling = "warrior" | "scout" | "sage" | "priest" | "merchant" | "beastmaster";

export const CALLING_NAMES: Record<Calling, string> = {
    warrior: "Warrior",
    scout: "Scout",
    sage: "Sage",
    priest: "Priest",
    merchant: "Merchant",
    beastmaster: "Beastmaster",
};

/** Each hero's callings (content/heroes.ts ids) */
export const HERO_CALLINGS: Record<string, Calling[]> = {
    brax: ["merchant", "warrior"],
    gunther: ["warrior"],
    zaldron: ["sage"],
    valana: ["merchant"],
    serena: ["priest"],
    shuri: ["scout"],
    marcus: ["scout"],
    harold: ["warrior"],
    taki: ["warrior", "priest"],
    warrax: ["warrior"],
    elana: ["priest"],
    greyfairer: ["sage", "beastmaster"],
    malleus: ["sage"],
    rakir: ["beastmaster"],
};

/**
 * What a quest brings back. A favoured hero brings back the bigger amount.
 *  - skill: casting skill, as a share (+15%), for the Ascension
 *  - node: a magic node of that type, already melded, for the Ascension
 *  - book: a spellbook for the Ascension, in whichever of your realms best counters the current rival
 */
export type QuestReward = { kind: "skill" } | { kind: "node"; node: "sorceryNode" | "natureNode" | "chaosNode" } | { kind: "book" };

export interface QuestDef {
    id: string;
    name: string;
    callings: Calling[];
    reward: QuestReward;
    text: string;
}

const list: QuestDef[] = [
    { id: "dragonLair", name: "Dragon's Lair", callings: ["warrior"], reward: { kind: "node", node: "chaosNode" }, text: "A red dragon sleeps on a chaos node." },
    { id: "abandonedFortress", name: "Abandoned Fortress", callings: ["warrior"], reward: { kind: "skill" }, text: "A dead wizard's stronghold, its war-wards still humming." },
    { id: "hiddenGrove", name: "Hidden Grove", callings: ["scout"], reward: { kind: "node", node: "natureNode" }, text: "A nature node no map shows, if you can find the way in." },
    { id: "lostPass", name: "Lost Pass", callings: ["scout"], reward: { kind: "book" }, text: "A mountain road to a hermit's library." },
    { id: "ruinedLibrary", name: "Ruined Library", callings: ["sage"], reward: { kind: "book" }, text: "Half-burned grimoires, guarded by what burned them." },
    { id: "sorcerySpire", name: "Sorcery Spire", callings: ["sage"], reward: { kind: "node", node: "sorceryNode" }, text: "A spire of blue crystal over a sorcery node." },
    { id: "fallenTemple", name: "Fallen Temple", callings: ["priest"], reward: { kind: "book" }, text: "A temple of a forgotten god, its relics still holy." },
    { id: "hauntedBarrow", name: "Haunted Barrow", callings: ["priest"], reward: { kind: "skill" }, text: "The restless dead of an old king, who knew magic." },
    { id: "lostMine", name: "Lost Mine", callings: ["merchant"], reward: { kind: "skill" }, text: "Mithril veins, and the focus crystals miners never sold." },
    { id: "smugglersHold", name: "Smugglers' Hold", callings: ["merchant"], reward: { kind: "book" }, text: "Contraband grimoires, for the right price or the right blade." },
    { id: "beastDen", name: "Beast Den", callings: ["beastmaster"], reward: { kind: "node", node: "natureNode" }, text: "Great beasts gather where a nature node runs wild." },
    { id: "wyvernAerie", name: "Wyvern Aerie", callings: ["beastmaster", "scout"], reward: { kind: "skill" }, text: "Wyverns nest on a peak where the winds carry power." },
];

export const QUESTS: Record<string, QuestDef> = Object.fromEntries(list.map((q) => [q.id, q]));
export const QUEST_ORDER: string[] = list.map((q) => q.id);

export const QUEST_TUNING = {
    /** Quests dealt per Ascension */
    count: 7,
    /** Open when you Ascend; one more opens for each rival banished */
    openAtStart: 3,
    /** The k-th quest's strength: base × growth^k */
    base: 4e4,
    growth: 1.6,
    /** Speed with a hero of a favoured calling */
    matchMult: 2.5,
    /** Speed without a hero, as if a level-1 hero led at this share */
    heroless: 0.2,
    /** Rewards: plain and with a favoured hero */
    skill: [0.15, 0.25],
    nodes: [1, 2],
    books: [1, 2],
    /** Hero experience for a quest: xpBase + xpPerQuest × k */
    xpBase: 15,
    xpPerQuest: 10,
};
