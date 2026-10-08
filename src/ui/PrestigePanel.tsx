import { useState } from "preact/hooks";
import { FAME_BRANCH_NAMES, FAME_UPGRADES, FAME_UPGRADE_ORDER, FameBranch, MILESTONES } from "../content/fame";
import { regionPlan } from "../content/frontier";
import { ARCANUS_RING, RACES, RaceId } from "../content/races";
import { nextRaceRegions } from "../engine/army";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import {
    buyFameUpgrade,
    canBuyFameUpgrade,
    canRefound,
    earnsMastery,
    effectiveRefounds,
    fameOnRefound,
    fameWithFullTribute,
    tributeSecondsLeft,
    fameUpgradeCost,
    fameUpgradeLevel,
    scoutingInUse,
    setScoutingUse,
    MAX_RACE_MASTERY,
    refound,
    refoundRequirementText,
    renownFraction,
    renownLimit,
    RENOWN_PER_FAME,
    TRIBUTE_SECONDS,
    TRIBUTE_SHARE,
    tributeShare,
} from "../engine/prestige";
import { SCOUTING_ALL } from "../engine/state";
import { game } from "./game";
import { AutoMode, AutoPrestige, AutoToggle, ModeOption } from "./AutoToggle";
import { isAutomationUnlocked, nextFameChronicleStep } from "../engine/automation";
import { heroRefoundText } from "./HeroesSection";

function RefoundSection() {
    const state = game();
    const p = state.prestige;
    const [choice, setChoice] = useState<RaceId>(state.run.startingRace);
    const fame = fameOnRefound(state);
    const ok = canRefound(state);
    // races conquered this run become available too
    const options = [...new Set([...p.annals, ...(ok ? state.run.racesConquered : [])])];
    const raceForPlan = options.includes(choice) ? choice : options[0];
    const plan = regionPlan(raceForPlan, nextRaceRegions(state));

    const doRefound = () => {
        const full = fameWithFullTribute(state);
        const gain =
            (fame.gt(0) ? `for +${fmtInt(fame)} Fame` : "for no Fame") +
            (full.gt(fame) ? ` (waiting ${fmtTime(tributeSecondsLeft(state))} for the full tribute would give ${fmtInt(full)})` : "") +
            (earnsMastery(state) ? "" : `, and no Mastery for the ${RACES[state.run.startingRace].plural} (no city taken by force)`);
        if (confirm(`Refound your civilization as ${RACES[raceForPlan].plural}? This run's progress will be reset ${gain}.`)) {
            refound(state, raceForPlan);
        }
    };
    const run = state.run;
    const tribute = tributeShare(state);
    const fullTribute = fameWithFullTribute(state);

    return (
        <section>
            <h2>Refound</h2>
            <p class="hint">
                Abandon this realm and found a new one. Your conquests become <b>Fame</b>, every race you conquered joins
                the <b>Annals</b>, and you may start as any race in them. Each starting race meets different
                neighbours.
            </p>
            {!ok && <p class="bad">Requirement: {refoundRequirementText()}</p>}
            <div class="row">
                <span>
                    Fame on Refound: <b class="fame">{fmtInt(fame)}</b>
                </span>
            </div>
            <ul class="fame-sources hint">
                <li>
                    Population taken by force: <b>{fmtInt(run.conqueredPop * 1000)}</b>
                </li>
                {run.surrenderedPop > 0 && (
                    <li>
                        Population that surrendered to your Renown: {fmtInt(run.surrenderedPop * 1000)}, paying{" "}
                        <b>{Math.round(tribute * 100)}%</b> as tribute
                        {tribute < TRIBUTE_SHARE && ` (rising to ${TRIBUTE_SHARE * 100}% after ${TRIBUTE_SECONDS / 60} minutes of the run)`}
                    </li>
                )}
                <li>
                    Races conquered this run: <b>{run.racesConquered.length}</b> (+{run.racesConquered.length * 25}% Fame)
                </li>
                <li>Fame = (counted population ÷ 8,000)^0.9 × the race bonus × Fame multipliers.</li>
            </ul>
            {ok && fullTribute.gt(fame) && (
                <p class="hint">
                    Tribute is still building up: Refounding in {fmtTime(tributeSecondsLeft(state))} would give{" "}
                    <b class="fame">{fmtInt(fullTribute)}</b> Fame from what you hold now (more if you take more cities).
                </p>
            )}
            {ok && !earnsMastery(state) && (
                <p class="hint">
                    No city taken by force yet this run: Refounding now won't add Mastery for the{" "}
                    {RACES[run.startingRace].plural} or replace your Chronicle (the build order and army that automation
                    follows).
                </p>
            )}
            {run.heroes.length > 0 && <p class="hint">{heroRefoundText(state)}</p>}
            {ok && fullTribute.lte(0) && (
                <p class="bad">
                    This run would give no Fame: take cities by force first. You can still Refound, for example to
                    start over as a different race.
                </p>
            )}
            <div class="race-choice">
                {options.map((r) => (
                    <button key={r} class={"toggle" + (raceForPlan === r ? " on" : "")} onClick={() => setChoice(r)}>
                        {RACES[r].plural}
                        {(p.raceMastery[r] ?? 0) > 0 && <span class="hint"> ★{p.raceMastery[r]}</span>}
                        {!p.annals.includes(r) && <span class="tag">new</span>}
                    </button>
                ))}
            </div>
            <p class="hint">
                Starting as {RACES[raceForPlan].plural}: {RACES[raceForPlan].cityEffectText.toLowerCase()}; realm bonus{" "}
                {RACES[raceForPlan].realmEffectText.toLowerCase()}. Frontier: {plan.map((r) => r.name).join(" → ")}
            </p>
            <button class="prestige-button" disabled={!ok} onClick={doRefound}>
                Refound as {RACES[raceForPlan].plural} (+{fmtInt(fame)} Fame)
            </button>
            <AutoPrestige kind="refound" />
        </section>
    );
}

const FAME_MODES: ModeOption<"chronicle" | "cheapest">[] = [
    { value: "chronicle", label: "Chronicle", tip: "Replay the order you bought Fame upgrades in during your last Ascension, then cheapest first" },
    { value: "cheapest", label: "Cheapest", tip: "Always buy the cheapest affordable Fame upgrade" },
];

/** Auto-buy for Fame upgrades (Royal Stewards): toggle, mode, and what it will buy next */
function FameAutoBuy() {
    const state = game();
    if (!isAutomationUnlocked(state, "fame")) return null;
    const auto = state.automation;
    const chronicle = state.ascension.fameChronicle;
    const next = auto.fameMode === "chronicle" ? nextFameChronicleStep(state) : null;
    let status: string;
    if (auto.fameMode === "cheapest") {
        status = "Buys the cheapest affordable upgrade whenever it can.";
    } else if (chronicle.length === 0) {
        status = "No Fame Chronicle yet (it's recorded when you Ascend), so it buys the cheapest first for now.";
    } else if (next === null) {
        status = `Last Ascension's ${chronicle.length} purchases are all bought again; now buying the cheapest first.`;
    } else {
        status = `Replaying last Ascension's ${chronicle.length} purchases. Next: ${FAME_UPGRADES[next].name} (✦ ${fameUpgradeCost(state, next)}).`;
    }
    return (
        <div class="row auto-prestige">
            <AutoToggle kind="fame" label="Auto-buy" />
            <AutoMode kind="fame" value={auto.fameMode} options={FAME_MODES} onChange={(m) => (auto.fameMode = m)} />
            <span class="hint">{status}</span>
        </div>
    );
}

function FameTree() {
    const state = game();
    const p = state.prestige;
    const branches: FameBranch[] = ["economy", "warfare", "legacy"];
    return (
        <section>
            <h2>
                Fame <span class="fame">{fmtInt(p.fame)}</span>{" "}
                <span class="count">
                    · {fmtInt(p.fameTotal)} earned in total: ×{fmt(p.fameTotal.times(RENOWN_PER_FAME).plus(1))} production,
                    gold, knowledge and army power
                </span>
            </h2>
            {p.fameDebt.gt(0) && (
                <p class="hint">
                    Enduring Legacy: your Fame upgrades were kept through the Ascension. Earned Fame repays them first:{" "}
                    <b class="fame">{fmtInt(p.fameDebt)}</b> still to go before you can buy more.
                </p>
            )}
            <FameAutoBuy />
            <div class="fame-branches">
                {branches.map((branch) => (
                    <div key={branch} class="fame-branch">
                        <h3>{FAME_BRANCH_NAMES[branch]}</h3>
                        {FAME_UPGRADE_ORDER.filter((id) => FAME_UPGRADES[id].branch === branch).map((id) => {
                            const u = FAME_UPGRADES[id];
                            const level = fameUpgradeLevel(state, id);
                            const maxed = level >= u.maxLevel;
                            const card = (
                                <button
                                    key={id}
                                    class="card"
                                    disabled={!canBuyFameUpgrade(state, id)}
                                    onClick={() => buyFameUpgrade(state, id)}
                                >
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
                                        {maxed ? <span class="hint">maxed</span> : <span class="price fame">✦ {fameUpgradeCost(state, id)}</span>}
                                    </div>
                                </button>
                            );
                            return id === "scouting" && level > 0 ? (
                                <div key={id}>
                                    {card}
                                    <ScoutingUse />
                                </div>
                            ) : (
                                card
                            );
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
}

/** Far Scouting: how many of its levels to use (fewer regions = the Fortresses sooner, e.g. for challenges) */
function ScoutingUse() {
    const state = game();
    const owned = fameUpgradeLevel(state, "scouting");
    const use = state.prestige.scoutingUse;
    const now = scoutingInUse(state);
    const next = Math.min(owned, use);
    return (
        <div class="scouting-use">
            <span class="hint">Use:</span>{" "}
            {Array.from({ length: owned + 1 }, (_, l) => (
                <button key={l} class={"toggle" + (Math.min(use, owned) === l ? " on" : "")} onClick={() => setScoutingUse(state, l === owned ? SCOUTING_ALL : l)}>
                    {l === owned ? `all (${l})` : l}
                </button>
            ))}
            <div class="hint">
                {now === next
                    ? `${now} extra region${now === 1 ? "" : "s"} this realm.`
                    : `${now} extra region${now === 1 ? "" : "s"} this realm; ${next} from the next Refound.`}{" "}
                Fewer regions reach the rival wizards sooner (handy for challenges).
            </div>
        </div>
    );
}

function Milestones() {
    const state = game();
    const p = state.prestige;
    return (
        <section>
            <h2>
                Milestones{" "}
                <span class="count">
                    · {p.refounds} refounds
                    {effectiveRefounds(state) > p.refounds && ` (counted as ${effectiveRefounds(state)} thanks to Ascension milestones)`}
                </span>
            </h2>
            <ul class="milestones">
                {MILESTONES.map((m) => (
                    <li key={m.id} class={effectiveRefounds(state) >= m.refounds ? "done" : ""}>
                        <b>
                            {m.refounds} refound{m.refounds > 1 ? "s" : ""}: {m.name}
                        </b>{" "}
                        — {m.text}
                    </li>
                ))}
            </ul>
            {renownFraction(state) > 0 && (
                <p class="hint">
                    Renown: the first {renownLimit(state)} frontier cities surrender at once ({Math.round(renownFraction(state) * 100)}% of
                    your best frontier {state.ascension.ascensions > 0 ? "this Ascension" : "so far"}, {p.ascensionBestFrontier}).
                    Surrendered cities pay Fame as tribute: up to {TRIBUTE_SHARE * 100}% of their population, building up
                    over the first {TRIBUTE_SECONDS / 60} minutes of a run.
                </p>
            )}
        </section>
    );
}

function Annals() {
    const state = game();
    const p = state.prestige;
    return (
        <section>
            <h2>
                Annals{" "}
                <span class="count">
                    · {p.annals.length} of {ARCANUS_RING.length} races of Arcanus
                </span>
            </h2>
            <table>
                <thead>
                    <tr>
                        <th>Race</th>
                        <th>Mastery</th>
                        <th>In cities of this race</th>
                        <th>Realm bonus while held</th>
                    </tr>
                </thead>
                <tbody>
                    {ARCANUS_RING.map((r) => {
                        const known = p.annals.includes(r);
                        const mastery = p.raceMastery[r] ?? 0;
                        return (
                            <tr key={r} class={known ? "" : "unknown"}>
                                <td>{known ? RACES[r].plural : "???"}</td>
                                <td>{known ? "★".repeat(mastery) + "☆".repeat(MAX_RACE_MASTERY - mastery) : ""}</td>
                                <td>{known ? RACES[r].cityEffectText : ""}</td>
                                <td>{known ? RACES[r].realmEffectText : ""}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p class="hint">Mastery grows by one each time you Refound after a run as that race that took at least one city by force: ×1.1 production and +0.5 max population per star, in that race's cities.</p>
        </section>
    );
}

export function PrestigePanel() {
    return (
        <div class="panel">
            <RefoundSection />
            <FameTree />
            <Milestones />
            <Annals />
        </div>
    );
}
