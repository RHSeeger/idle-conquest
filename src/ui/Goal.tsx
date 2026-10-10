/**
 * A one-line "what to do next" hint, for players finding their way through
 * the early game of each layer. Returns the first unmet goal.
 */
import { ascensionProgress, planeshiftProgress } from "../engine/ascension";
import { myrrorShare } from "../engine/army";
import { ARCANUS_WIZARDS } from "../content/frontier";
import { MYRROR_WIZARDS } from "../content/myrror";
import { isWizard, knowsSpell, masteryGate } from "../engine/magic";
import { SPELL_OF_MASTERY } from "../engine/mastery";
import { canRefound } from "../engine/prestige";
import { GameState } from "../engine/state";
import { game } from "./game";

function nextGoal(state: GameState): string | null {
    const run = state.run;
    const p = state.prestige;
    const has = (b: string) => run.buildings.includes(b);
    const units = Object.values(run.units).reduce((a, b) => a + b, 0);

    const veteran = state.mastery.masteries > 0 || state.planes.planeshifts > 0;
    if (p.refounds === 0 && state.ascension.ascensions === 0 && !veteran) {
        if (!has("barracks")) return "Build a Barracks (Buildings tab) so you can train troops.";
        if (units === 0) return "Train some Spearmen (Army tab). Troops besiege the next city on the frontier.";
        if (run.frontier.index === 0) return "Wait for your army to take its first city. Conquered cities add citizens to your kingdom.";
        if (!has("buildersHall")) return "Keep building: the Builders' Hall makes every other building cheaper.";
        if (!canRefound(state)) return "Push on through the Borderlands: conquer a city of another race to unlock Refound.";
        return "You can Refound (Kingdom tab) whenever conquests slow down. Fame makes every later kingdom faster.";
    }
    if (!has("explorersGuild") && p.refounds <= 2 && state.ascension.ascensions === 0 && !veteran) {
        return "Build an Explorers' Guild: expeditions find resource sites, monster lairs and spellbooks.";
    }
    const mastery = masteryGoal(state);
    if (mastery !== undefined) return mastery;
    if (state.ascension.ascensions === 0) {
        const asc = ascensionProgress(state);
        if (p.realmsSeen.length > 0 && !asc.ready) {
            return "To Ascend you need a Wizards' Guild (needs a city of High Men, High Elves, Nomads or Orcs) and 6 spellbooks from 3 realms in one kingdom.";
        }
        if (asc.ready) return "You can Ascend (Ascension tab) and become a Wizard.";
        return null;
    }
    if (state.planes.myrror) {
        // in a challenge Myrror is paused, not neglected
        if (myrrorShare(state) <= 0 && !state.mastery.challenge) return "Send part of your army to Myrror with the slider in the Planes tab.";
        if (state.planes.myrror.pendingBoons.length > 0 && state.planes.myrror.boons.length === 0) {
            return "A Myrran capital has fallen: choose its boon in the Planes tab, and spend Myrran resources on works there.";
        }
        return null;
    }
    if (isWizard(state) && planeshiftProgress(state).ready) {
        return "The Tower is open: you can Planeshift (Planes tab) and fight on two planes at once.";
    }
    if (isWizard(state)) {
        if (state.ascension.wizardsDefeated.length === 0) {
            if (!knowsSpell(state, "dispelMagic")) {
                return "Your spell power wears down the first rival wizard's wards (Magic tab). Research Dispel Magic to double it.";
            }
            return "Wear down the first rival wizard's wards with spell power (Magic tab): pick books that counter their realms, and keep casting skill free.";
        }
        if (!knowsSpell(state, "magicSpirit")) return "Research Magic Spirit (Magic tab) so captured magic nodes produce mana.";
        const gate = planeshiftProgress(state);
        if (gate.towerUnsealed && !gate.riteKnown) {
            return "A banished wizard's Tower of Wizardry is unsealed: research the Rite of the Tower (Magic tab) to look beyond Arcanus.";
        }
    }
    return null;
}

/** Layer 4 hints; undefined when there's nothing to say (other goals may apply) */
function masteryGoal(state: GameState): string | null | undefined {
    const m = state.mastery;
    // a challenge has its own banner
    if (m.challenge) return null;
    if (m.cast) return m.victorySeen ? "Your Mastery waits to be claimed (Mastery tab), whenever you're ready." : null;
    if (m.channelling) return null;
    if (knowsSpell(state, SPELL_OF_MASTERY) || m.progress.gt(0)) {
        return "Channel the Spell of Mastery (Mastery tab): your mana income flows into it until it's cast.";
    }
    const gate = masteryGate(state);
    if (gate.ready) return "Every rival wizard of both worlds has fallen: research the Spell of Mastery (Mastery tab).";
    if (gate.myrran >= MYRROR_WIZARDS) {
        return `Myrror's wizards are all banished. Banish all four rival wizards of Arcanus in one Ascension (${gate.arcanus} of ${ARCANUS_WIZARDS} in this one; Magic tab) to reach the Spell of Mastery.`;
    }
    if (m.masteries > 0 && m.completed.length === 0) {
        return "The Challenge Wizards await (Mastery tab): one Ascension as a rival wizard, under their rule, for a lasting reward.";
    }
    return undefined;
}

export function GoalBar() {
    const goal = nextGoal(game());
    return goal ? <div class="goal">➜ {goal}</div> : null;
}
