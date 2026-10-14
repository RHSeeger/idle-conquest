/**
 * The Wilds tab (DESIGN.md §17): Myrror's sites, the creatures bound to you,
 * and what the sites have brought back. In the Planes group, after Planes.
 */
import { REALM_DEFS, REALMS, Realm } from "../content/magic";
import { RARITY_NAMES } from "../content/spells";
import { WILDS_TUNING } from "../content/wilds";
import { isBestWildsPick } from "../engine/automation";
import { getStats } from "../engine/collect";
import { fmt, fmtTime } from "../engine/format";
import { castingSkill } from "../engine/wards";
import {
    bindingMult,
    boundRealms,
    counterRealms,
    creaturePower,
    creatureShare,
    creatureSkillShare,
    creatureSpell,
    creaturesOut,
    isCountering,
    sendCreature,
    siteDef,
    siteRewardText,
    siteSecondsLeft,
    siteStrength,
} from "../engine/wilds";
import { AutoToggle } from "./AutoToggle";
import { ProgressBar } from "./components";
import { game } from "./game";
import { Chip, HowItWorks, Notice, Part, SectionHead } from "./kit";

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** The bound creatures: one per realm, what each costs while out, and where it is */
function Creatures() {
    const state = game();
    const stats = getStats(state);
    const m = state.planes.myrror!;
    const bound = boundRealms(state);
    const unbound = REALMS.filter((r) => !m.creatures[r]);
    return (
        <Part title="Bound creatures" note={`${bound.length} of ${REALMS.length} realms`}>
            {bound.length === 0 ? (
                <p class="hint">
                    No creature is bound yet. Research a summoning spell (Magic tab): its creature is bound to you for this Planeshift.
                </p>
            ) : (
                <table class="nodes">
                    <thead>
                        <tr>
                            <th>Realm</th>
                            <th>Creature</th>
                            <th class="num">Power</th>
                            <th class="num">Skill while out</th>
                            <th>Where</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bound.map((r) => {
                            const spell = creatureSpell(state, r)!;
                            const vet = m.creatures[r]!.veteran;
                            const at = m.sites.find((s) => !s.done && s.creature === r);
                            return (
                                <tr key={r}>
                                    <td>
                                        <Chip realm={r}>{REALM_DEFS[r].name}</Chip>
                                    </td>
                                    <td>
                                        {spell.name} <span class="hint">({RARITY_NAMES[spell.rarity]}{vet > 0 ? `, veteran ${vet}` : ""})</span>
                                    </td>
                                    <td class="num">{fmt(creaturePower(state, stats, r))}</td>
                                    <td class="num">{pct(creatureShare(state, r))}</td>
                                    <td>{at ? <b>{siteName(state, m.sites.indexOf(at))}</b> : <span class="hint">idle</span>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            {unbound.length > 0 && bound.length > 0 && (
                <p class="hint">
                    No creature yet for {unbound.map((r) => REALM_DEFS[r].name).join(", ")}: research a summoning spell of that realm in any
                    Ascension of this Planeshift.
                </p>
            )}
        </Part>
    );
}

function siteName(state: ReturnType<typeof game>, k: number): string {
    return siteDef(state, k).name;
}

function SiteCard(props: { k: number }) {
    const state = game();
    const stats = getStats(state);
    const k = props.k;
    const m = state.planes.myrror!;
    const s = m.sites[k];
    const def = siteDef(state, k);
    const strength = siteStrength(k);
    const out = creaturesOut(state);
    const left = siteSecondsLeft(state, stats, k);
    const counters = counterRealms(def.guardian);
    const onPick = (v: string) => sendCreature(state, k, v === "" ? null : (v as Realm));
    return (
        <div class={"card panel-card quest" + (s.creature ? " active" : "")}>
            <div class="card-title">{def.name}</div>
            <div class="card-text hint">{def.text}</div>
            <div class="chips">
                <span class="chips-label">Guarded by</span>
                <Chip realm={def.guardian}>{REALM_DEFS[def.guardian].name}</Chip>
                <span class="chips-label">countered by</span>
                {def.guardian === "sorcery" ? (
                    <span class="hint">anything but Sorcery</span>
                ) : (
                    counters.map((r) => (
                        <Chip key={r} realm={r}>
                            {REALM_DEFS[r].name}
                        </Chip>
                    ))
                )}
            </div>
            <div class="card-text">
                Brings back <b>{siteRewardText(state, k, false)}</b>
                <span class="hint">; with a countering creature {siteRewardText(state, k, true)}</span>
            </div>
            <ProgressBar
                class="quest-progress"
                fraction={s.progress.div(strength).toNumber()}
                label={
                    s.creature
                        ? `${left === Infinity ? "—" : fmtTime(left)} left${isCountering(s.creature, def.guardian) ? " · countered" : ""}`
                        : s.progress.gt(0)
                          ? `${Math.floor(s.progress.div(strength).toNumber() * 100)}%, waiting`
                          : "not started"
                }
            />
            <label class="quest-pick">
                <span class="hint">Sent: </span>
                <select value={s.creature ?? ""} onChange={(e) => onPick((e.target as HTMLSelectElement).value)}>
                    <option value="">nobody (waiting)</option>
                    {boundRealms(state).map((r) => {
                        const spell = creatureSpell(state, r)!;
                        const elsewhere = out.has(r) && s.creature !== r;
                        return (
                            <option key={r} value={r}>
                                {spell.name} ({REALM_DEFS[r].name}){isCountering(r, def.guardian) ? " ★ counters" : ""} ·{" "}
                                {fmtTime(siteSecondsLeft(state, stats, k, r))} · {pct(creatureShare(state, r))} skill
                                {elsewhere ? " (leaves another site)" : ""}
                            </option>
                        );
                    })}
                </select>
            </label>
        </div>
    );
}

export function WildsPanel() {
    const state = game();
    const m = state.planes.myrror;
    if (!m) return <div class="panel" />;
    const done = m.sites.filter((s) => s.done).length;
    const waiting = m.sites.map((s, k) => ({ s, k })).filter(({ s }) => !s.done);
    const share = creatureSkillShare(state);
    const skill = castingSkill(state);
    const idle = boundRealms(state).filter((r) => !creaturesOut(state).has(r));
    return (
        <div class="panel">
            <section>
                <SectionHead title="The Wilds of Myrror" value={`${done} of ${m.sites.length}`} note="sites taken this Planeshift">
                    <AutoToggle kind="wilds" label={isBestWildsPick(state) ? "Auto-send (best creature)" : "Auto-send"} />
                </SectionHead>
                <HowItWorks id="wilds.how">
                    <ul>
                        <li>
                            Off Myrror's frontier lie sites guarded by one realm's magic: {WILDS_TUNING.openAtStart} when Myrror opens, and
                            one more for each Myrran region you take. They wait for you until the next Planeshift.
                        </li>
                        <li>
                            Each summoning spell you research <b>binds a creature</b> of its realm for the rest of the Planeshift (the
                            rarest you know). It stays even when an Ascension forgets the spell, so over a Planeshift you can gather one of
                            every realm, Life and Death both.
                        </li>
                        <li>
                            Send a creature to a site to take it. One whose realm <b>counters the guardian</b> (as in the wizards' contest:
                            Life and Death, Chaos and Nature, Sorcery against anything else) is ×2 faster, or ×1.5 for Sorcery, and brings
                            back more. A guardian's own realm is ×0.5. Every site taken makes its creature a veteran: +
                            {Math.round(WILDS_TUNING.veteran * 100)}% power.
                        </li>
                        <li>
                            <b>A creature out takes casting skill</b>: {pct(WILDS_TUNING.share.common)} for a Common one up to{" "}
                            {pct(WILDS_TUNING.share.veryRare)} for a Very Rare one, which isn't there for enchantments or the wards on
                            Arcanus until it's back. Pact of Binding (Planar Essence) lowers it.
                        </li>
                        <li>
                            Its power is summon power × your army power on Myrror (Essence, works, boons, holdings): Arcanus's army doesn't
                            add to it.
                        </li>
                    </ul>
                </HowItWorks>
                {state.mastery.challenge && (
                    <Notice kind="challenge">The Wilds wait during {state.mastery.challenge}'s challenge, as Myrror does: creatures take no casting skill.</Notice>
                )}
                <p>
                    Creatures out take <b>{pct(share)}</b> of your casting skill ({fmt(skill * share)} of {fmt(skill)}).
                    {bindingMult(state) < 1 && <span class="hint"> Pact of Binding: ×{bindingMult(state).toFixed(2)}.</span>}
                </p>
                <Creatures />
                {waiting.length > 0 && (
                    <Part title="Open sites" note={idle.length > 0 ? `${idle.length} creature${idle.length === 1 ? "" : "s"} idle` : undefined}>
                        <div class="cards">
                            {waiting.map(({ k }) => (
                                <SiteCard key={k} k={k} />
                            ))}
                        </div>
                    </Part>
                )}
                {done > 0 && (
                    <Part title="Taken">
                        <ul class="built">
                            {m.sites.map((s, k) =>
                                s.done ? (
                                    <li key={k}>
                                        <span class="good">✓</span> <b>{siteDef(state, k).name}</b>{" "}
                                        <span class="hint">
                                            brought back {s.brought ?? siteRewardText(state, k, s.matched)}
                                            {s.matched ? " (a countering creature took it)" : ""}
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
