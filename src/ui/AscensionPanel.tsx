import { useState } from "preact/hooks";
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { RACES, RaceId } from "../content/races";
import { RARITY_BOOKS, SPELLS } from "../content/spells";
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
import {
    blockedByOpposed,
    currentFamiliar,
    familiarLevel,
    freeRetorts,
    freeRetortSlots,
    isRetortUnlocked,
    isWizard,
    pickableRealms,
    picksUsed,
    resolveFamiliar,
    retortPicks,
    spellMemoryLevel,
    totalPicks,
    validateBooks,
} from "../engine/magic";
import { FAMILIARS, FamiliarChoice } from "../content/familiars";
import { GameState } from "../engine/state";
import { BASE_PICKS } from "../content/wizards";
import { RETORTS, RETORT_ORDER } from "../content/retorts";
import { fmtInt } from "../engine/format";
import { game } from "./game";
import { AutoPrestige } from "./AutoToggle";
import { heroAscendText } from "./HeroesSection";
import { fameUpgradesValue } from "../engine/prestige";

/** Enduring Legacy (Essence): whether the next Ascension keeps the Fame upgrades */
function KeepFameToggle() {
    const state = game();
    if ((state.planes.upgrades.enduringLegacy ?? 0) === 0) return null;
    const on = state.automation.keepFame;
    const value = fameUpgradesValue(state);
    return (
        <div class="row auto-prestige">
            <button class={"toggle auto" + (on ? " on" : "")} onClick={() => (state.automation.keepFame = !on)}>
                Keep Fame upgrades: {on ? "on" : "off"}
            </button>
            <span class="hint">
                {on
                    ? `Enduring Legacy: your Fame upgrades stay when you Ascend. The first ${fmtInt(value)} Fame you earn afterwards repays them, before you can buy more.`
                    : "Enduring Legacy is off: Ascending resets your Fame upgrades as usual."}
            </span>
        </div>
    );
}

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

function familiarName(realm: Realm | null): string {
    return realm ? REALM_DEFS[realm].name : "none (no spellbooks)";
}

/** The wizard profile of the current Ascension */
export function CurrentProfile() {
    const state = game();
    const a = state.ascension;
    if (!isWizard(state)) return null;
    const familiar = currentFamiliar(state);
    return (
        <p>
            Your wizard this Ascension: <b>{profileText(a.books, a.retorts)}</b>{" "}
            <span class="hint">({picksUsed(a.books, a.retorts, freeRetortSlots(state))} picks)</span>
            {familiar && (
                <>
                    <br />
                    Familiar: <b>{REALM_DEFS[familiar].name}</b>{" "}
                    <span class="hint">({FAMILIARS[familiar].text(familiarLevel(state))})</span>
                </>
            )}
        </p>
    );
}

/**
 * How the planned profile differs from this Ascension's, e.g.
 * ["Life 3 → 4", "+ Warlord", "− Alchemy", "familiar Life → Chaos"]. Empty if the same.
 */
export function profileChanges(state: GameState): string[] {
    const a = state.ascension;
    const changes: string[] = [];
    for (const r of REALMS) {
        const now = a.books[r] ?? 0;
        const next = a.planBooks[r] ?? 0;
        if (now !== next) changes.push(`${REALM_DEFS[r].name} ${now} → ${next}`);
    }
    for (const id of a.planRetorts) if (!a.retorts.includes(id)) changes.push(`+ ${RETORTS[id]?.name ?? id}`);
    for (const id of a.retorts) if (!a.planRetorts.includes(id)) changes.push(`− ${RETORTS[id]?.name ?? id}`);
    // Spell Memory level 1 forgets the spells of realms the next profile drops
    if (spellMemoryLevel(state) === 1) {
        for (const r of REALMS) {
            if ((a.planBooks[r] ?? 0) > 0) continue;
            const lost = a.spellMemory.filter((id) => SPELLS[id]?.realm === r).length;
            if (lost > 0) changes.push(`forgets ${lost} remembered ${REALM_DEFS[r].name} spell${lost === 1 ? "" : "s"}`);
        }
    }
    if (familiarLevel(state) > 0) {
        const now = a.familiar;
        const next = resolveFamiliar(a.planFamiliar, a.planBooks);
        if (now !== next) changes.push(`familiar ${familiarName(now)} → ${familiarName(next)}`);
    }
    return changes;
}

const FAMILIAR_CHOICES: FamiliarChoice[] = ["match", ...REALMS];

/** Familiar for the next Ascension: a realm, or "match my spellbooks" */
function FamiliarPicker() {
    const state = game();
    const a = state.ascension;
    const level = familiarLevel(state);
    if (level === 0) return null;
    const resolved = resolveFamiliar(a.planFamiliar, a.planBooks);
    return (
        <>
            <h4>Familiar</h4>
            <div class="race-choice">
                {FAMILIAR_CHOICES.map((c) => (
                    <button
                        key={c}
                        class={"toggle" + (a.planFamiliar === c ? " on" : "")}
                        title={c === "match" ? "The realm you have the most books in (first realm on ties)" : FAMILIARS[c].text(level)}
                        onClick={() => (a.planFamiliar = c)}
                    >
                        {c === "match" ? `Match my spellbooks (${familiarName(resolveFamiliar("match", a.planBooks))})` : REALM_DEFS[c].name}
                    </button>
                ))}
            </div>
            <p class="hint">
                {resolved
                    ? `Next Ascension's familiar: ${REALM_DEFS[resolved].name}, ${FAMILIARS[resolved].text(level)}.`
                    : "With no spellbooks, Match my spellbooks gives no familiar."}
                {isWizard(state) && resolved !== a.familiar && <span class="insight"> Changed: this Ascension's is {familiarName(a.familiar)}.</span>}
            </p>
        </>
    );
}

function ProfilePicker() {
    const state = game();
    const a = state.ascension;
    const books = a.planBooks;
    const retorts = a.planRetorts;
    const picks = totalPicks(state);
    const deeper = picks - BASE_PICKS;
    const free = freeRetortSlots(state);
    const freeOnes = freeRetorts(retorts, free);
    const bookPicks = picksUsed(books);
    const retortCost = retortPicks(retorts, free);
    const used = bookPicks + retortCost;
    const wizard = isWizard(state);
    // picks the current wizard didn't have when Ascending (bought with Insight since)
    const gained = wizard ? Math.max(0, Math.min(picks - used, picks - picksUsed(a.books, a.retorts, free))) : 0;
    const pickable = pickableRealms(state);
    const change = (r: Realm, delta: number) => {
        if (delta > 0 && (used >= picks || blockedByOpposed(books, r))) return;
        a.planBooks = { ...books, [r]: Math.max(0, (books[r] ?? 0) + delta) };
    };
    const toggleRetort = (id: string) => {
        a.planRetorts = retorts.includes(id) ? retorts.filter((x) => x !== id) : [...retorts, id];
    };
    const error = validateBooks(state, books, retorts);
    return (
        <div>
            <p>
                Picks for the next Ascension: <b>{used}</b> of {picks} used ({bookPicks} on spellbooks, {retortCost} on
                retorts{free > 0 && `; Retort Mastery makes your ${free === 1 ? "most expensive retort" : `${free} most expensive retorts`} free`})
                {used < picks && (
                    <span class="insight">
                        {" "}
                        · {picks - used} left to spend
                        {gained > 0 && ` (${gained} new since you Ascended)`}
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
                    const now = a.books[r] ?? 0;
                    const opposed = blockedByOpposed(books, r);
                    return (
                        <div key={r} class={"book realm-" + r + (ok ? "" : " none")}>
                            <b>{REALM_DEFS[r].name}</b>
                            <div class="row">
                                <button disabled={!ok || (books[r] ?? 0) <= 0} onClick={() => change(r, -1)}>
                                    −
                                </button>
                                <span class="pick-count">{books[r] ?? 0}</span>
                                <button
                                    disabled={!ok || used >= picks || opposed !== null}
                                    title={opposed ? `Can't be combined with ${REALM_DEFS[opposed].name}` : undefined}
                                    onClick={() => change(r, 1)}
                                >
                                    +
                                </button>
                            </div>
                            {!ok && <div class="hint">never found</div>}
                            {ok && opposed && <div class="hint">not with {REALM_DEFS[opposed].name}</div>}
                            {wizard && now !== (books[r] ?? 0) && <div class="hint insight">changed · this Ascension: {now}</div>}
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
                    const current = a.retorts.includes(id);
                    // would adding it still fit? (it may push another retort out of the free slots)
                    const fits = picksUsed(books, [...retorts, id], free) <= picks;
                    return (
                        <button
                            key={id}
                            class={"card" + (chosen ? " chosen" : "")}
                            disabled={!unlocked || (!chosen && !fits)}
                            onClick={() => toggleRetort(id)}
                        >
                            <div class="card-title">
                                {r.name} <span class="count">{r.picks} pick{r.picks > 1 ? "s" : ""}</span>
                                {chosen && <span class="tag">chosen</span>}
                                {chosen && freeOnes.includes(id) && <span class="tag" title="Retort Mastery: costs no picks">free</span>}
                                {wizard && chosen && !current && <span class="tag" title="Not in this Ascension's profile">new</span>}
                                {wizard && !chosen && current && <span class="tag" title="In this Ascension's profile, not the next">dropped</span>}
                            </div>
                            <div class="card-text">{r.text}</div>
                            {!unlocked && r.unlock && <div class="card-text bad">🔒 {r.unlock.text}</div>}
                        </button>
                    );
                })}
            </div>
            <FamiliarPicker />
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
    const unspent = totalPicks(state) - picksUsed(books, retorts, freeRetortSlots(state));
    const changes = isWizard(state) ? profileChanges(state) : [];

    const doAscend = () => {
        const lines = [
            `Ascend as: ${profileText(books, retorts)}, starting as ${RACES[chosenRace].plural}.` +
                (familiarLevel(state) > 0 ? ` Familiar: ${familiarName(resolveFamiliar(a.planFamiliar, books))}.` : ""),
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
                {isWizard(state) && <h3>This Ascension</h3>}
                <CurrentProfile />
                <Gate />
                <h3>
                    {isWizard(state) ? "Next Ascension" : "Your first wizard profile"}{" "}
                    <span class="count">· auto-Ascend uses this</span>
                </h3>
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
                <KeepFameToggle />
                {isWizard(state) && (
                    <p class={changes.length > 0 ? "insight" : "hint"}>
                        {changes.length === 0
                            ? "Next Ascension: the same profile as this one."
                            : `Next Ascension changes: ${changes.join(", ")}.`}
                    </p>
                )}
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
