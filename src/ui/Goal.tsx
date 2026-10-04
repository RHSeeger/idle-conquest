/**
 * A one-line "what to do next" hint, for players finding their way through
 * the early game of each layer. Returns the first unmet goal.
 */
import { ascensionProgress, planeshiftProgress } from "../engine/ascension";
import { currentTarget } from "../engine/army";
import { isWizard, knowsSpell } from "../engine/magic";
import { canRefound } from "../engine/prestige";
import { GameState } from "../engine/state";
import { game } from "./game";

function nextGoal(state: GameState): string | null {
    const run = state.run;
    const p = state.prestige;
    const has = (b: string) => run.buildings.includes(b);
    const units = Object.values(run.units).reduce((a, b) => a + b, 0);

    if (p.refounds === 0 && state.ascension.ascensions === 0) {
        if (!has("barracks")) return "Build a Barracks (Buildings tab) so you can train troops.";
        if (units === 0) return "Train some Spearmen (Army tab). Troops besiege the next city on the frontier.";
        if (run.frontier.index === 0) return "Wait for your army to take its first city. Conquered cities add citizens to your realm.";
        if (!has("buildersHall")) return "Keep building: the Builders' Hall makes every other building cheaper.";
        if (!canRefound(state)) return "Push on through the Borderlands: conquer a city of another race to unlock Refound.";
        return "You can Refound (Refound tab) whenever conquests slow down. Fame makes every later run faster.";
    }
    if (!has("explorersGuild") && p.refounds <= 2 && state.ascension.ascensions === 0) {
        return "Build an Explorers' Guild: expeditions find resource sites, monster lairs and spellbooks.";
    }
    if (state.ascension.ascensions === 0) {
        const asc = ascensionProgress(state);
        if (p.realmsSeen.length > 0 && !asc.ready) {
            return "To Ascend you need a Wizards' Guild (needs a city of High Men, High Elves, Nomads or Orcs) and 6 spellbooks from 3 realms in one run.";
        }
        if (asc.ready) return "You can Ascend (Ascension tab) and become a Wizard.";
        return null;
    }
    if (isWizard(state)) {
        if (!knowsSpell(state, "magicSpirit")) return "Research Magic Spirit (Magic tab) so captured magic nodes produce mana.";
        const target = currentTarget(state);
        if (target?.traits.includes("wards") && !knowsSpell(state, "dispelMagic")) {
            return "A rival wizard's wards block your army. Research Dispel Magic (Magic tab) to break them.";
        }
        if (state.ascension.wizardsDefeated.length === 0) return "Fight through the rival wizard's domain and take their Fortress.";
        if (!planeshiftProgress(state).ready && p.bestFrontier >= 80) {
            return "Find and clear a Tower of Wizardry, then research the Rite of the Tower to look beyond Arcanus.";
        }
    }
    return null;
}

export function GoalBar() {
    const goal = nextGoal(game());
    return goal ? <div class="goal">➜ {goal}</div> : null;
}
