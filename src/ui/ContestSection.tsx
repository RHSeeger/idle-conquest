/**
 * The wizards' contest (Layer 2, engine/wards.ts): the current rival's wards,
 * your spell power and casting skill (Magic tab), and how a profile's books
 * match up against a set of rivals (also the Ascension planner).
 */
import { ARCANUS_WIZARDS } from "../content/frontier";
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { MATCHUP_OPPOSED, MATCHUP_SAME, MATCHUP_SORCERY, realmMatchup, RIVAL_WIZARD_DEFS } from "../content/wizards";
import { getStats } from "../engine/collect";
import { fmt, fmtTime } from "../engine/format";
import {
    ascensionRivals,
    banishedCount,
    castingSkill,
    currentRival,
    enchantmentsUpkeep,
    freeSkill,
    isBanished,
    manaToNextSkill,
    matchupFor,
    setSkillShare,
    spellPower,
    upkeepUsed,
    wardSecondsLeft,
    wardStrength,
} from "../engine/wards";
import { BreakdownView, ProgressBar, Tip } from "./components";
import { game } from "./game";
import { HowItWorks, Part, SectionHead } from "./kit";

function realmsOf(wizard: string): string {
    return (RIVAL_WIZARD_DEFS[wizard]?.realms ?? []).map((r) => REALM_DEFS[r].name).join(" & ");
}

function mult(m: number): string {
    return "×" + (Math.round(m * 100) / 100).toString();
}

/** "Death ×2 (4 books), Chaos ×1 (3)": how each realm of a profile fares against a wizard */
function matchupDetail(books: Partial<Record<Realm, number>>, wizard: string): string {
    const theirs = RIVAL_WIZARD_DEFS[wizard]?.realms ?? [];
    const parts = REALMS.filter((r) => (books[r] ?? 0) > 0).map(
        (r) => `${REALM_DEFS[r].name} ${mult(realmMatchup(r, theirs))} (${books[r]} book${books[r] === 1 ? "" : "s"})`,
    );
    return parts.length > 0 ? parts.join(", ") : "no spellbooks: plain Arcane magic, ×1";
}

/** Each rival, their realms, and how well a profile's books wear down their wards */
export function RivalMatchups(props: { books: Partial<Record<Realm, number>>; rivals: readonly string[]; status?: boolean }) {
    const state = game();
    const current = props.status ? currentRival(state) : null;
    return (
        <>
            <table class="rivals">
                <tbody>
                    {props.rivals.map((w, i) => {
                        const m = matchupFor(props.books, w);
                        return (
                            <tr key={w} class={props.status && isBanished(state, w) ? "done" : w === current ? "current" : ""}>
                                <td>
                                    {i + 1}. <b>{w}</b>
                                </td>
                                <td class="hint">{realmsOf(w)} wards</td>
                                <td>
                                    <Tip tip={matchupDetail(props.books, w)}>
                                        <span class={m > 1.001 ? "good" : m < 0.999 ? "bad" : ""}>{mult(m)}</span>
                                    </Tip>
                                </td>
                                <td class="hint">{fmt(wardStrength(state, w, props.rivals))} strong</td>
                                {props.status && (
                                    <td>{isBanished(state, w) ? <span class="good">banished</span> : w === current ? "now" : "waiting"}</td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <HowItWorks id="contest.matchups">
                How well each of your realms wears down a rival's wards, counted by its share of your books:
                <ul>
                    <li>
                        <b>×{MATCHUP_OPPOSED}</b> against the opposed realm: Life against Death wards and Death against
                        Life, Chaos against Nature and Nature against Chaos
                    </li>
                    <li>
                        <b>×{MATCHUP_SORCERY}</b> Sorcery against any wards that aren't Sorcery's (it's the art of
                        dispelling)
                    </li>
                    <li>
                        <b>×{MATCHUP_SAME}</b> against the rival's own realm: your Life books against a Life wizard's wards
                        (they know its tricks)
                    </li>
                    <li>×1 otherwise. Hover a rival's number for how your books fare against them.</li>
                </ul>
            </HowItWorks>
        </>
    );
}

export function ContestSection() {
    const state = game();
    const stats = getStats(state);
    const a = state.ascension;
    const rival = currentRival(state);
    const rivals = ascensionRivals(state);
    const skill = castingSkill(state);
    const upkeep = upkeepUsed(state);
    const free = freeSkill(state);
    const power = spellPower(state, stats);
    return (
        <section>
            <SectionHead
                title="The wizards' contest"
                value={`${banishedCount(state)} of ${ARCANUS_WIZARDS}`}
                note="rivals banished this Ascension"
            />
            <HowItWorks id="magic.contest">
                Four rival wizards hold Arcanus this Ascension, each behind wards your army cannot cross. Your spell power
                wears them down one at a time, and the progress lasts through Refounds. A banished wizard's domain opens to
                your army, and their Tower of Wizardry is unsealed: the way to Myrror.
            </HowItWorks>
            {rival ? (
                <>
                    <p>
                        Wearing down <b>{rival}</b>'s wards ({realmsOf(rival)}):{" "}
                        <Tip
                            tip={
                                <>
                                    <div>
                                        {fmt(free)} free casting skill × {fmt(stats.get("spell.power"))} spell power ×{" "}
                                        {mult(matchupFor(a.books, rival))} against {rival}
                                    </div>
                                    <BreakdownView stats={stats} stat="spell.power" title="Spell power multiplier" />
                                </>
                            }
                        >
                            <b>{fmt(power)}</b> spell power/s
                        </Tip>{" "}
                        · {power.gt(0) ? `${fmtTime(wardSecondsLeft(state, stats))} left` : "no casting skill free"}
                    </p>
                    <ProgressBar
                        class="wards"
                        fraction={a.wardProgress.div(wardStrength(state, rival)).toNumber()}
                        label={`${fmt(a.wardProgress)} / ${fmt(wardStrength(state, rival))}`}
                    />
                    <p class="hint">Your books against {rival}: {matchupDetail(a.books, rival)}. Instants strike the wards too.</p>
                </>
            ) : (
                <p class="good">Every rival of this Ascension is banished. Instants now strike your army's target.</p>
            )}
            <RivalMatchups books={a.books} rivals={rivals} status />
            <Part title={<>Casting skill <span class="section-value">{fmt(skill)}</span></>}>
            <p>
                Running enchantments take up <b>{fmt(enchantmentsUpkeep(state))}</b>
                {upkeep > enchantmentsUpkeep(state) && (
                    <>
                        {" "}
                        and creatures on Myrror's sites <b>{fmt(upkeep - enchantmentsUpkeep(state))}</b>
                    </>
                )}
                , leaving <b>{fmt(free)}</b> for the contest. Each point of
                casting skill costs more mana than the last; it lasts the whole Ascension.{" "}
                <span class="hint">Next point: {fmt(manaToNextSkill(state))} more mana.</span>
            </p>
            <div class="slider-row">
                <span>Spend {Math.round((1 - a.skillShare) * 100)}%</span>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(a.skillShare * 100)}
                    onInput={(e) => setSkillShare(state, Number((e.target as HTMLInputElement).value) / 100)}
                />
                <span>Train skill {Math.round(a.skillShare * 100)}%</span>
            </div>
            <p class="hint">
                The share of your mana income that trains casting skill; the rest is yours to spend on spells and summons.
            </p>
            </Part>
        </section>
    );
}
