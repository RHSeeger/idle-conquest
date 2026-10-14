/**
 * Tab badges: a "!" on a tab when there's something worth doing there by hand
 * that automation won't do for you. Each check returns the reason (shown as a
 * tooltip) or null.
 */
import { BUILDING_ORDER } from "../content/buildings";
import { SPELLS } from "../content/spells";
import { canBuyBuilding } from "../engine/actions";
import { isAutomationActive } from "../engine/automation";
import { canHire, heroesAllowed, tavernOffers } from "../engine/heroes";
import { heroesOnQuests, openQuests } from "../engine/quests";
import { boundRealms, creaturesOut } from "../engine/wilds";
import { availableSpells, canCastEnchantment, canResearch, isWizard } from "../engine/magic";
import { MYRRAN_WORK_ORDER } from "../content/myrror";
import { canBuyMyrranWork } from "../engine/planes";
import { canChannel, SPELL_OF_MASTERY } from "../engine/mastery";
import { GameState } from "../engine/state";

function armyAttention(state: GameState): string | null {
    return tavernOffers(state).some((id) => canHire(state, id)) ? "You can afford to hire a hero" : null;
}

function buildingsAttention(state: GameState): string | null {
    if (isAutomationActive(state, "buildings")) return null;
    return BUILDING_ORDER.some((id) => canBuyBuilding(state, id)) ? "You can afford a building" : null;
}

function magicAttention(state: GameState): string | null {
    if (!isWizard(state)) return null;
    const reasons: string[] = [];
    if (!isAutomationActive(state, "research") && availableSpells(state).some((s) => canResearch(state, s.id))) {
        reasons.push("You can afford to research a spell");
    }
    if (!isAutomationActive(state, "cast") && state.ascension.spellsKnown.some((id) => SPELLS[id].kind === "enchantment" && canCastEnchantment(state, id))) {
        reasons.push("You can cast an enchantment");
    }
    return reasons.length > 0 ? reasons.join("; ") : null;
}

function planesAttention(state: GameState): string | null {
    const m = state.planes.myrror;
    if (!m) return null;
    const reasons: string[] = [];
    if (m.pendingBoons.length > 0) reasons.push("A Myrran boon is waiting for your choice");
    if (!isAutomationActive(state, "works") && MYRRAN_WORK_ORDER.some((id) => canBuyMyrranWork(state, id))) reasons.push("You can afford a Myrran work");
    return reasons.length > 0 ? reasons.join("; ") : null;
}

function masteryAttention(state: GameState): string | null {
    const m = state.mastery;
    if (m.cast) return "Your Mastery waits to be claimed";
    if (m.challenge && m.challengeDone) return "Your challenge is won: complete it";
    if (!m.channelling && canChannel(state)) return "The Spell of Mastery can be channelled";
    if (!isAutomationActive(state, "research") && canResearch(state, SPELL_OF_MASTERY)) return "You can research the Spell of Mastery";
    return null;
}

function questsAttention(state: GameState): string | null {
    if (!isWizard(state) || isAutomationActive(state, "quests") || !heroesAllowed(state)) return null;
    const away = heroesOnQuests(state);
    const idle = state.run.heroes.some((h) => !away.has(h.id));
    const waiting = state.ascension.quests.some((q, k) => k < openQuests(state) && !q.done && !(q.active && q.hero));
    return idle && waiting ? "A hero is free to go on a quest" : null;
}

function wildsAttention(state: GameState): string | null {
    const m = state.planes.myrror;
    if (!m || state.mastery.challenge || isAutomationActive(state, "wilds")) return null;
    const out = creaturesOut(state);
    const idle = boundRealms(state).some((r) => !out.has(r));
    const waiting = m.sites.some((s) => !s.done && !s.creature);
    return idle && waiting ? "A bound creature is free to take a site" : null;
}

const CHECKS: Partial<Record<string, (state: GameState) => string | null>> = {
    quests: questsAttention,
    wilds: wildsAttention,
    army: armyAttention,
    buildings: buildingsAttention,
    magic: magicAttention,
    planes: planesAttention,
    mastery: masteryAttention,
};

/** Why a tab deserves a look, or null */
export function tabAttention(state: GameState, tab: string): string | null {
    return CHECKS[tab]?.(state) ?? null;
}
