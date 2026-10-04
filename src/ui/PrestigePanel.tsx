import { useState } from "preact/hooks";
import { FAME_BRANCH_NAMES, FAME_UPGRADES, FAME_UPGRADE_ORDER, FameBranch, MILESTONES } from "../content/fame";
import { regionPlan } from "../content/frontier";
import { ARCANUS_RING, RACES, RaceId } from "../content/races";
import { raceRegions } from "../engine/army";
import { fmt, fmtInt } from "../engine/format";
import {
    buyFameUpgrade,
    canBuyFameUpgrade,
    canRefound,
    fameOnRefound,
    fameUpgradeCost,
    fameUpgradeLevel,
    MAX_RACE_MASTERY,
    refound,
    refoundRequirementText,
    renownFraction,
    renownLimit,
    RENOWN_PER_FAME,
} from "../engine/prestige";
import { game } from "./game";

function RefoundSection() {
    const state = game();
    const p = state.prestige;
    const [choice, setChoice] = useState<RaceId>(state.run.startingRace);
    const fame = fameOnRefound(state);
    const ok = canRefound(state);
    // races conquered this run become available too
    const options = [...new Set([...p.annals, ...(ok ? state.run.racesConquered : [])])];
    const raceForPlan = options.includes(choice) ? choice : options[0];
    const plan = regionPlan(raceForPlan, raceRegions(state));

    const doRefound = () => {
        if (confirm(`Refound your civilization as ${RACES[raceForPlan].plural}? This run's progress will be reset for +${fmtInt(fame)} Fame.`)) {
            refound(state, raceForPlan);
        }
    };

    return (
        <section>
            <h2>Refound</h2>
            <p class="hint">
                Abandon this realm and found a new one. Your conquests become <b>Fame</b>, every race you conquered joins
                the <b>Annals</b>, and you may start as any race in them. Each starting race meets different
                neighbours.
            </p>
            {!ok && <p class="bad">{refoundRequirementText()}</p>}
            <div class="row">
                <span>
                    Fame on Refound: <b class="fame">{fmtInt(fame)}</b>
                </span>
                <span class="hint">
                    · conquered population {state.run.conqueredPop} · races this run {state.run.racesConquered.length}
                </span>
            </div>
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
            <button class="prestige-button" disabled={!ok || fame.lte(0)} onClick={doRefound}>
                Refound as {RACES[raceForPlan].plural} (+{fmtInt(fame)} Fame)
            </button>
        </section>
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
            <div class="fame-branches">
                {branches.map((branch) => (
                    <div key={branch} class="fame-branch">
                        <h3>{FAME_BRANCH_NAMES[branch]}</h3>
                        {FAME_UPGRADE_ORDER.filter((id) => FAME_UPGRADES[id].branch === branch).map((id) => {
                            const u = FAME_UPGRADES[id];
                            const level = fameUpgradeLevel(state, id);
                            const maxed = level >= u.maxLevel;
                            return (
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
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
}

function Milestones() {
    const state = game();
    const p = state.prestige;
    return (
        <section>
            <h2>
                Milestones <span class="count">· {p.refounds} refounds</span>
            </h2>
            <ul class="milestones">
                {MILESTONES.map((m) => (
                    <li key={m.id} class={p.refounds >= m.refounds ? "done" : ""}>
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
                    your best frontier, {p.bestFrontier}).
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
            <p class="hint">Mastery grows by one each time you complete a run as that race: ×1.1 production and +0.5 max population per star, in that race's cities.</p>
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
