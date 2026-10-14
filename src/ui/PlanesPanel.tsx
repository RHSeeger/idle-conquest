/**
 * Layer 3 UI: Planeshift (the reset) and the Myrror campaign.
 */
import { useState } from "preact/hooks";
import { REGION_SIZE } from "../content/frontier";
import { isAutomationUnlocked } from "../engine/automation";
import { AutoToggle } from "./AutoToggle";
import {
    boonDef,
    CAPITAL_YIELD,
    CITY_YIELD,
    ESSENCE_UPGRADES,
    ESSENCE_UPGRADE_ORDER,
    EXCHANGE_RATE,
    TRIBUTE_PER_HOUR,
    HOLDING_PER_CITY,
    HOLDING_STAT,
    MAX_LINKS,
    MYRRAN_RESOURCES,
    MYRRAN_WORK_ORDER,
    MYRRAN_WORKS,
    MyrranResource,
    myrrorEnd,
    myrrorPlan,
    MYRROR_TOWERS,
    PLANESHIFT_MILESTONES,
    RESOURCE_DEFS,
    RESOURCE_OF_RACE,
    SHARE_PER_LINK,
    towersTaken,
} from "../content/myrror";
import { MyrranRaceId, MYRROR_RING, RACES, RaceId } from "../content/races";
import { maxMyrrorShare, myrrorShare, planarLinks } from "../engine/army";
import { upperLayersOff } from "../engine/upgradeLevels";
import { planeshiftProgress } from "../engine/ascension";
import { getStats } from "../engine/collect";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import {
    armySentToMyrror,
    autoBuysWork,
    planarCapacity,
    setAutoBuysWork,
    SHARED_WORK_GROWTH,
    boonCounts,
    buyEssenceUpgrade,
    buyMyrranWork,
    canBuyEssenceUpgrade,
    canBuyMyrranWork,
    chooseBoon,
    myrranWorkCost,
    myrranWorkLevel,
    canPlaneshift,
    essenceBreakdown,
    EssenceBreakdown,
    essenceUpgradeCost,
    essenceUpgradeLevel,
    fitProfile,
    isMyrrorOpen,
    myrrorPower,
    myrrorTarget,
    planeshift,
    setArmyShare,
    canExchange,
    exchangeResources,
    tributePerHour,
} from "../engine/planes";
import { ProfileChips, profileText } from "./AscensionPanel";
import { Checklist, Chip, ChoiceBox, HowItWorks, Notice, Part, SectionHead } from "./kit";
import { ProgressBar, RegionList, Tip } from "./components";
import { askConfirm } from "./Confirm";
import { game } from "./game";
import { TRAITS } from "../content/traits";

/** How the Planar Essence on Planeshifting is worked out, factor by factor */
function EssenceSum(props: { b: EssenceBreakdown }) {
    const b = props.b;
    return (
        <table class="prestige-sum">
            <tbody>
                {b.first ? (
                    <tr>
                        <td>First Planeshift</td>
                        <td class="hint">no Myrror campaign yet: a fixed amount</td>
                        <td class="num" />
                    </tr>
                ) : (
                    <>
                        <tr>
                            <td>Myrran cities taken</td>
                            <td class="hint">({fmtInt(b.taken)} ÷ 4)^1.3</td>
                            <td class="num">{fmt(b.base)}</td>
                        </tr>
                        <tr>
                            <td>Myrran races held</td>
                            <td class="hint">1 + 0.25 × {b.races}</td>
                            <td class="num">×{fmt(b.racesMult)}</td>
                        </tr>
                        <tr>
                            <td>Myrran wizards banished</td>
                            <td class="hint">1 + {b.wizards}</td>
                            <td class="num">×{fmt(b.wizardsMult)}</td>
                        </tr>
                        {b.sitesMult > 1 && (
                            <tr>
                                <td>Myrror's sites</td>
                                <td class="hint">1 + {Math.round((b.sitesMult - 1) * 100)}% (Wilds tab)</td>
                                <td class="num">×{fmt(b.sitesMult)}</td>
                            </tr>
                        )}
                    </>
                )}
                <tr class="total">
                    <td>Planar Essence on Planeshifting</td>
                    <td class="hint" />
                    <td class="num essence">{fmtInt(b.total)}</td>
                </tr>
            </tbody>
        </table>
    );
}

function PlaneshiftSection() {
    const state = game();
    const pl = state.planes;
    const gate = planeshiftProgress(state);
    const [beachhead, setBeachhead] = useState<MyrranRaceId>(pl.myrror?.beachhead ?? "dwarf");
    const races = state.prestige.annals;
    const [race, setRace] = useState<RaceId>(state.run.startingRace);
    const startRace = races.includes(race) ? race : races[0];
    const breakdown = essenceBreakdown(state);
    const essence = breakdown.total;
    const profile = fitProfile(state.ascension.planBooks, state.ascension.planRetorts);

    const doShift = () => {
        askConfirm({
            title: "Planeshift?",
            tone: "planeshift",
            confirm: `Planeshift (+${fmtInt(essence)} Essence)`,
            body: [
                `Myrror opens among the ${RACES[beachhead].plural}.`,
                `Your kingdom, Fame, refounds, Insight, Insight upgrades, Ascensions and spells reset${pl.myrror ? ", and so does this Myrror campaign (with its resources, works and boons)" : ""}.`,
                `You stay a Wizard (${profileText(profile.books, profile.retorts)}).`,
                <EssenceSum b={breakdown} />,
            ],
            onConfirm: () => planeshift(state, beachhead, startRace),
        });
    };

    return (
        <section>
            <SectionHead
                title="Planeshift"
                value={<span class="essence">+{fmtInt(essence)} ❖</span>}
                note={gate.ready ? "Planar Essence on Planeshifting now" : "Planar Essence, once you can Planeshift"}
            />
            <HowItWorks id="planes.planeshift">
                Towers of Wizardry stand where the walls between the worlds are thin. Through them lies <b>Myrror</b>.
                Planeshifting starts everything below over, but from then on you fight on two planes at once: your Arcanus
                kingdoms keep coming and going (Refound, Ascend) while part of its army pushes a Myrror campaign that lasts
                until the next Planeshift.
            </HowItWorks>
            <Checklist
                title="To Planeshift"
                items={[
                    { ok: gate.towerUnsealed, text: "Banish a rival wizard of Arcanus, which unseals their Tower of Wizardry (Magic tab)" },
                    { ok: gate.riteKnown, text: "Research the Rite of the Tower (Arcane; Plane Shift halves its cost)" },
                ]}
            />

            <Part title="Next Planeshift">
                <h4>Myrran beachhead</h4>
                <p class="hint">Where your Myrror campaign begins: you meet its race first, then their neighbours.</p>
                <div class="race-choice">
                    {MYRROR_RING.map((r) => (
                        <button key={r} class={"toggle" + (beachhead === r ? " on" : "")} onClick={() => setBeachhead(r)}>
                            {RACES[r].plural}
                        </button>
                    ))}
                </div>
                <ChoiceBox tone="essence" label={`Beachhead: ${RACES[beachhead].plural}`}>
                    <p>{RACES[beachhead].description}</p>
                    <div class="chips">
                        <Chip tone="essence">
                            {RESOURCE_DEFS[RESOURCE_OF_RACE[beachhead]].icon} {RESOURCE_DEFS[RESOURCE_OF_RACE[beachhead]].name}
                        </Chip>
                        <Chip tone="essence" title="Each city of theirs you hold (stacking)">
                            ×{1 + HOLDING_PER_CITY} {HOLDING_STAT[beachhead].text} per city held
                        </Chip>
                        <Chip tone="essence">Unit: {MYRRAN_UNIT[beachhead]}</Chip>
                    </div>
                </ChoiceBox>

                <h4>Arcanus starting race</h4>
                <div class="race-choice">
                    {races.map((r) => (
                        <button key={r} class={"toggle" + (startRace === r ? " on" : "")} onClick={() => setRace(r)}>
                            {RACES[r].plural}
                        </button>
                    ))}
                </div>

                <h4>Wizard profile</h4>
                <div class="chips">
                    <ProfileChips books={profile.books} retorts={profile.retorts} familiar={null} />
                </div>
                <p class="hint">Your planned profile from the Ascension tab, fitted to a fresh Planeshift's picks.</p>
            </Part>

            <div class="action">
                <EssenceSum b={breakdown} />
                <button class="prestige-button planeshift" disabled={!canPlaneshift(state)} onClick={doShift}>
                    Planeshift (+{fmtInt(essence)} Planar Essence)
                </button>
                {state.mastery.challenge && <Notice kind="challenge">Not during {state.mastery.challenge}'s challenge.</Notice>}
            </div>
        </section>
    );
}

function MyrrorSection() {
    const state = game();
    const stats = getStats(state);
    const m = state.planes.myrror!;
    const plan = myrrorPlan(m.beachhead);
    const target = myrrorTarget(state);
    const power = target ? myrrorPower(state, stats, target.traits) : null;
    const eta = target && power && power.gt(0) ? target.defense.minus(m.siege).div(power).toNumber() : Infinity;
    const regionIdx = Math.floor(m.index / REGION_SIZE);
    const max = maxMyrrorShare(state);
    const share = myrrorShare(state);
    const links = planarLinks(state);
    const sent = target ? armySentToMyrror(state, stats, target.traits) : null;
    const capacity = planarCapacity(state, m.index);
    const capped = sent !== null && sent.gt(capacity);
    const towersLeft = MYRROR_TOWERS - towersTaken(plan, m.index);

    return (
        <section>
            <SectionHead
                title="Myrror"
                value={target ? `city ${target.index + 1} of ${myrrorEnd(plan)}` : "every city held"}
                note={`${links} of ${MAX_LINKS} planar links`}
            />
            <PendingBoons />
            {state.mastery.challenge && (
                <Notice kind="challenge">
                    <b>Paused during {state.mastery.challenge}'s challenge:</b> a challenge is one Ascension of Arcanus, so
                    the whole army fights there and Myrror's siege waits. Its works, boons and holdings do nothing until
                    it ends. The split you set comes back then.
                </Notice>
            )}
            <Part title="Your army on Myrror">
            <div class="slider-row">
                <span>Arcanus {Math.round((1 - share) * 100)}%</span>
                <input
                    type="range"
                    min={0}
                    max={Math.round(max * 100)}
                    step={5}
                    disabled={!!state.mastery.challenge}
                    value={Math.round(share * 100)}
                    onInput={(e) => setArmyShare(state, Number((e.target as HTMLInputElement).value) / 100)}
                />
                <span>Myrror {Math.round(share * 100)}%</span>
            </div>
            <p>
                Your <b>{links}</b> planar link{links === 1 ? "" : "s"} carry at most <b>{fmt(capacity)}</b> power/s to this
                city
                {sent !== null && (
                    <>
                        ; you send <b class={capped ? "bad" : ""}>{fmt(sent)}</b>
                        {capped ? ", more than they carry: the rest is wasted, and would fight better on Arcanus" : ""}
                    </>
                )}
                .
            </p>
            <HowItWorks id="planes.links">
                Your power reaches Myrror only through the Towers of Wizardry. Each Tower you take on Myrror is another
                link{towersLeft > 0 ? ` (${towersLeft} more to take)` : ""}
                {myrranWorkLevel(state, "planarGate") > 0 && ", and so is each Planar Gate"}. Each link also lets{" "}
                {SHARE_PER_LINK * 100}% of your army fight there{max > SHARE_PER_LINK * links && ", plus Planar Anchor"}: at most{" "}
                {Math.round(max * 100)}% now. The rest besieges Arcanus and raids its lairs. Army power on Myrror boosts
                (Essence, works, boons, holdings) act on what gets through.
            </HowItWorks>
            </Part>
            <Part title="Siege">
            {target ? (
                <div class="target orders">
                    <div class="target-head">
                        <span class="orders-verb">Besieging</span> <b>{target.name}</b> · {RACES[target.race].adjective}
                        {target.isRegionCapital && <span class="tag">region capital</span>}
                        {target.tower && <span class="tag">a new planar link</span>}
                        <span class="traits">
                            {target.traits.map((t) => (
                                <Tip key={t} tip={TRAITS[t].description}>
                                    <span class="trait">{TRAITS[t].name}</span>
                                </Tip>
                            ))}
                        </span>
                        <span class="target-def">Defense {fmt(target.defense)}</span>
                    </div>
                    <ProgressBar
                        fraction={m.siege.div(target.defense).toNumber()}
                        label={
                            power && power.gt(0)
                                ? `Siege ${fmt(m.siege)} / ${fmt(target.defense)} · ${fmt(power)}/s · ${eta > 86400 ? "more than a day" : fmtTime(eta)}`
                                : "Send part of the army to Myrror (slider above)"
                        }
                    />
                    {eta > 86400 && power && power.gt(0) && (
                        <p class="hint">
                            Too strong for now.{" "}
                            {capped
                                ? "Your links are full: more Towers, Planar Gates, and army power on Myrror (Essence, works, boons) move it."
                                : "Myrror moves when your Arcanus army is strong: late in each kingdom, and more with every Ascension."}{" "}
                            Siege progress here is never lost between kingdoms.
                        </p>
                    )}
                </div>
            ) : (
                <div class="wall">
                    <b>The edge of Myrror</b>
                    <p>Every city of Myrror is yours, and is held until the next Planeshift.</p>
                </div>
            )}
            <RegionList plan={plan} current={regionIdx} />
            </Part>
            <Part title="Holdings">
            {Object.keys(m.holdings).length === 0 ? (
                <p class="hint">No Myrran cities yet. Each one you take is held until the next Planeshift.</p>
            ) : (
                <table class={upperLayersOff(state) ? "holdings off" : "holdings"}>
                    <thead>
                        <tr>
                            <th>Race</th>
                            <th class="num">Cities</th>
                            <th>Bonus</th>
                            <th>Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MYRROR_RING.filter((r) => (m.holdings[r] ?? 0) > 0).map((r) => (
                            <tr key={r}>
                                <td>{RACES[r].plural}</td>
                                <td class="num">{m.holdings[r]}</td>
                                <td>
                                    ×{fmt(1 + HOLDING_PER_CITY * (m.holdings[r] ?? 0))} {HOLDING_STAT[r].text}
                                </td>
                                <td class="hint">{MYRRAN_UNIT[r]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {m.wizardsDefeated.length > 0 && <p>Myrran wizards banished: {m.wizardsDefeated.join(", ")}</p>}
            </Part>
        </section>
    );
}

/** Boon choices waiting at taken capitals and Fortresses */
function PendingBoons() {
    const state = game();
    const pending = state.planes.myrror?.pendingBoons ?? [];
    if (pending.length === 0) return null;
    const p = pending[0];
    return (
        <div class="boon-choice">
            <div>
                <b>{p.from}</b> offers a boon. Choose one{" "}
                <span class="hint">
                    (lasts until the next Planeshift{pending.length > 1 ? ` · ${pending.length - 1} more waiting` : ""})
                </span>
            </div>
            <div class="cards">
                {p.options.map((id, i) => {
                    const b = boonDef(id);
                    if (!b) return null;
                    return (
                        <button key={id} class="card" onClick={() => chooseBoon(state, 0, i as 0 | 1)}>
                            <div class="card-title">
                                {b.name} <span class="count">{b.grant ? "now" : b.side ? `for ${b.side === "arcanus" ? "Arcanus" : "Myrror"}` : "lasting"}</span>
                            </div>
                            <div class="card-text">{b.text}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function Resources() {
    const state = game();
    const m = state.planes.myrror!;
    return (
        <span class="myrran-resources">
            {MYRRAN_RESOURCES.map((r) => {
                const tribute = tributePerHour(state, r);
                return (
                    <span key={r} class={"myrran " + r} title={tribute > 0 ? `Tribute from the cities you hold: +${fmt(tribute)} an hour` : undefined}>
                        {RESOURCE_DEFS[r].icon} {RESOURCE_DEFS[r].name} <b>{Math.floor(m.resources[r])}</b>
                        {tribute > 0 && <span class="hint"> +{fmt(tribute)}/h</span>}
                    </span>
                );
            })}
        </span>
    );
}

/** The planar exchange: EXCHANGE_RATE of one Myrran resource for 1 of another (Planes and Forge tabs) */
export function ResourceExchange() {
    const state = game();
    const [from, setFrom] = useState<MyrranResource>("adamantium");
    const [to, setTo] = useState<MyrranResource>("crysx");
    const m = state.planes.myrror;
    if (!m) return null;
    const pick = (value: MyrranResource, set: (r: MyrranResource) => void) => (
        <select value={value} onChange={(e) => set((e.target as HTMLSelectElement).value as MyrranResource)}>
            {MYRRAN_RESOURCES.map((r) => (
                <option key={r} value={r}>
                    {RESOURCE_DEFS[r].icon} {RESOURCE_DEFS[r].name}
                </option>
            ))}
        </select>
    );
    const most = Math.floor(m.resources[from] / EXCHANGE_RATE);
    return (
        <div class="row exchange">
            <span class="hint">Planar exchange: {EXCHANGE_RATE}</span>
            {pick(from, setFrom)}
            <span class="hint">for 1</span>
            {pick(to, setTo)}
            <button disabled={!canExchange(state, from, to, 1)} onClick={() => exchangeResources(state, from, to, 1)}>
                Trade {EXCHANGE_RATE} → 1
            </button>
            <button disabled={!canExchange(state, from, to, 10)} onClick={() => exchangeResources(state, from, to, 10)}>
                {EXCHANGE_RATE * 10} → 10
            </button>
            {from === to ? <span class="hint">pick two different resources</span> : most > 0 && <span class="hint">up to {most}</span>}
        </div>
    );
}

const RESOURCE_RACES = (r: MyrranResource) =>
    MYRROR_RING.filter((race) => RESOURCE_OF_RACE[race] === r)
        .map((race) => RACES[race].plural)
        .join(" and ");

/** Myrran resources, the works they buy, and the boons chosen this Planeshift */
function MyrranRiches() {
    const state = game();
    const m = state.planes.myrror!;
    const counts = boonCounts(state);
    const repeat = state.automation.repeatBoons;
    const off = upperLayersOff(state);
    return (
        <section>
            <SectionHead title="Myrran works" value={<Resources />}>
                <AutoToggle kind="works" label="Auto-buy" />
            </SectionHead>
            <HowItWorks id="planes.works">
                <ul>
                    <li>
                        Each Myrran city you take yields {CITY_YIELD} of its race's resource; region capitals and Fortresses
                        yield {CAPITAL_YIELD}.
                        <ul>
                            {MYRRAN_RESOURCES.map((r) => (
                                <li key={r}>
                                    {RESOURCE_DEFS[r].icon} {RESOURCE_DEFS[r].name} comes from {RESOURCE_RACES(r)}
                                </li>
                            ))}
                        </ul>
                    </li>
                    <li>
                        Every Myrran city you hold also pays <b>tribute</b>: {TRIBUTE_PER_HOUR} of its race's resource an hour, while the
                        frontier stalls and after all of Myrror is yours.
                    </li>
                    <li>
                        The <b>planar exchange</b> trades {EXCHANGE_RATE} of one resource for 1 of another, for when your Myrror is short
                        of one. Works and artifacts share the same resources.
                    </li>
                    <li>Planeshifting clears your works, along with the rest of the Myrror campaign.</li>
                    <li>
                        Each resource buys two works. A level of either makes both ×{SHARED_WORK_GROWTH} dearer (Planar
                        Gate's own price rises faster), so choose which one to grow.
                    </li>
                    {isAutomationUnlocked(state, "works") && (
                        <li>
                            Auto-buy buys the works ticked "auto", cheapest first, whenever it can afford one. Untick the
                            ones you'd rather not grow.
                        </li>
                    )}
                </ul>
            </HowItWorks>
            {off && (
                <Notice kind="challenge">
                    <b>Off during {state.mastery.challenge}'s challenge:</b> Myrran works and boons do nothing until it
                    ends. You can still buy works.
                </Notice>
            )}
            <ResourceExchange />
            <div class={"cards" + (off ? " off" : "")}>
                {MYRRAN_WORK_ORDER.map((id) => {
                    const w = MYRRAN_WORKS[id];
                    const level = myrranWorkLevel(state, id);
                    const maxed = level >= w.maxLevel;
                    return (
                        <div key={id} class="card-wrap">
                        <button class="card" disabled={!canBuyMyrranWork(state, id)} onClick={() => buyMyrranWork(state, id)}>
                            <div class="card-title">
                                {w.name}{" "}
                                <span class="count">
                                    {level}/{w.maxLevel}
                                </span>
                                {off && level > 0 && <span class="off-tag">off</span>}
                            </div>
                            <div class="card-text">
                                {w.text(level)}
                                {!maxed && <> → {w.text(level + 1)}</>}
                            </div>
                            <div class="card-cost">
                                {maxed ? (
                                    <span class="hint">maxed</span>
                                ) : (
                                    <span class={"price myrran " + w.resource}>
                                        {RESOURCE_DEFS[w.resource].icon} {myrranWorkCost(state, id)}
                                    </span>
                                )}
                            </div>
                        </button>
                        {isAutomationUnlocked(state, "works") && (
                            <label class="loadout">
                                <input
                                    type="checkbox"
                                    checked={autoBuysWork(state, id)}
                                    onChange={(e) => setAutoBuysWork(state, id, (e.target as HTMLInputElement).checked)}
                                />{" "}
                                auto
                            </label>
                        )}
                        </div>
                    );
                })}
            </div>
            <Part title="Boons" note={`${m.boons.length} chosen this Planeshift`}>
            <HowItWorks id="planes.boons">
                Each region capital you take offers two boons of its race: one for Arcanus, one for Myrror. A banished
                Myrran wizard offers their vaults or their spellbooks.
            </HowItWorks>
            {m.boons.length > 0 && (
                <ul class={"boons" + (off ? " off" : "")}>
                    {Object.entries(counts).map(([id, n]) => {
                        const b = boonDef(id);
                        return (
                            b && (
                                <li key={id}>
                                    <b>{b.name}</b>
                                    {n > 1 && ` ×${n}`}: {b.text}
                                </li>
                            )
                        );
                    })}
                </ul>
            )}
            <div class="row auto-prestige">
                <button class={"toggle auto" + (repeat ? " on" : "")} onClick={() => (state.automation.repeatBoons = !repeat)}>
                    Repeat boon choices: {repeat ? "on" : "off"}
                </button>
                <span class="hint">
                    {repeat
                        ? "A capital or Fortress you've chosen for before gets the same boon again (also in later Planeshifts). New ones still ask."
                        : "Every capital and Fortress asks you to choose."}
                </span>
            </div>
            </Part>
        </section>
    );
}

const MYRRAN_UNIT: Record<MyrranRaceId, string> = {
    beastmen: "Manticore Riders (needs Stables)",
    darkElf: "Nightblades",
    draconian: "Doom Drakes (needs Stables)",
    dwarf: "Steam Cannons",
    klackon: "Stag Beetles",
    troll: "War Trolls",
};

function EssenceSection() {
    const state = game();
    const pl = state.planes;
    const off = upperLayersOff(state);
    return (
        <section>
            <SectionHead
                title="Planar Essence"
                value={<span class="essence">{fmtInt(pl.essence)} ❖</span>}
                note={`${pl.planeshifts} Planeshift${pl.planeshifts === 1 ? "" : "s"} · ${fmtInt(pl.essenceTotal)} earned in total`}
            />
            <p class="hint">
                Essence on Planeshift = (Myrran cities taken by force ÷ 4)^1.3 × (1 + 0.25 per Myrran race held) × (1 +
                Myrran wizards banished).
            </p>
            {off && (
                <Notice kind="challenge">
                    <b>Off during {state.mastery.challenge}'s challenge:</b> Essence upgrades do nothing until it ends
                    (Astral Archivists' auto-buy still works). You can still buy them.
                </Notice>
            )}
            <div class={"cards" + (off ? " off" : "")}>
                {ESSENCE_UPGRADE_ORDER.map((id) => {
                    const u = ESSENCE_UPGRADES[id];
                    const level = essenceUpgradeLevel(state, id);
                    const maxed = level >= u.maxLevel;
                    return (
                        <button key={id} class="card" disabled={!canBuyEssenceUpgrade(state, id)} onClick={() => buyEssenceUpgrade(state, id)}>
                            <div class="card-title">
                                {u.name}{" "}
                                <span class="count">
                                    {level}/{u.maxLevel}
                                </span>
                                {off && level > 0 && id !== "astralArchivists" && id !== "questingLodge" && id !== "planarHuntsmen" && id !== "artificersGuild" && <span class="off-tag">off</span>}
                            </div>
                            <div class="card-text">
                                {u.text(level)}
                                {!maxed && <> → {u.text(level + 1)}</>}
                            </div>
                            <div class="card-cost">
                                {maxed ? <span class="hint">maxed</span> : <span class="price essence">❖ {essenceUpgradeCost(state, id)}</span>}
                            </div>
                        </button>
                    );
                })}
            </div>
            <Part title="Planeshift milestones">
                <ul class="milestones">
                    {PLANESHIFT_MILESTONES.map((m) => (
                        <li key={m.id} class={pl.planeshifts >= m.planeshifts ? "done" : ""}>
                            <b>
                                {m.planeshifts} Planeshift{m.planeshifts > 1 ? "s" : ""}: {m.name}
                            </b>{" "}
                            — {m.text}
                        </li>
                    ))}
                </ul>
            </Part>
        </section>
    );
}

export function PlanesPanel() {
    const state = game();
    return (
        <div class="panel">
            {isMyrrorOpen(state) && <MyrrorSection />}
            {isMyrrorOpen(state) && <MyrranRiches />}
            <PlaneshiftSection />
            {state.planes.planeshifts > 0 && <EssenceSection />}
        </div>
    );
}
