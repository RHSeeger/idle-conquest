import { useState } from "preact/hooks";
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { RACES, RaceId } from "../content/races";
import { RARITY_BOOKS } from "../content/spells";
import { ASCENSION_MILESTONES, INSIGHT_UPGRADES, INSIGHT_UPGRADE_ORDER, RIVAL_WIZARD_DEFS } from "../content/wizards";
import {
    ascend,
    ascensionProgress,
    ascensionRaceOptions,
    ASCENSION_BOOKS,
    ASCENSION_REALMS,
    buyInsightUpgrade,
    canAscend,
    canBuyInsightUpgrade,
    insightOnAscend,
    insightUpgradeCost,
    insightUpgradeLevel,
    planeshiftProgress,
} from "../engine/ascension";
import { isRetortUnlocked, isWizard, pickableRealms, picksUsed, totalPicks, validateBooks } from "../engine/magic";
import { BASE_PICKS } from "../content/wizards";
import { RETORTS, RETORT_ORDER } from "../content/retorts";
import { fmtInt } from "../engine/format";
import { game } from "./game";
import { AutoPrestige } from "./AutoToggle";
import { heroAscendText } from "./HeroesSection";

function Gate() {
    const state = game();
    const p = ascensionProgress(state);
    const check = (ok: boolean) => <span class={ok ? "good" : "bad"}>{ok ? "✓" : "✗"}</span>;
    return (
        <ul class="gate">
            <li>
                {check(p.wizardsGuild)} A Wizards' Guild in your realm
            </li>
            <li>
                {check(p.books >= ASCENSION_BOOKS)} Spellbooks found this run: {p.books} of {ASCENSION_BOOKS}
            </li>
            <li>
                {check(p.realms >= ASCENSION_REALMS)} Realms among them: {p.realms} of at least {ASCENSION_REALMS}
            </li>
        </ul>
    );
}

/** "Life ×4, Chaos ×1 · Warlord" */
export function profileText(books: Partial<Record<Realm, number>>, retorts: readonly string[]): string {
    const b = REALMS.filter((r) => (books[r] ?? 0) > 0).map((r) => `${REALM_DEFS[r].name} ×${books[r]}`);
    const parts = [b.length > 0 ? b.join(", ") : "no spellbooks"];
    if (retorts.length > 0) parts.push(retorts.map((id) => RETORTS[id]?.name ?? id).join(", "));
    return parts.join(" · ");
}

/** The wizard profile of the current Ascension */
export function CurrentProfile() {
    const state = game();
    const a = state.ascension;
    if (!isWizard(state)) return null;
    return (
        <p>
            Your wizard this Ascension: <b>{profileText(a.books, a.retorts)}</b>{" "}
            <span class="hint">({picksUsed(a.books, a.retorts)} picks)</span>
        </p>
    );
}

function ProfilePicker() {
    const state = game();
    const a = state.ascension;
    const books = a.planBooks;
    const retorts = a.planRetorts;
    const picks = totalPicks(state);
    const deeper = picks - BASE_PICKS;
    const bookPicks = picksUsed(books);
    const retortPicks = picksUsed({}, retorts);
    const used = bookPicks + retortPicks;
    // picks the current wizard didn't have when Ascending (bought with Insight since)
    const gained = isWizard(state) ? Math.max(0, Math.min(picks - used, picks - picksUsed(a.books, a.retorts))) : 0;
    const pickable = pickableRealms(state);
    const change = (r: Realm, delta: number) => {
        if (delta > 0 && used >= picks) return;
        a.planBooks = { ...books, [r]: Math.max(0, (books[r] ?? 0) + delta) };
    };
    const toggleRetort = (id: string) => {
        a.planRetorts = retorts.includes(id) ? retorts.filter((x) => x !== id) : [...retorts, id];
    };
    const error = validateBooks(state, books, retorts);
    return (
        <div>
            <p>
                Picks for the next Ascension: <b>{used}</b> of {picks} used ({bookPicks} on spellbooks, {retortPicks} on
                retorts)
                {used < picks && (
                    <span class="insight">
                        {" "}
                        · {picks - used} left to spend
                        {gained > 0 && ` (${gained} new from Deeper Study since you Ascended)`}
                    </span>
                )}
            </p>
            <p class="hint">
                Every wizard has {BASE_PICKS} picks{deeper > 0 && `, +${deeper} from Deeper Study (an Insight upgrade)`}.
                Spellbooks and retorts share them. Books in a realm unlock its spells (Common at {RARITY_BOOKS.common},
                Uncommon at {RARITY_BOOKS.uncommon}, Rare at {RARITY_BOOKS.rare}, Very Rare at {RARITY_BOOKS.veryRare}) and
                make its research cheaper. You can only pick realms whose books you have found (or whose wizard you have
                defeated). Life and Death cannot be combined.
            </p>
            <div class="books">
                {REALMS.map((r) => {
                    const ok = pickable.includes(r);
                    return (
                        <div key={r} class={"book realm-" + r + (ok ? "" : " none")}>
                            <b>{REALM_DEFS[r].name}</b>
                            <div class="row">
                                <button disabled={!ok || (books[r] ?? 0) <= 0} onClick={() => change(r, -1)}>
                                    −
                                </button>
                                <span class="pick-count">{books[r] ?? 0}</span>
                                <button disabled={!ok || used >= picks} onClick={() => change(r, 1)}>
                                    +
                                </button>
                            </div>
                            {!ok && <div class="hint">never found</div>}
                        </div>
                    );
                })}
            </div>
            <h3>Retorts</h3>
            <p class="hint">
                Special abilities that cost picks from the same pool as spellbooks. Most start locked: each locked card
                says what unlocks it (an achievement during play). Once unlocked, a retort stays unlocked and can be
                picked at any later Ascension.
            </p>
            <div class="cards retorts">
                {RETORT_ORDER.map((id) => {
                    const r = RETORTS[id];
                    const unlocked = isRetortUnlocked(state, id);
                    const chosen = retorts.includes(id);
                    return (
                        <button
                            key={id}
                            class={"card" + (chosen ? " chosen" : "")}
                            disabled={!unlocked || (!chosen && used + r.picks > picks)}
                            onClick={() => toggleRetort(id)}
                        >
                            <div class="card-title">
                                {r.name} <span class="count">{r.picks} pick{r.picks > 1 ? "s" : ""}</span>
                                {chosen && <span class="tag">chosen</span>}
                            </div>
                            <div class="card-text">{r.text}</div>
                            {!unlocked && r.unlock && <div class="card-text bad">🔒 {r.unlock.text}</div>}
                        </button>
                    );
                })}
            </div>
            {error && <p class="bad">{error}</p>}
        </div>
    );
}

function BeyondArcanus() {
    const state = game();
    const p = planeshiftProgress(state);
    const check = (ok: boolean) => <span class={ok ? "good" : "bad"}>{ok ? "✓" : "✗"}</span>;
    return (
        <section>
            <h2>Beyond Arcanus</h2>
            <p class="hint">
                Towers of Wizardry stand where the walls between the worlds are thin. Through them lies Myrror, home of
                the Beastmen, Dark Elves, Draconians, Dwarves, Klackons and Trolls.
            </p>
            <ul class="gate">
                <li>{check(p.towerCleared)} Clear a Tower of Wizardry this run (found by expeditions)</li>
                <li>{check(p.riteKnown)} Research the Rite of the Tower (Arcane; Plane Shift halves its cost)</li>
            </ul>
            {p.ready && (
                <p class="wall">
                    The Tower is open: you can <b>Planeshift</b> (Planes tab).
                </p>
            )}
        </section>
    );
}

export function AscensionPanel() {
    const state = game();
    const a = state.ascension;
    const books = a.planBooks;
    const retorts = a.planRetorts;
    const races = ascensionRaceOptions(state);
    const [race, setRace] = useState<RaceId>(state.run.startingRace);
    const chosenRace = races.includes(race) ? race : races[0];
    const insight = insightOnAscend(state);
    const ok = canAscend(state) && validateBooks(state, books, retorts) === null;
    const unspent = totalPicks(state) - picksUsed(books, retorts);

    const doAscend = () => {
        const lines = [
            `Ascend as: ${profileText(books, retorts)}, starting as ${RACES[chosenRace].plural}.`,
            unspent > 0 ? `WARNING: ${unspent} pick${unspent === 1 ? " is" : "s are"} unspent.` : "",
            `Your realm, Fame, Fame upgrades and refounds reset${a.ascensions >= 2 ? "" : ", and the Annals are cleared"}. You gain ${fmtInt(insight)} Insight.`,
        ];
        if (confirm(lines.filter(Boolean).join("\n\n"))) {
            ascend(state, books, chosenRace, retorts);
        }
    };

    return (
        <div class="panel">
            <section>
                <h2>Ascend</h2>
                <p class="hint">
                    {!isWizard(state) ? (
                        <>
                            Leave the throne and become a <b>Wizard</b>. Every run after this has mana, spells, magic nodes
                            and summoned creatures, and you can break the wards of rival wizards and fight through their
                            domains.{" "}
                        </>
                    ) : (
                        <>Ascend again to choose a new wizard profile and start a fresh Ascension. </>
                    )}
                    Insight is based on the Fame earned this Ascension ({fmtInt(a.fameEarned)} so far, plus what refounding now
                    would give), the spellbooks you hold this run, and the rival wizards you defeated.
                </p>
                <CurrentProfile />
                <Gate />
                <h3>Wizard profile for the next Ascension</h3>
                <ProfilePicker />
                <h3>Starting race</h3>
                <div class="race-choice">
                    {races.map((r) => (
                        <button key={r} class={"toggle" + (chosenRace === r ? " on" : "")} onClick={() => setRace(r)}>
                            {RACES[r].plural}
                        </button>
                    ))}
                </div>
                {state.run.heroes.length > 0 && <p class="hint">{heroAscendText(state)}</p>}
                <button class="prestige-button ascend" disabled={!ok} onClick={doAscend}>
                    Ascend (+{fmtInt(insight)} Insight)
                </button>
                {unspent > 0 && (
                    <span class="bad">
                        {" "}
                        The next profile still has {unspent} unspent pick{unspent === 1 ? "" : "s"}
                    </span>
                )}
                <AutoPrestige kind="ascend" />
            </section>

            {isWizard(state) && (
                <section>
                    <h2>
                        Insight <span class="insight">{fmtInt(a.insight)}</span>{" "}
                        <span class="count">
                            · {a.ascensions} Ascension{a.ascensions === 1 ? "" : "s"} · {fmtInt(a.insightTotal)} earned in total
                        </span>
                    </h2>
                    <div class="cards">
                        {INSIGHT_UPGRADE_ORDER.map((id) => {
                            const u = INSIGHT_UPGRADES[id];
                            const level = insightUpgradeLevel(state, id);
                            const maxed = level >= u.maxLevel;
                            return (
                                <button key={id} class="card" disabled={!canBuyInsightUpgrade(state, id)} onClick={() => buyInsightUpgrade(state, id)}>
                                    <div class="card-title">
                                        {u.name}{" "}
                                        <span class="count">
                                            {level}/{u.maxLevel}
                                        </span>
                                    </div>
                                    <div class="card-text">
                                        {u.text(level)}
                                        {!maxed && <> → {u.text(level + 1)}</>}
                                    </div>
                                    <div class="card-cost">
                                        {maxed ? <span class="hint">maxed</span> : <span class="price insight">◈ {insightUpgradeCost(state, id)}</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            <section>
                <h2>Ascension milestones</h2>
                <ul class="milestones">
                    {ASCENSION_MILESTONES.map((m) => (
                        <li key={m.id} class={a.ascensions >= m.ascensions ? "done" : ""}>
                            <b>
                                {m.ascensions} Ascension{m.ascensions > 1 ? "s" : ""}: {m.name}
                            </b>{" "}
                            — {m.text}
                        </li>
                    ))}
                </ul>
            </section>

            {isWizard(state) && <BeyondArcanus />}

            {a.wizardsDefeated.length > 0 && (
                <section>
                    <h2>Rival wizards banished</h2>
                    <ul class="built">
                        {a.wizardsDefeated.map((w) => (
                            <li key={w}>
                                <b>{w}</b>{" "}
                                <span class="hint">{(RIVAL_WIZARD_DEFS[w]?.realms ?? []).map((r) => REALM_DEFS[r].name).join(" & ")} magic</span>
                                {a.wizardsDefeatedThisAscension.includes(w) && <span class="tag">this Ascension</span>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
