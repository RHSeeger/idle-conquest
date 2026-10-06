/**
 * Tab badges: a "!" on a tab when there's something worth doing there by hand
 * that automation won't do for you. Each check returns the reason (shown as a
 * tooltip) or null.
 */
import { BUILDING_ORDER } from "../content/buildings";
import { SPELLS } from "../content/spells";
import { canBuyBuilding } from "../engine/actions";
import { isAutomationActive } from "../engine/automation";
import { canHire, tavernOffers } from "../engine/heroes";
import { availableSpells, canCastEnchantment, canResearch, isWizard } from "../engine/magic";
import { MYRRAN_WORK_ORDER } from "../content/myrror";
import { canBuyMyrranWork } from "../engine/planes";
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
    if (MYRRAN_WORK_ORDER.some((id) => canBuyMyrranWork(state, id))) reasons.push("You can afford a Myrran work");
    return reasons.length > 0 ? reasons.join("; ") : null;
}

const CHECKS: Partial<Record<string, (state: GameState) => string | null>> = {
    army: armyAttention,
    buildings: buildingsAttention,
    magic: magicAttention,
    planes: planesAttention,
};

/** Why a tab deserves a look, or null */
export function tabAttention(state: GameState, tab: string): string | null {
    return CHECKS[tab]?.(state) ?? null;
}
