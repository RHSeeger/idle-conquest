import { HEROES, HERO_RANKS, HERO_XP, heroLevel, MAX_HEROES } from "../content/heroes";
import { canHire, hireCost, hireHero, isTavernOpen, tavernOffers } from "../engine/heroes";
import { fameUpgradeLevel, heroesKeptOnRefound, heroList } from "../engine/prestige";
import { GameState } from "../engine/state";
import { Price, ProgressBar } from "./components";
import { game } from "./game";

/** What happens to the current heroes on Refound (Hall of Heroes) and on Ascension */
export function heroCarryText(state: GameState): string {
    const slots = fameUpgradeLevel(state, "hallOfHeroes");
    const heroes = state.run.heroes;
    const kept = heroesKeptOnRefound(state);
    const left = heroes.filter((h) => !kept.includes(h));
    let text: string;
    if (slots === 0) {
        text = "When you Refound, your heroes stay behind (Fame → Legacy → Hall of Heroes keeps one more hero per level).";
    } else if (left.length === 0) {
        text = `Hall of Heroes (keeps ${slots} of ${MAX_HEROES}): when you Refound, ${heroes.length === 1 ? "your hero follows" : `all ${heroes.length} of your heroes follow`} you.`;
    } else {
        text =
            `Hall of Heroes keeps your ${slots === 1 ? "most experienced hero" : `${slots} most experienced heroes`} when you Refound: ` +
            `${heroList(kept)} would follow you; ${heroList(left)} would stay behind.`;
    }
    return text + " Heroes never follow you through an Ascension.";
}

export function HeroesSection() {
    const state = game();
    if (!isTavernOpen(state) && state.run.heroes.length === 0) {
        return null;
    }
    const cost = hireCost(state);
    const full = state.run.heroes.length >= MAX_HEROES;
    const kept = heroesKeptOnRefound(state);
    return (
        <section>
            <h2>
                Heroes{" "}
                <span class="count">
                    {state.run.heroes.length}/{MAX_HEROES}
                </span>
            </h2>
            {state.run.heroes.length > 0 && (
                <div class="cards">
                    {state.run.heroes.map((h) => {
                        const def = HEROES[h.id];
                        const level = heroLevel(h.xp);
                        const next = HERO_XP[level];
                        const prev = HERO_XP[level - 1];
                        return (
                            <div key={h.id} class="card panel-card">
                                <div class="card-title">
                                    {def.name} <span class="count">{def.title}</span>
                                    {kept.includes(h) && (
                                        <span class="tag" title="Hall of Heroes: follows you when you Refound">
                                            kept on Refound
                                        </span>
                                    )}
                                </div>
                                <div class="card-text">
                                    {HERO_RANKS[level - 1]} (level {level}): {def.text(level)}
                                </div>
                                {next !== undefined ? (
                                    <ProgressBar
                                        class="xp"
                                        fraction={(h.xp - prev) / (next - prev)}
                                        label={`${h.xp} / ${next} xp`}
                                    />
                                ) : (
                                    <span class="hint">{h.xp} xp · highest rank</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {state.run.heroes.length > 0 && <p class="hint">{heroCarryText(state)}</p>}
            {isTavernOpen(state) && !full && (
                <>
                    <p class="hint">
                        At the Adventurers' Guild: hire a hero for <Price amount={cost} currency="gold" have={state.run.gold} />.
                        Heroes gain experience from every city you take by force (+1) and every lair you clear (+10).
                    </p>
                    <div class="cards">
                        {tavernOffers(state).map((id) => {
                            const def = HEROES[id];
                            return (
                                <div key={id} class="card panel-card">
                                    <div class="card-title">
                                        {def.name} <span class="count">{def.title}</span>
                                    </div>
                                    <div class="card-text">
                                        {def.text(1)} at first, {def.text(9)} as a Demi-God
                                    </div>
                                    <div class="card-cost">
                                        <button disabled={!canHire(state, id)} onClick={() => hireHero(state, id)}>
                                            Hire
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
