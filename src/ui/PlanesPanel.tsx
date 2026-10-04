/**
 * Layer 3 UI: Planeshift (the reset) and the Myrror campaign.
 */
import { useState } from "preact/hooks";
import { REGION_SIZE } from "../content/frontier";
import {
    ESSENCE_UPGRADES,
    ESSENCE_UPGRADE_ORDER,
    HOLDING_PER_CITY,
    HOLDING_STAT,
    MAX_LINKS,
    myrrorEnd,
    myrrorPlan,
    PLANESHIFT_MILESTONES,
    SHARE_PER_LINK,
} from "../content/myrror";
import { MyrranRaceId, MYRROR_RING, RACES, RaceId } from "../content/races";
import { maxMyrrorShare, myrrorShare } from "../engine/army";
import { planeshiftProgress } from "../engine/ascension";
import { getStats } from "../engine/collect";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import {
    buyEssenceUpgrade,
    canBuyEssenceUpgrade,
    canPlaneshift,
    essenceOnPlaneshift,
    essenceUpgradeCost,
    essenceUpgradeLevel,
    fitProfile,
    isMyrrorOpen,
    myrrorPower,
    myrrorTarget,
    planeshift,
    setArmyShare,
} from "../engine/planes";
import { profileText } from "./AscensionPanel";
import { ProgressBar, Tip } from "./components";
import { game } from "./game";
import { TRAITS } from "../content/traits";

function PlaneshiftSection() {
    const state = game();
    const pl = state.planes;
    const gate = planeshiftProgress(state);
    const [beachhead, setBeachhead] = useState<MyrranRaceId>(pl.myrror?.beachhead ?? "dwarf");
    const races = state.prestige.annals;
    const [race, setRace] = useState<RaceId>(state.run.startingRace);
    const startRace = races.includes(race) ? race : races[0];
    const essence = essenceOnPlaneshift(state);
    const profile = fitProfile(state.ascension.planBooks, state.ascension.planRetorts);
    const check = (ok: boolean) => <span class={ok ? "good" : "bad"}>{ok ? "✓" : "✗"}</span>;

    const doShift = () => {
        const text = [
            `Planeshift, opening Myrror among the ${RACES[beachhead].plural}?`,
            `Your realm, Fame, refounds, Insight, Insight upgrades, Ascensions and spells reset${pl.myrror ? ", and so does this Myrror campaign" : ""}.`,
            `You stay a Wizard (${profileText(profile.books, profile.retorts)}) and gain ${fmtInt(essence)} Planar Essence.`,
        ].join("\n\n");
        if (confirm(text)) planeshift(state, beachhead, startRace);
    };

    return (
        <section>
            <h2>Planeshift</h2>
            <p class="hint">
                Towers of Wizardry stand where the walls between the worlds are thin. Through them lies <b>Myrror</b>.
                Planeshifting starts everything below over, but from then on you fight on two planes at once: your
                Arcanus realm keeps looping (Refound, Ascend) while part of its army pushes a Myrror campaign that
                lasts until the next Planeshift.
            </p>
            <ul class="gate">
                <li>{check(gate.towerCleared)} Clear a Tower of Wizardry this run (found by expeditions, wizards only)</li>
                <li>{check(gate.riteKnown)} Research the Rite of the Tower (Arcane; Plane Shift halves its cost)</li>
            </ul>
            <h3>Myrran beachhead</h3>
            <p class="hint">Where your Myrror campaign begins. It decides the order you meet Myrror's races and wizards.</p>
            <div class="race-choice">
                {MYRROR_RING.map((r) => (
                    <button key={r} class={"toggle" + (beachhead === r ? " on" : "")} onClick={() => setBeachhead(r)}>
                        {RACES[r].plural}
                    </button>
                ))}
            </div>
            <p class="hint">{RACES[beachhead].description}</p>
            <h3>Arcanus starting race</h3>
            <div class="race-choice">
                {races.map((r) => (
                    <button key={r} class={"toggle" + (startRace === r ? " on" : "")} onClick={() => setRace(r)}>
                        {RACES[r].plural}
                    </button>
                ))}
            </div>
            <p>
                Wizard profile: <b>{profileText(profile.books, profile.retorts)}</b>{" "}
                <span class="hint">(your planned profile from the Ascension tab, fitted to a fresh Planeshift's picks)</span>
            </p>
            <button class="prestige-button planeshift" disabled={!canPlaneshift(state)} onClick={doShift}>
                Planeshift (+{fmtInt(essence)} Planar Essence)
            </button>
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

    return (
        <section>
            <h2>
                Myrror <span class="count">· city {m.index + 1} of {myrrorEnd(plan)}</span>
            </h2>
            <div class="slider-row">
                <span>Arcanus {Math.round((1 - share) * 100)}%</span>
                <input
                    type="range"
                    min={0}
                    max={Math.round(max * 100)}
                    step={5}
                    value={Math.round(share * 100)}
                    onInput={(e) => setArmyShare(state, Number((e.target as HTMLInputElement).value) / 100)}
                />
                <span>Myrror {Math.round(share * 100)}%</span>
            </div>
            <p class="hint">
                Planar links: <b>{m.links}</b> of {MAX_LINKS} (each Tower of Wizardry cleared this Planeshift adds one).
                Each link lets {SHARE_PER_LINK * 100}% of your army fight on Myrror{max > SHARE_PER_LINK * m.links && ", plus Planar Anchor"}:
                at most {Math.round(max * 100)}% now. The rest besieges Arcanus and raids its lairs.
            </p>
            {target ? (
                <div class="target orders">
                    <div class="target-head">
                        <span class="orders-verb">Besieging</span> <b>{target.name}</b> · {RACES[target.race].adjective}
                        {target.isRegionCapital && <span class="tag">region capital</span>}
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
                            Too strong for now. Myrror moves when your Arcanus army is strong: late in each run, and more
                            with every Ascension. Siege progress here is never lost between runs.
                        </p>
                    )}
                </div>
            ) : (
                <div class="wall">You hold all of Myrror.</div>
            )}
            <div class="regions">
                {plan.map((r) => (
                    <span key={r.index} class={"region " + (r.index < regionIdx ? "done" : r.index === regionIdx ? "current" : "")}>
                        {r.name}
                    </span>
                ))}
            </div>
            <h3>Holdings</h3>
            {Object.keys(m.holdings).length === 0 ? (
                <p class="hint">No Myrran cities yet. Each one you take is held until the next Planeshift.</p>
            ) : (
                <table>
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
    return (
        <section>
            <h2>
                Planar Essence <span class="essence">{fmtInt(pl.essence)}</span>{" "}
                <span class="count">
                    · {pl.planeshifts} Planeshift{pl.planeshifts === 1 ? "" : "s"} · {fmtInt(pl.essenceTotal)} earned in total
                </span>
            </h2>
            <p class="hint">
                Essence on Planeshift = (Myrran cities taken by force ÷ 4)^1.3 × (1 + 0.25 per Myrran race held) × (1 +
                Myrran wizards banished).
            </p>
            <div class="cards">
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
            <h3>Planeshift milestones</h3>
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
        </section>
    );
}

export function PlanesPanel() {
    const state = game();
    return (
        <div class="panel">
            {isMyrrorOpen(state) && <MyrrorSection />}
            <PlaneshiftSection />
            {state.planes.planeshifts > 0 && <EssenceSection />}
        </div>
    );
}
