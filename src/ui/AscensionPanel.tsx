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
import { isRetortUnlocked, pickableRealms, picksUsed, totalPicks, validateBooks } from "../engine/magic";
import { RETORTS, RETORT_ORDER } from "../content/retorts";
import { fmtInt } from "../engine/format";
import { game } from "./game";

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
                {check(p.books >= ASCENSION_BOOKS)} {ASCENSION_BOOKS} spellbooks found this run ({p.books})
            </li>
            <li>
                {check(p.realms >= ASCENSION_REALMS)} from at least {ASCENSION_REALMS} realms ({p.realms})
            </li>
        </ul>
    );
}

function ProfilePicker(props: {
    books: Partial<Record<Realm, number>>;
    setBooks: (b: Partial<Record<Realm, number>>) => void;
    retorts: string[];
    setRetorts: (r: string[]) => void;
}) {
    const state = game();
    const picks = totalPicks(state);
    const used = picksUsed(props.books, props.retorts);
    const pickable = pickableRealms(state);
    const change = (r: Realm, delta: number) => {
        const next = { ...props.books, [r]: Math.max(0, (props.books[r] ?? 0) + delta) };
        if (delta < 0 || used < picks) props.setBooks(next);
    };
    const toggleRetort = (id: string) => {
        props.setRetorts(props.retorts.includes(id) ? props.retorts.filter((x) => x !== id) : [...props.retorts, id]);
    };
    const error = validateBooks(state, props.books, props.retorts);
    return (
        <div>
            <p class="hint">
                Spellbook picks: <b>{used}</b> of {picks}. Books in a realm unlock its spells (Common at {RARITY_BOOKS.common}, Uncommon at{" "}
                {RARITY_BOOKS.uncommon}, Rare at {RARITY_BOOKS.rare}, Very Rare at {RARITY_BOOKS.veryRare}) and make its research cheaper.
                You can only pick realms whose books you have found (or whose wizard you have defeated). Life and Death cannot be combined.
            </p>
            <div class="books">
                {REALMS.map((r) => {
                    const ok = pickable.includes(r);
                    return (
                        <div key={r} class={"book realm-" + r + (ok ? "" : " none")}>
                            <b>{REALM_DEFS[r].name}</b>
                            <div class="row">
                                <button disabled={!ok || (props.books[r] ?? 0) <= 0} onClick={() => change(r, -1)}>
                                    −
                                </button>
                                <span class="pick-count">{props.books[r] ?? 0}</span>
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
            <p class="hint">Special abilities that cost picks. Most must be unlocked first; once unlocked they can be picked at any Ascension.</p>
            <div class="cards retorts">
                {RETORT_ORDER.map((id) => {
                    const r = RETORTS[id];
                    const unlocked = isRetortUnlocked(state, id);
                    const chosen = props.retorts.includes(id);
                    return (
                        <button
                            key={id}
                            class={"card" + (chosen ? " chosen" : "")}
                            disabled={!unlocked}
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
                    The Tower is open. <b>Planeshift (Layer 3) is not built yet</b>: its design is waiting on a decision
                    (see PROGRESS.md).
                </p>
            )}
        </section>
    );
}

export function AscensionPanel() {
    const state = game();
    const a = state.ascension;
    const [books, setBooks] = useState<Partial<Record<Realm, number>>>(a.books);
    const [retorts, setRetorts] = useState<string[]>(a.retorts);
    const races = ascensionRaceOptions(state);
    const [race, setRace] = useState<RaceId>(state.run.startingRace);
    const chosenRace = races.includes(race) ? race : races[0];
    const insight = insightOnAscend(state);
    const ok = canAscend(state) && validateBooks(state, books, retorts) === null;

    const doAscend = () => {
        if (
            confirm(
                `Ascend? Your realm, Fame, Fame upgrades and refounds reset${a.ascensions >= 2 ? "" : ", and the Annals are cleared"}. You gain ${fmtInt(insight)} Insight and become a Wizard.`,
            )
        ) {
            ascend(state, books, chosenRace, retorts);
        }
    };

    return (
        <div class="panel">
            <section>
                <h2>Ascend</h2>
                <p class="hint">
                    {a.ascensions === 0 ? (
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
                <Gate />
                <h3>Wizard profile</h3>
                <ProfilePicker books={books} setBooks={setBooks} retorts={retorts} setRetorts={setRetorts} />
                <h3>Starting race</h3>
                <div class="race-choice">
                    {races.map((r) => (
                        <button key={r} class={"toggle" + (chosenRace === r ? " on" : "")} onClick={() => setRace(r)}>
                            {RACES[r].plural}
                        </button>
                    ))}
                </div>
                <button class="prestige-button ascend" disabled={!ok} onClick={doAscend}>
                    Ascend (+{fmtInt(insight)} Insight)
                </button>
            </section>

            {a.ascensions > 0 && (
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

            {a.ascensions > 0 && <BeyondArcanus />}

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
