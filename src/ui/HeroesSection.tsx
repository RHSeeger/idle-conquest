import { HEROES, HERO_RANKS, HERO_XP, heroLevel, MAX_HEROES } from "../content/heroes";
import { heroesKeptOnAscend, insightUpgradeLevel } from "../engine/ascension";
import { canHire, dismissHero, Hero, heroList, hireCost, hireHero, isTavernOpen, tavernOffers } from "../engine/heroes";
import { heroesKeptOnRefound, refoundHeroKeeper } from "../engine/prestige";
import { GameState } from "../engine/state";
import { Price, ProgressBar } from "./components";
import { askConfirm } from "./Confirm";
import { game } from "./game";

/** One reset's effect on the current heroes, e.g. "Hall of Heroes keeps your 2 most experienced heroes when you Refound: …" */
function carrySentence(state: GameState, event: string, upgrade: string, where: string, slots: number, kept: Hero[]): string {
    const heroes = state.run.heroes;
    const left = heroes.filter((h) => !kept.includes(h));
    if (slots === 0) {
        return `When you ${event}, your heroes stay behind (${where} keeps one more hero per level).`;
    }
    if (left.length === 0) {
        return `${upgrade} (keeps ${slots} of ${MAX_HEROES}): when you ${event}, ${heroes.length === 1 ? "your hero follows" : `all ${heroes.length} of your heroes follow`} you.`;
    }
    return (
        `${upgrade} keeps your ${slots === 1 ? "most experienced hero" : `${slots} most experienced heroes`} when you ${event}: ` +
        `${heroList(kept)} would follow you; ${heroList(left)} would stay behind.`
    );
}

export function heroRefoundText(state: GameState): string {
    const keeper = refoundHeroKeeper(state);
    return carrySentence(state, "Refound", keeper.name, "Fame → Legacy → Hall of Heroes",
        keeper.slots, heroesKeptOnRefound(state));
}

export function heroAscendText(state: GameState): string {
    return carrySentence(state, "Ascend", "Eternal Companions", "Insight → Eternal Companions",
        insightUpgradeLevel(state, "eternalCompanions"), heroesKeptOnAscend(state));
}

/** What happens to the current heroes on Refound and, once you have Ascended, on Ascension */
export function heroCarryText(state: GameState): string {
    if (state.ascension.ascensions === 0) {
        return heroRefoundText(state);
    }
    // Eternal Companions keeping heroes through Refounds too: one sentence covers both resets
    if (refoundHeroKeeper(state).name === "Eternal Companions") {
        return carrySentence(state, "Refound or Ascend", "Eternal Companions", "Insight → Eternal Companions",
            insightUpgradeLevel(state, "eternalCompanions"), heroesKeptOnAscend(state));
    }
    return `${heroRefoundText(state)} ${heroAscendText(state)}`;
}

export function HeroesSection() {
    const state = game();
    if (!isTavernOpen(state) && state.run.heroes.length === 0) {
        return null;
    }
    const cost = hireCost(state);
    const full = state.run.heroes.length >= MAX_HEROES;
    const keptRefound = heroesKeptOnRefound(state);
    const keptAscend = heroesKeptOnAscend(state);
    const refoundKeeper = refoundHeroKeeper(state).name;
    const onDismiss = (h: Hero) => {
        const def = HEROES[h.id];
        askConfirm({
            title: `Dismiss ${def.name} ${def.title}?`,
            danger: true,
            confirm: "Dismiss",
            body: [
                `${HERO_RANKS[heroLevel(h.xp) - 1]}, ${h.xp} xp.`,
                `They leave your service and their experience is lost. Their place, and their place among the heroes ` +
                    `kept when you Refound or Ascend, opens up for another. The hire price doesn't go back down. ` +
                    `They may come to the Adventurers' Guild again, starting over.`,
            ],
            onConfirm: () => dismissHero(state, h.id),
        });
    };
    // R/A badges, coloured by the currency of the upgrade doing the keeping
    const keptBadges = (h: Hero) => (
        <span class="hero-kept">
            {keptRefound.includes(h) && (
                <span
                    class={"kept-badge " + (refoundKeeper === "Hall of Heroes" ? "fame" : "insight")}
                    title={`Follows you when you Refound (${refoundKeeper})`}
                >
                    R
                </span>
            )}
            {keptAscend.includes(h) && (
                <span class="kept-badge insight" title="Follows you when you Ascend (Eternal Companions)">
                    A
                </span>
            )}
        </span>
    );
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
                                <div class="card-title hero-title">
                                    <span>
                                        {def.name} <span class="count">{def.title}</span>
                                    </span>
                                    {keptBadges(h)}
                                </div>
                                <div
                                    class="hero-rank"
                                    title={
                                        next !== undefined
                                            ? `Level ${level} of ${HERO_RANKS.length}. Next: ${HERO_RANKS[level]} at ${next} xp`
                                            : `Level ${level} of ${HERO_RANKS.length}: the highest rank`
                                    }
                                >
                                    {HERO_RANKS[level - 1]}{" "}
                                    <span class="hero-stars">
                                        {"★".repeat(level)}
                                        <span class="hero-stars-empty">{"☆".repeat(HERO_RANKS.length - level)}</span>
                                    </span>
                                </div>
                                <div class="card-text">{def.text(level)}</div>
                                {next !== undefined ? (
                                    <ProgressBar
                                        class="xp"
                                        fraction={(h.xp - prev) / (next - prev)}
                                        label={`${h.xp} / ${next} xp`}
                                    />
                                ) : (
                                    <span class="hint">{h.xp} xp · highest rank</span>
                                )}
                                <div class="hero-dismiss">
                                    <button class="link" title="Send this hero away to make room for another" onClick={() => onDismiss(h)}>
                                        Dismiss
                                    </button>
                                </div>
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
