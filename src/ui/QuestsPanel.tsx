/**
 * The Quests tab (DESIGN.md §16): the Ascension's quests, who's on them, and
 * what they've brought back. In the wizard group with Magic and Ascension.
 */
import { HEROES, HERO_RANKS, heroLevel } from "../content/heroes";
import { CALLING_NAMES, QUEST_TUNING } from "../content/quests";
import { isBestQuestPick } from "../engine/automation";
import { getStats } from "../engine/collect";
import { fmtTime } from "../engine/format";
import { heroesAllowed } from "../engine/heroes";
import { REALM_DEFS, REALMS } from "../content/magic";
import {
    heroesOnQuests,
    isFavoured,
    openQuests,
    questDef,
    questSecondsLeft,
    questSpeed,
    questStrength,
    recallFromQuest,
    rewardText,
    sendOnQuest,
} from "../engine/quests";
import { AutoToggle } from "./AutoToggle";
import { ProgressBar } from "./components";
import { game } from "./game";
import { Chip, HowItWorks, Notice, Part, SectionHead } from "./kit";

/** What this Ascension's quests have brought back so far */
function Gains() {
    const a = game().ascension;
    const parts: string[] = [];
    if (a.questSkill > 0) parts.push(`+${Math.round(a.questSkill * 100)}% casting skill`);
    if (a.questNodes.length > 0) parts.push(`${a.questNodes.length} magic node${a.questNodes.length === 1 ? "" : "s"}`);
    for (const r of REALMS) {
        const n = a.questBooks[r] ?? 0;
        if (n > 0) parts.push(`${n} ${REALM_DEFS[r].name} book${n === 1 ? "" : "s"}`);
    }
    if (parts.length === 0) return null;
    return <Notice kind="good">Quests have brought back, for this Ascension: {parts.join(" · ")}.</Notice>;
}

function QuestCard(props: { k: number }) {
    const state = game();
    const stats = getStats(state);
    const k = props.k;
    const q = state.ascension.quests[k];
    const def = questDef(q);
    const strength = questStrength(k);
    const away = heroesOnQuests(state);
    const heroes = heroesAllowed(state) ? state.run.heroes : [];
    const value = q.active ? (q.hero ?? "none") : "";
    const onPick = (v: string) => {
        if (v === "") recallFromQuest(state, k);
        else sendOnQuest(state, k, v === "none" ? null : v);
    };
    const left = questSecondsLeft(state, stats, k);
    const favouredHero = q.hero !== null && isFavoured(q.hero, def);
    return (
        <div class={"card panel-card quest" + (q.active ? " active" : "")}>
            <div class="card-title">{def.name}</div>
            <div class="card-text hint">{def.text}</div>
            <div class="chips">
                <span class="chips-label">Favours</span>
                {def.callings.map((c) => (
                    <Chip key={c} tone="insight">
                        {CALLING_NAMES[c]}
                    </Chip>
                ))}
            </div>
            <div class="card-text">
                Brings back <b>{rewardText(state, k, false)}</b>
                <span class="hint">; with a favoured hero {rewardText(state, k, true)}</span>
            </div>
            <div class="card-foot stack">
                <ProgressBar
                    class="quest-progress"
                    fraction={q.progress.div(strength).toNumber()}
                    label={
                        q.active
                            ? `${left === Infinity ? "—" : fmtTime(left)} left${favouredHero ? " · favoured ×" + QUEST_TUNING.matchMult : ""}`
                            : q.progress.gt(0)
                              ? `${Math.floor(q.progress.div(strength).toNumber() * 100)}%, waiting`
                              : "not started"
                    }
                />
                <label class="quest-pick">
                    <span class="hint">Led by </span>
                    <select value={value} onChange={(e) => onPick((e.target as HTMLSelectElement).value)}>
                        <option value="">nobody (waiting)</option>
                        <option value="none">no hero (×{QUEST_TUNING.heroless}, one quest at a time)</option>
                        {heroes.map((h) => {
                            const level = heroLevel(h.xp);
                            const fav = isFavoured(h.id, def);
                            const elsewhere = away.has(h.id) && q.hero !== h.id;
                            const speed = questSpeed(state, stats, k, h.id);
                            return (
                                <option key={h.id} value={h.id}>
                                    {HEROES[h.id].name}, {HERO_RANKS[level - 1]}
                                    {fav ? " ★ favoured" : ""} · {fmtTime(strength.minus(q.progress).max(0).toNumber() / speed)}
                                    {elsewhere ? " (leaves another quest)" : ""}
                                </option>
                            );
                        })}
                    </select>
                </label>
            </div>
        </div>
    );
}

export function QuestsPanel() {
    const state = game();
    const a = state.ascension;
    const open = openQuests(state);
    const done = a.quests.filter((q) => q.done).length;
    const waiting = a.quests.slice(0, open).map((q, k) => ({ q, k })).filter(({ q }) => !q.done);
    const locked = a.quests.length - open;
    const idle = (heroesAllowed(state) ? state.run.heroes : []).filter((h) => !heroesOnQuests(state).has(h.id));
    return (
        <div class="panel">
            <section>
                <SectionHead title="Quests" value={`${done} of ${a.quests.length}`} note="done this Ascension">
                    <AutoToggle kind="quests" label={isBestQuestPick(state) ? "Auto-quest (best hero)" : "Auto-quest"} />
                </SectionHead>
                <HowItWorks id="quests.how">
                    <ul>
                        <li>
                            Each Ascension brings {QUEST_TUNING.count} quests: places of power to take, each with a reward that lasts the
                            Ascension. {QUEST_TUNING.openAtStart} are open at first, and one more opens with each rival you banish.
                        </li>
                        <li>
                            Send a hero to lead one, with an escort from your army; it goes on alongside the frontier. The hero's rank
                            speeds it up, and a hero whose <b>calling</b> the quest favours is ×{QUEST_TUNING.matchMult} faster and
                            brings back more. Your army helps a little: its power counts only by its order of magnitude.
                        </li>
                        <li>
                            <b>A hero away gives no aura</b> until the quest is done (the max population a hero adds is held, but cities
                            don't grow into it). Heroes come back with plenty of experience.
                        </li>
                        <li>
                            Without a hero, one quest at a time can go on, at ×{QUEST_TUNING.heroless} the speed. Quests wait for you:
                            progress is kept if you call one off or the hero doesn't follow you through a Refound, until you Ascend.
                        </li>
                    </ul>
                </HowItWorks>
                <Gains />
                {!heroesAllowed(state) && <Notice kind="challenge">No heroes in this challenge: quests can only go on without one.</Notice>}
                {heroesAllowed(state) && state.run.heroes.length === 0 && (
                    <Notice kind="info">You have no heroes in this kingdom: hire one at the Adventurers' Guild (Army tab).</Notice>
                )}
                {waiting.length > 0 && (
                    <Part title="Open quests" note={idle.length > 0 ? `${idle.length} hero${idle.length === 1 ? "" : "es"} free` : undefined}>
                        <div class="cards">
                            {waiting.map(({ k }) => (
                                <QuestCard key={a.quests[k].id} k={k} />
                            ))}
                        </div>
                    </Part>
                )}
                {locked > 0 && (
                    <p class="hint">
                        {locked} more quest{locked === 1 ? "" : "s"} will open: one for each rival wizard you banish this Ascension.
                    </p>
                )}
                {done > 0 && (
                    <Part title="Done">
                        <ul class="built">
                            {a.quests.map((q, k) =>
                                q.done ? (
                                    <li key={q.id}>
                                        <span class="good">✓</span> <b>{questDef(q).name}</b>{" "}
                                        <span class="hint">
                                            brought back {q.brought ?? rewardText(state, k, q.matched)}
                                            {q.matched ? " (a favoured hero led it)" : ""}
                                        </span>
                                    </li>
                                ) : null,
                            )}
                        </ul>
                    </Part>
                )}
            </section>
        </div>
    );
}
