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
    fameRate,
    fameWithFullTribute,
    tributeSecondsLeft,
    fameUpgradeCost,
    fameUpgradeLevel,
    fameUpgradesWork,
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
import { Tip } from "./components";
import { askConfirm } from "./Confirm";
import { game } from "./game";
import { AutoMode, AutoPrestige, AutoToggle, ModeOption } from "./AutoToggle";
import { isAutomationUnlocked, nextFameChronicleStep } from "../engine/automation";
import { heroRefoundText } from "./HeroesSection";
import { Checklist, Chip, ChoiceBox, HowItWorks, Notice, Part, SectionHead } from "./kit";
import { KingdomSections } from "./KingdomSections";
import { GameState } from "../engine/state";
import { ascensionRivals } from "../engine/wards";
import { fameEchoAmount } from "../engine/ascension";

/**
 * When to Refound: Fame per minute of this kingdom if you Refounded now, against
 * its best so far. Past the peak, each minute here earns less than a fresh
 * kingdom would (§14 A2).
 */
function FameRate() {
    const state = game();
    const run = state.run;
    const now = fameRate(state) * 60;
    const best = run.bestFameRate * 60;
    const past = now < best * 0.9;
    return (
        <Tip tip="Fame on Refound ÷ how long this kingdom has lasted. It usually climbs, peaks, then falls as cities get harder: Refounding around the peak gets the most Fame per minute (auto-Refound uses its own threshold).">
            <span class="hint">
                <b>{fmt(now)}</b> Fame/min now, best <b>{fmt(best)}</b> at {fmtTime(run.bestFameRateAt)}
                {past ? <span class="insight"> (past its peak: a good time to Refound)</span> : ""}
            </span>
        </Tip>
    );
}

function RefoundSection() {
    const state = game();
    const p = state.prestige;
    const [choice, setChoice] = useState<RaceId>(state.run.startingRace);
    const fame = fameOnRefound(state);
    const ok = canRefound(state);
    // races conquered this run become available too
    const options = [...new Set([...p.annals, ...(ok ? state.run.racesConquered : [])])];
    const raceForPlan = options.includes(choice) ? choice : options[0];
    const plan = regionPlan(raceForPlan, nextRaceRegions(state), ascensionRivals(state).slice(0, 1), p.routeMemory[raceForPlan] ?? []);

    const doRefound = () => {
        const full = fameWithFullTribute(state);
        askConfirm({
            title: `Refound as ${RACES[raceForPlan].plural}?`,
            tone: "refound",
            confirm: fame.gt(0) ? `Refound (+${fmtInt(fame)} Fame)` : "Refound (no Fame)",
            body: [
                `This kingdom's progress is reset ${fame.gt(0) ? `for +${fmtInt(fame)} Fame` : "for no Fame"}.`,
                full.gt(fame) ? `Waiting ${fmtTime(tributeSecondsLeft(state))} for the full tribute would give ${fmtInt(full)}.` : "",
                earnsMastery(state) ? "" : `No Mastery for the ${RACES[state.run.startingRace].plural}: no city was taken by force.`,
            ],
            onConfirm: () => refound(state, raceForPlan),
        });
    };
    const run = state.run;
    const tribute = tributeShare(state);
    const fullTribute = fameWithFullTribute(state);

    return (
        <section>
            <SectionHead title="Refound" value={<span class="fame">+{fmtInt(fame)} ✦</span>} note="Fame on Refounding now">
                <AutoToggle kind="refound" label="Auto-Refound" />
            </SectionHead>
            {ok && run.bestFameRate > 0 && (
                <p class="row">
                    <FameRate />
                </p>
            )}
            <HowItWorks id="kingdom.refound">
                Abandon this kingdom and found a new one. Your conquests become <b>Fame</b>, every race you conquered joins
                the <b>Annals</b>, and you may start as any race in them. Each starting race meets different neighbours.
            </HowItWorks>
            {!ok && <Checklist title="To Refound" items={[{ ok: false, text: refoundRequirementText() }]} />}

            <Part title="Where this kingdom's Fame comes from">
                <ul class="fame-sources">
                    <li>
                        Population taken by force: <b>{fmtInt(run.conqueredPop * 1000)}</b>
                    </li>
                    {run.surrenderedPop > 0 && (
                        <li>
                            Population that surrendered to your Renown: <b>{fmtInt(run.surrenderedPop * 1000)}</b>, paying{" "}
                            <b>{Math.round(tribute * 100)}%</b> as tribute
                            {tribute < TRIBUTE_SHARE && (
                                <span class="hint">
                                    {" "}
                                    (rising to {TRIBUTE_SHARE * 100}% after {TRIBUTE_SECONDS / 60} minutes of the kingdom)
                                </span>
                            )}
                        </li>
                    )}
                    <li>
                        Races conquered in this kingdom: <b>{run.racesConquered.length}</b>{" "}
                        <span class="hint">(+{run.racesConquered.length * 25}% Fame)</span>
                    </li>
                </ul>
                <p class="hint">Fame = (counted population ÷ 8,000)^0.9 × the race bonus × Fame multipliers.</p>
                {ok && fullTribute.gt(fame) && (
                    <Notice kind="info">
                        Tribute is still building up: Refounding in {fmtTime(tributeSecondsLeft(state))} would give{" "}
                        <b class="fame">{fmtInt(fullTribute)}</b> Fame from what you hold now (more if you take more cities).
                    </Notice>
                )}
                {ok && !earnsMastery(state) && (
                    <Notice kind="info">
                        No city taken by force yet in this kingdom: Refounding now won't add Mastery for the{" "}
                        {RACES[run.startingRace].plural} or replace your Chronicle (the build order and army that automation
                        follows).
                    </Notice>
                )}
                {ok && fullTribute.lte(0) && (
                    <Notice kind="warn">
                        This kingdom would give no Fame: take cities by force first. You can still Refound, for example to
                        start over as a different race.
                    </Notice>
                )}
            </Part>

            <Part title="Next kingdom">
                <h4>Starting race</h4>
                <div class="race-choice">
                    {options.map((r) => (
                        <button key={r} class={"toggle" + (raceForPlan === r ? " on" : "")} onClick={() => setChoice(r)}>
                            {RACES[r].plural}
                            {(p.raceMastery[r] ?? 0) > 0 && <span class="hint"> ★{p.raceMastery[r]}</span>}
                            {!p.annals.includes(r) && <span class="tag">new</span>}
                        </button>
                    ))}
                </div>
                <ChoiceBox tone="fame" label={`Starting as ${RACES[raceForPlan].plural}`}>
                    <div class="chips">
                        <Chip tone="fame" title="In cities of this race">
                            Cities: {RACES[raceForPlan].cityEffectText}
                        </Chip>
                        <Chip tone="fame" title="For the whole kingdom while you hold cities of this race">
                            Kingdom: {RACES[raceForPlan].realmEffectText}
                        </Chip>
                    </div>
                    <p class="hint">Frontier: {plan.map((r) => r.name).join(" → ")}</p>
                </ChoiceBox>
                {run.heroes.length > 0 && <p class="hint">{heroRefoundText(state)}</p>}
            </Part>

            <div class="action">
                <button class="prestige-button" disabled={!ok} onClick={doRefound}>
                    Refound as {RACES[raceForPlan].plural} (+{fmtInt(fame)} Fame)
                </button>
                <AutoPrestige kind="refound" toggle={false} />
            </div>
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
    const working = fameUpgradesWork(state);
    // only until the first Refound: after that the starting Fame is long mixed in
    const echo = p.refounds === 0 && state.ascension.ascensions > 0 ? fameEchoAmount(state) : null;
    return (
        <section>
            <SectionHead
                title="Fame"
                value={<span class="fame">{fmtInt(p.fame)} ✦</span>}
                note={`${fmtInt(p.fameTotal)} earned in total: ×${fmt(p.fameTotal.times(RENOWN_PER_FAME).plus(1))} production, gold, knowledge and army power`}
            />
            {echo?.gt(0) && (
                <Notice kind="info">
                    Echo of Glory (Ascension milestone): this Ascension began with <b class="fame">{fmtInt(echo)}</b> Fame, a
                    quarter of the {fmtInt(state.ascension.lastFameEarned)} you earned in the last one. It's yours to spend,
                    but it wasn't earned in this Ascension, so it doesn't count toward the total or its bonus.
                </Notice>
            )}
            {p.fameDebt.gt(0) && (
                <Notice kind="info">
                    Enduring Legacy: your Fame upgrades were kept through the Ascension. Earned Fame repays them first:{" "}
                    <b class="fame">{fmtInt(p.fameDebt)}</b> still to go before you can buy more.
                </Notice>
            )}
            {!working && (
                <Notice kind="challenge">
                    <b>Off during {state.mastery.challenge}'s challenge:</b> Fame upgrades do nothing until it ends. You can
                    still buy them. Fame itself still counts (Renown, above).
                </Notice>
            )}
            <FameAutoBuy />
            <div class={"fame-branches" + (working ? "" : " off")}>
                {branches.map((branch) => (
                    <div key={branch} class="fame-branch">
                        <h3>{FAME_BRANCH_NAMES[branch]}</h3>
                        {FAME_UPGRADE_ORDER.filter((id) => FAME_UPGRADES[id].branch === branch).map((id) => {
                            const u = FAME_UPGRADES[id];
                            const level = fameUpgradeLevel(state, id);
                            const maxed = level >= u.maxLevel;
                            const buyable = canBuyFameUpgrade(state, id);
                            const content = (
                                <>
                                    <div class="card-title">
                                        {u.name}{" "}
                                        <span class="count">
                                            {level}/{u.maxLevel}
                                        </span>
                                        {!working && level > 0 && <span class="off-tag">off</span>}
                                    </div>
                                    <div class="card-text">
                                        {u.text(level)}
                                        {!maxed && <> → {u.text(level + 1)}</>}
                                    </div>
                                    <div class="card-cost">
                                        {maxed ? <span class="hint">maxed</span> : <span class="price fame">✦ {fameUpgradeCost(state, id)}</span>}
                                    </div>
                                </>
                            );
                            // Far Scouting holds its own "Using" buttons, which can't sit inside a (possibly disabled) button
                            if (id === "scouting" && level > 0) {
                                return (
                                    <div
                                        key={id}
                                        class={"card card-button" + (buyable ? "" : " disabled")}
                                        onClick={() => buyable && buyFameUpgrade(state, id)}
                                    >
                                        {content}
                                        <ScoutingUse />
                                    </div>
                                );
                            }
                            return (
                                <button key={id} class="card" disabled={!buyable} onClick={() => buyFameUpgrade(state, id)}>
                                    {content}
                                </button>
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
    const regions = (n: number) => `${n} extra region${n === 1 ? "" : "s"}`;
    const tip = (
        <>
            How many of Far Scouting's levels to use. Fewer regions reach the rival wizards sooner (handy for
            challenges). A change applies from the next Refound (or any reset), not to this kingdom. This kingdom:{" "}
            {regions(now)}.
        </>
    );
    return (
        // clicks here choose a level; they don't buy the upgrade
        <div class="scouting-use" onClick={(e) => e.stopPropagation()}>
            <Tip tip={tip}>
                <span class="hint">Using:</span>{" "}
                {Array.from({ length: owned + 1 }, (_, l) => (
                    <button
                        key={l}
                        class={"toggle" + (next === l ? " on" : "")}
                        onClick={() => setScoutingUse(state, l === owned ? SCOUTING_ALL : l)}
                    >
                        {l === owned ? `all (${l})` : l}
                    </button>
                ))}
            </Tip>
            {now !== next && <div class="hint">This kingdom: {regions(now)}; {next} from the next Refound.</div>}
        </div>
    );
}

function Milestones() {
    const state = game();
    const p = state.prestige;
    return (
        <section>
            <SectionHead
                title="Milestones"
                note={
                    `${p.refounds} refounds` +
                    (effectiveRefounds(state) > p.refounds ? ` (counted as ${effectiveRefounds(state)} thanks to Ascension milestones)` : "")
                }
            />
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
                    over the first {TRIBUTE_SECONDS / 60} minutes of a kingdom.
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
            <SectionHead title="Annals" note={`${p.annals.length} of ${ARCANUS_RING.length} races of Arcanus`} />
            <table>
                <thead>
                    <tr>
                        <th>Race</th>
                        <th>Mastery</th>
                        <th>In cities of this race</th>
                        <th>Kingdom bonus while held</th>
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
            <p class="hint">Mastery grows by one each time you Refound after a kingdom of that race that took at least one city by force: ×1.1 production and +0.5 max population per star, in that race's cities.</p>
        </section>
    );
}

/** Refounding comes up once it's possible, or once it has been done (the first kingdom has enough to take in) */
export function isRefoundShown(state: GameState): boolean {
    return canRefound(state) || state.prestige.refounds > 0 || state.ascension.ascensions > 0;
}

/** The Kingdom tab: the kingdom itself, then the Refound that ends it (as Ascension and Planes do for their layers) */
export function PrestigePanel() {
    const state = game();
    return (
        <div class="panel">
            <KingdomSections />
            {isRefoundShown(state) && (
                <>
                    <RefoundSection />
                    <FameTree />
                    <Milestones />
                    <Annals />
                </>
            )}
        </div>
    );
}
