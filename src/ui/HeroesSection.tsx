import { HEROES, HERO_RANKS, HERO_XP, heroLevel, MAX_HEROES } from "../content/heroes";
import { heroesKeptOnAscend } from "../engine/ascension";
import { insightLevel } from "../engine/upgradeLevels";
import { canHire, dismissHero, Hero, heroList, hireCost, hireHero, isTavernOpen, tavernOffers } from "../engine/heroes";
import { heroesKeptOnRefound, refoundHeroKeeper } from "../engine/prestige";
import { GameState } from "../engine/state";
import { Price, ProgressBar } from "./components";
import { askConfirm } from "./Confirm";
import { game } from "./game";
import { Chip, Part, SectionHead } from "./kit";
import { CALLING_NAMES, HERO_CALLINGS, QUESTS } from "../content/quests";
import { isWizard } from "../engine/magic";
import { mightBonus } from "../engine/artifacts";
import { HeroItems } from "./ForgePanel";

/** The quest a hero is away on, by name, or null */
function questOf(state: GameState, heroId: string): string | null {
    const q = state.ascension.quests.find((x) => x.active && !x.done && x.hero === heroId);
    return q ? QUESTS[q.id].name : null;
}

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
        insightLevel(state, "eternalCompanions"), heroesKeptOnAscend(state));
}

/** What happens to the current heroes on Refound and, once you have Ascended, on Ascension */
export function heroCarryText(state: GameState): string {
    if (state.ascension.ascensions === 0) {
        return heroRefoundText(state);
    }
    // Eternal Companions keeping heroes through Refounds too: one sentence covers both resets
    if (refoundHeroKeeper(state).name === "Eternal Companions") {
        return carrySentence(state, "Refound or Ascend", "Eternal Companions", "Insight → Eternal Companions",
            insightLevel(state, "eternalCompanions"), heroesKeptOnAscend(state));
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
                `${HERO_RANKS[heroLevel(h.xp) - 1]}, ${Math.floor(h.xp)} xp.`,
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
            <SectionHead
                title="Heroes"
                value={`${state.run.heroes.length} of ${MAX_HEROES}`}
                note={isTavernOpen(state) && !full ? "a place is free" : undefined}
            />
            {state.run.heroes.length > 0 && (
                <Part title="Your heroes">
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
                                <div class="card-text">
                                    {def.text(level + mightBonus(state, h.id))}
                                    {mightBonus(state, h.id) > 0 && <span class="hint"> (+{mightBonus(state, h.id)} levels from Might)</span>}
                                </div>
                                <HeroItems heroId={h.id} />
                                {isWizard(state) && (
                                    <div class="chips">
                                        {(HERO_CALLINGS[h.id] ?? []).map((c) => (
                                            <Chip key={c} tone="insight" title="Calling: quests that favour it go faster and bring back more">
                                                {CALLING_NAMES[c]}
                                            </Chip>
                                        ))}
                                        {questOf(state, h.id) && <span class="hint">away on a quest: {questOf(state, h.id)} (no aura meanwhile)</span>}
                                    </div>
                                )}
                                <div class="card-foot stack">
                                    {next !== undefined ? (
                                        <ProgressBar
                                            class="xp"
                                            fraction={(h.xp - prev) / (next - prev)}
                                            label={`${Math.floor(h.xp)} / ${next} xp`}
                                        />
                                    ) : (
                                        <span class="hint">{Math.floor(h.xp)} xp · highest rank</span>
                                    )}
                                    <div class="hero-dismiss">
                                        <button class="link" title="Send this hero away to make room for another" onClick={() => onDismiss(h)}>
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p class="hint">{heroCarryText(state)}</p>
                </Part>
            )}
            {isTavernOpen(state) && !full && (
                <Part title="Adventurers' Guild">
                    <p>
                        Hire a hero for <Price amount={cost} currency="gold" have={state.run.gold} />{" "}
                        <span class="hint">
                            Heroes gain experience from every city you take by force (+1) and every lair you clear (+10)
                            {isWizard(state) ? ", and plenty from quests" : ""}.
                        </span>
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
                                    {isWizard(state) && (
                                        <div class="chips">
                                            {(HERO_CALLINGS[id] ?? []).map((c) => (
                                                <Chip key={c} tone="insight" title="Calling: quests that favour it go faster and bring back more">
                                                    {CALLING_NAMES[c]}
                                                </Chip>
                                            ))}
                                        </div>
                                    )}
                                    <div class="card-cost card-foot">
                                        <button disabled={!canHire(state, id)} onClick={() => hireHero(state, id)}>
                                            Hire
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Part>
            )}
        </section>
    );
}
