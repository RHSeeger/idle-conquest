import { HEROES, HERO_RANKS, HERO_XP, heroLevel, MAX_HEROES } from "../content/heroes";
import { canHire, hireCost, hireHero, isTavernOpen, tavernOffers } from "../engine/heroes";
import { Price, ProgressBar } from "./components";
import { game } from "./game";

export function HeroesSection() {
    const state = game();
    if (!isTavernOpen(state) && state.run.heroes.length === 0) {
        return null;
    }
    const cost = hireCost(state);
    const full = state.run.heroes.length >= MAX_HEROES;
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
