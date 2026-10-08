/**
 * Layer 4 UI: the Spell of Mastery (gate, channel, claim), the Masteries
 * claimed, and the Challenge Wizards. Plus the victory and challenge-complete
 * screens, shown over any tab.
 */
import { ARCANUS_WIZARDS } from "../content/frontier";
import { CHALLENGE_ORDER, CHALLENGES, MASTERY_BONUS } from "../content/challenges";
import { REALM_DEFS } from "../content/magic";
import { MYRROR_WIZARDS } from "../content/myrror";
import { RETORTS } from "../content/retorts";
import { SPELLS } from "../content/spells";
import { insightOnAscend } from "../engine/ascension";
import { getStats } from "../engine/collect";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import { canResearch, knowsSpell, masteryGate, research, researchCost } from "../engine/magic";
import {
    abandonChallenge,
    canChannel,
    canClaimMastery,
    canCompleteChallenge,
    canStartChallenge,
    challengeBlockedReason,
    challengeProfile,
    claimMastery,
    completeChallenge,
    dismissNotice,
    keepPlaying,
    masteryBonus,
    masteryCost,
    masterySecondsLeft,
    setChannelling,
    SPELL_OF_MASTERY,
    startChallenge,
} from "../engine/mastery";
import { GameState } from "../engine/state";
import { Price, ProgressBar } from "./components";
import { game } from "./game";

const check = (ok: boolean) => <span class={ok ? "good" : "bad"}>{ok ? "✓" : "✗"}</span>;

const CLAIM_TEXT =
    "Claiming starts the worlds anew: your kingdom, Fame, Insight, Planar Essence, their upgrades and the Myrror campaign all reset. " +
    "Every milestone counts as earned, so automation runs from the start.";

function doClaim(state: GameState) {
    if (confirm(`Claim your Mastery?\n\n${CLAIM_TEXT}`)) claimMastery(state);
}

export function isMasteryTabVisible(state: GameState): boolean {
    const m = state.mastery;
    return m.masteries > 0 || m.cast || m.progress.gt(0) || state.planes.planeshifts > 0;
}

function SpellSection() {
    const state = game();
    const stats = getStats(state);
    const m = state.mastery;
    const gate = masteryGate(state);
    const spell = SPELLS[SPELL_OF_MASTERY];
    const known = knowsSpell(state, SPELL_OF_MASTERY);
    const cost = masteryCost(state);
    const left = masterySecondsLeft(state, stats);
    return (
        <section>
            <h2>The Spell of Mastery</h2>
            <p class="hint">
                Master of Magic's last spell. Once every rival wizard on both planes has fallen, research it and channel
                it: while it channels, all your mana income flows into it, so other spells wait. When it completes, you
                have won, and the worlds can begin anew with you as their Master.
            </p>
            {m.challenge ? (
                <p class="hint">Not during a challenge.</p>
            ) : m.cast ? (
                <>
                    <p class="good">The Spell of Mastery is cast. You are the Master of Magic!</p>
                    <p class="hint">{CLAIM_TEXT} You can keep playing for as long as you like and claim it later.</p>
                    <button class="prestige-button mastery" disabled={!canClaimMastery(state)} onClick={() => doClaim(state)}>
                        Claim Mastery {m.masteries + 1} (×{fmtInt(Math.pow(MASTERY_BONUS, m.masteries + 1))} production, gold,
                        knowledge and mana)
                    </button>
                </>
            ) : (
                <>
                    {!known && m.progress.lte(0) && (
                        <>
                            <ul class="gate">
                                <li>
                                    {check(gate.myrran >= MYRROR_WIZARDS)} Banish every Myrran wizard this Planeshift ({gate.myrran} of{" "}
                                    {MYRROR_WIZARDS})
                                </li>
                                <li>
                                    {check(gate.fortresses >= ARCANUS_WIZARDS)} Take every rival wizard's Fortress on Arcanus in one
                                    kingdom ({gate.fortresses} of {ARCANUS_WIZARDS} in this one)
                                </li>
                            </ul>
                            <p>
                                <button disabled={!canResearch(state, SPELL_OF_MASTERY)} onClick={() => research(state, SPELL_OF_MASTERY)}>
                                    Research the Spell of Mastery
                                </button>{" "}
                                <Price amount={researchCost(state, stats, spell)} currency="knowledge" have={state.run.knowledge} />
                                {!gate.ready && <span class="hint"> (once both are met)</span>}
                            </p>
                        </>
                    )}
                    {(known || m.progress.gt(0)) && (
                        <>
                            <ProgressBar
                                class="mastery"
                                fraction={m.progress.div(cost).toNumber()}
                                label={`${fmt(m.progress)} / ${fmt(cost)} mana`}
                            />
                            <p>
                                <button disabled={!m.channelling && !canChannel(state)} onClick={() => setChannelling(state, !m.channelling)}>
                                    {m.channelling ? "Pause the channel" : m.progress.gt(0) ? "Resume channelling" : "Begin channelling"}
                                </button>{" "}
                                <span class="hint">
                                    {m.channelling
                                        ? `All mana income flows into the Spell: about ${Number.isFinite(left) ? fmtTime(left) : "forever"} left at this rate.`
                                        : "Paused: your mana goes to your pool as usual. Progress is kept, also through Refounds and Ascensions."}
                                </span>
                            </p>
                        </>
                    )}
                </>
            )}
        </section>
    );
}

function MasteriesSection() {
    const state = game();
    const m = state.mastery;
    if (m.masteries === 0) return null;
    return (
        <section>
            <h2>
                Masteries <span class="count">· {m.masteries} claimed</span>
            </h2>
            <p>
                ×{fmtInt(masteryBonus(state))} production, gold, knowledge and mana. Every milestone counts as earned. Each
                Spell of Mastery you cast again (same gate) gives another Mastery.
            </p>
        </section>
    );
}

function ChallengesSection() {
    const state = game();
    const m = state.mastery;
    if (m.masteries === 0) {
        return (
            <section>
                <h2>Challenge Wizards</h2>
                <p class="hint">
                    After your first Mastery, each of the 14 rival wizards offers a challenge: one Ascension as that wizard,
                    under their rule, for a reward that lasts forever.
                </p>
            </section>
        );
    }
    const blocked = challengeBlockedReason(state);
    const doStart = (wizard: string) => {
        const c = CHALLENGES[wizard];
        const replay = m.completed.includes(wizard);
        const text = [
            replay ? `Replay ${wizard}'s challenge?` : `Accept ${wizard}'s challenge?`,
            c.lore,
            `This is an Ascension: your current Ascension ends (with Insight if its gate is met), and a new one begins as ${wizard}, with their books and retort.`,
            `Rule: ${c.rule}.`,
            `Goal: take all ${ARCANUS_WIZARDS} rival Fortresses of Arcanus in one kingdom. Refounds are allowed; Ascending and Planeshifting aren't. Myrror pauses meanwhile.`,
            replay ? `Reward: ${c.reward} (already yours; a replay doesn't give it again).` : `Reward: ${c.reward}.`,
        ].join("\n\n");
        if (confirm(text)) startChallenge(state, wizard);
    };
    return (
        <section>
            <h2>
                Challenge Wizards <span class="count">· {m.completed.length} of {CHALLENGE_ORDER.length} beaten</span>
            </h2>
            <p class="hint">
                One Ascension as a rival wizard, with their books, retort and rule. Goal: take all {ARCANUS_WIZARDS} rival
                Fortresses of Arcanus in one kingdom. Refounds are allowed; Ascending and Planeshifting aren't, and Myrror
                pauses (its holdings, works and boons still count). Rewards last forever.
            </p>
            {m.challenge && <CurrentChallenge />}
            <div class="cards challenges">
                {CHALLENGE_ORDER.map((w) => {
                    const c = CHALLENGES[w];
                    const done = m.completed.includes(w);
                    const active = m.challenge === w;
                    const { books, retorts } = challengeProfile(state, c);
                    return (
                        <div key={w} class={"card challenge" + (done ? " done" : "") + (active ? " active" : "")}>
                            <div class="card-title">
                                {w} {done && <span class="good">✓</span>}
                                {active && <span class="count">· in progress</span>}
                            </div>
                            <div class="card-text challenge-lore">{c.lore}</div>
                            <div class="card-text hint">
                                {Object.entries(books)
                                    .map(([r, n]) => `${n} ${REALM_DEFS[r as keyof typeof REALM_DEFS].name}`)
                                    .join(", ")}
                                {retorts.length > 0 && ` · ${retorts.map((id) => RETORTS[id].name).join(", ")}`}
                            </div>
                            <div class="card-text">
                                <b>Rule:</b> {c.rule}.
                            </div>
                            <div class="card-text">
                                <b>Reward:</b> <span class={done ? "good" : ""}>{c.reward}</span>.
                            </div>
                            {!active && (
                                <div class="card-cost">
                                    <button disabled={!canStartChallenge(state, w)} title={blocked ?? undefined} onClick={() => doStart(w)}>
                                        {done ? "Replay challenge" : "Accept challenge"}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {blocked && <p class="hint">{blocked}</p>}
        </section>
    );
}

function CurrentChallenge() {
    const state = game();
    const m = state.mastery;
    const c = CHALLENGES[m.challenge!];
    const doAbandon = () => {
        if (confirm(`Abandon ${c.wizard}'s challenge? You Ascend back to your own profile (with Insight if the Ascension gate is met).`)) {
            abandonChallenge(state);
        }
    };
    const won = canCompleteChallenge(state);
    const insight = insightOnAscend(state);
    const doComplete = () => completeChallenge(state);
    return (
        <div class="challenge-current">
            <p>
                <b>{c.wizard}'s challenge</b> · {fmtTime(state.meta.playtime - m.challengeStartedAt)} so far · Fortresses in this kingdom:{" "}
                <b>
                    {state.run.fortressesTaken} of {ARCANUS_WIZARDS}
                </b>
            </p>
            <p class="hint">Rule: {c.rule}.</p>
            <p>
                <button class="prestige-button mastery" disabled={!won} onClick={doComplete}>
                    Complete the challenge
                </button>{" "}
                <span class={won ? "good" : "hint"}>
                    {won
                        ? `Won! Completing it gives the reward (${c.reward}) and Ascends you back to your own profile` +
                          (insight.gt(0) ? ` (+${fmtInt(insight)} Insight)` : "") +
                          "."
                        : `Once all ${ARCANUS_WIZARDS} rival Fortresses of Arcanus have fallen in one kingdom. You can Refound as often as you like to get there (a Refound starts the count again), but you can't Ascend until it's complete. Completing it gives the reward and Ascends you back to your own profile (auto-Ascend does it for you).`}
                </span>
            </p>
            <button class="toggle" onClick={doAbandon}>
                Abandon the challenge
            </button>
        </div>
    );
}

export function MasteryPanel() {
    return (
        <div class="panel">
            <SpellSection />
            <MasteriesSection />
            <ChallengesSection />
        </div>
    );
}

/** A banner under the tabs while a challenge runs (it changes how everything else works) */
export function ChallengeBanner(props: { onOpen: () => void }) {
    const state = game();
    const c = state.mastery.challenge ? CHALLENGES[state.mastery.challenge] : null;
    if (!c) return null;
    return (
        <div class="challenge-banner">
            <b>{c.wizard}'s challenge:</b> {c.rule}.{" "}
            {state.mastery.challengeDone ? (
                <span class="good">Won: complete it on the Mastery tab.</span>
            ) : (
                <>
                    Fortresses in this kingdom: {state.run.fortressesTaken} of {ARCANUS_WIZARDS}.
                </>
            )}{" "}
            <button class="link" onClick={props.onOpen}>
                Details
            </button>
        </div>
    );
}

/** The victory screen, once per Spell of Mastery cast */
export function Victory() {
    const state = game();
    const m = state.mastery;
    if (!m.cast || m.victorySeen || !m.victory) return null;
    const v = m.victory;
    const claim = () => {
        if (confirm(`Claim your Mastery now?\n\n${CLAIM_TEXT}`)) claimMastery(state);
    };
    return (
        <div class="modal-backdrop">
            <div class="modal victory">
                <h2>You are the Master of Magic!</h2>
                <p>
                    The Spell of Mastery is cast. Every rival wizard of Arcanus and Myrror has fallen, and both worlds bow
                    before you.
                </p>
                <ul>
                    <li>Time played: {fmtTime(v.playtime)}</li>
                    <li>
                        Refounds: {fmtInt(v.refounds)} · Ascensions: {fmtInt(v.ascensions)} · Planeshifts: {fmtInt(v.planeshifts)}
                    </li>
                    <li>
                        Rival wizards banished: {v.arcanusWizards} from Arcanus, {v.myrranWizards} from Myrror
                    </li>
                    {m.masteries > 0 && <li>Masteries before this one: {m.masteries}</li>}
                </ul>
                <p class="hint">
                    {CLAIM_TEXT} You gain a Mastery (×{MASTERY_BONUS} production, gold, knowledge and mana each)
                    {m.masteries === 0 ? " and the Challenge Wizards open." : "."} Or keep playing, and claim it whenever you
                    like from the Mastery tab.
                </p>
                <div class="row">
                    <button class="prestige-button mastery" onClick={claim}>
                        Claim Mastery
                    </button>
                    <button onClick={() => keepPlaying(state)}>Keep playing</button>
                </div>
            </div>
        </div>
    );
}

/** "Challenge complete" message */
export function MasteryNotice() {
    const state = game();
    const text = state.mastery.notice;
    if (!text) return null;
    return (
        <div class="modal-backdrop" onClick={() => dismissNotice(state)}>
            <div class="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Challenge complete</h2>
                <p>{text}</p>
                <p class="hint">You have Ascended back to your own profile.</p>
                <button onClick={() => dismissNotice(state)}>Continue</button>
            </div>
        </div>
    );
}
