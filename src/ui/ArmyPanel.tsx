import { LAIRS } from "../content/exploration";
import { frontierCity, frontierEnd, REGION_SIZE } from "../content/frontier";
import { RACES } from "../content/races";
import { ROLE_NAMES, ROLES, TraitId, TRAITS, traitRoleMult } from "../content/traits";
import { DRILL_STEP, UNITS } from "../content/units";
import { buyUnits, unitsWanted } from "../engine/actions";
import { availableUnits, currentPlan, currentTarget, powerByRole, siegePower, unitPower } from "../engine/army";
import { getStats } from "../engine/collect";
import { unitAffordable, unitPrice, wallet } from "../engine/costs";
import { ZERO } from "../engine/decimal";
import { unitPowerStat } from "../engine/effects";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import { GameState, Settings } from "../engine/state";
import { AUTO_RAID_SECONDS, isAutomationUnlocked, isRecruitBudgeted } from "../engine/automation";
import { hasMilestone } from "../engine/prestige";
import { isExplorationUnlocked, lairPower, lairTarget, setArmyTarget, siteName } from "../engine/exploration";
import { isWizard } from "../engine/magic";
import { AutoMode, AutoToggle } from "./AutoToggle";
import { HeroesSection } from "./HeroesSection";
import { BreakdownView, Price, ProgressBar, Tip } from "./components";
import { game } from "./game";

const BUY_AMOUNTS: Settings["buyAmount"][] = [1, 10, 100, "next", "max"];
const RECRUIT_SHARES = [0.1, 0.25, 0.5, 0.75, 1];

/** One line saying what the army is doing right now (also used in the resource bar) */
export function armyActivity(state: GameState): string {
    const stats = getStats(state);
    const raiding = lairTarget(state);
    if (raiding) {
        const power = siegePower(state, stats, raiding.traits);
        const eta = power.gt(0) ? raiding.defense!.minus(state.run.lairSiege).div(power).toNumber() : Infinity;
        return `Raiding the ${siteName(raiding)} · ${fmtTime(eta)}`;
    }
    const target = currentTarget(state);
    if (!target) return "Halted at a rival wizard's wards";
    const power = siegePower(state, stats, target.traits);
    if (power.lte(0)) return "Idle: train troops";
    const eta = target.defense.minus(state.run.frontier.siege).div(power).toNumber();
    return `Besieging ${target.name} · ${fmtTime(eta)}`;
}

function CurrentOrders() {
    const state = game();
    const stats = getStats(state);
    const run = state.run;
    const raiding = lairTarget(state);
    const target = currentTarget(state);

    if (raiding) {
        const power = siegePower(state, stats, raiding.traits);
        const eta = power.gt(0) ? raiding.defense!.minus(run.lairSiege).div(power).toNumber() : Infinity;
        return (
            <div class="target orders">
                <div class="target-head">
                    <span class="orders-verb">Raiding</span> the <b>{siteName(raiding)}</b>
                    <TraitList traits={raiding.traits} />
                    <button class="toggle" onClick={() => setArmyTarget(state, null)}>
                        Recall to the frontier
                    </button>
                </div>
                <ProgressBar
                    fraction={run.lairSiege.div(raiding.defense!).toNumber()}
                    label={`${fmt(run.lairSiege)} / ${fmt(raiding.defense!)} · ${fmt(power)}/s · ${fmtTime(eta)}`}
                />
                <p class="hint">
                    Then back to the frontier{target ? ` (${target.name}: siege progress there is kept)` : ""}.
                </p>
            </div>
        );
    }

    if (!target) {
        const plan = currentPlan(state);
        const wizardRegion = plan.find((r) => r.kind === "wizard") ?? plan[plan.length - 1];
        return (
            <div class="wall">
                <b>{wizardRegion.name}</b>
                <p>
                    Your armies stand before a rival wizard's domain. Mortal soldiers cannot pass the wards that guard
                    it. Only a wizard could break them. Lairs can still be raided (Exploration tab).
                </p>
            </div>
        );
    }

    const power = siegePower(state, stats, target.traits);
    const eta = power.gt(0) ? target.defense.minus(run.frontier.siege).div(power).toNumber() : Infinity;
    return (
        <div class="target orders">
            <div class="target-head">
                <span class="orders-verb">Besieging</span> <b>{target.name}</b> · {RACES[target.race].adjective}
                {target.isRegionCapital && <span class="tag">region capital</span>}
                <TraitList traits={target.traits} />
                <span class="target-def">Defense {fmt(target.defense)}</span>
            </div>
            <ProgressBar
                fraction={run.frontier.siege.div(target.defense).toNumber()}
                label={
                    power.gt(0)
                        ? `Siege ${fmt(run.frontier.siege)} / ${fmt(target.defense)} · ${fmt(power)}/s · ${fmtTime(eta)}`
                        : "Train troops to besiege this city"
                }
            />
        </div>
    );
}

function TraitList(props: { traits: readonly TraitId[] }) {
    if (props.traits.length === 0) return <span class="hint"> · no special defenses</span>;
    return (
        <span class="traits">
            {props.traits.map((t) => (
                <Tip key={t} tip={TRAITS[t].description}>
                    <span class="trait">{TRAITS[t].name}</span>
                </Tip>
            ))}
        </span>
    );
}

/** Lairs (Exploration tab): where else the army could be. Raid orders and the auto-raid rule live here. */
export function Lairs() {
    const state = game();
    const run = state.run;
    const raiding = lairTarget(state);
    const lairs = run.sites.filter((s) => s.kind === "lair" && !s.cleared);
    const cleared = run.sites.filter((s) => s.kind === "lair" && s.cleared).length;
    const autoOn = isAutomationUnlocked(state, "lairs") && state.automation.lairs;
    if (!isExplorationUnlocked(state)) return null;
    const raidPower = raiding ? lairPower(state, raiding) : ZERO;
    const raidFraction = raiding ? Math.min(1, run.lairSiege.div(raiding.defense!).toNumber()) : 0;
    const raidSecondsLeft =
        raiding && raidPower.gt(0) ? raiding.defense!.minus(run.lairSiege).div(raidPower).toNumber() : Infinity;

    return (
        <section>
            <h2>
                Monster lairs <AutoToggle kind="lairs" label="Auto-raid" />
                <span class="count"> · {cleared} cleared this run</span>
            </h2>
            <p class="hint">
                {autoOn
                    ? `Auto-raid sends the army to the quickest lair it can clear in under ${fmtTime(AUTO_RAID_SECONDS)}, then back to the frontier. Slower lairs are left for you (or for a stronger army).`
                    : isAutomationUnlocked(state, "lairs")
                      ? "Auto-raid is off. Raid lairs by hand."
                      : "Raid lairs by hand. Auto-raid unlocks at 2 Refounds."}{" "}
                While raiding, the frontier siege pauses (its progress is kept); the Army tab shows the raid's progress.
            </p>
            {raiding ? (
                <p>
                    Your army is raiding the <b>{siteName(raiding)}</b>: <b>{fmtTime(raidSecondsLeft)}</b> left (
                    {Math.floor(raidFraction * 100)}%).{" "}
                    <button class="toggle" onClick={() => setArmyTarget(state, null)}>
                        Recall to the frontier
                    </button>
                </p>
            ) : (
                lairs.length > 0 && <p class="hint">Your army is at the frontier, not raiding.</p>
            )}
            {lairs.length === 0 ? (
                <p class="hint">No lairs to raid. Expeditions find more.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Lair</th>
                            <th>Monsters</th>
                            <th class="num">Defense</th>
                            <th class="num">Time to clear</th>
                            <th>Treasure</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {lairs.map((site) => {
                            const def = LAIRS[site.type];
                            const power = lairPower(state, site);
                            const seconds = power.gt(0) ? site.defense!.div(power).toNumber() : Infinity;
                            const isTarget = raiding?.index === site.index;
                            return (
                                <tr key={site.index} class={isTarget ? "current" : ""}>
                                    <td>{def.name}</td>
                                    <td>
                                        <TraitList traits={site.traits} />
                                    </td>
                                    <td class="num">{fmt(site.defense!)}</td>
                                    <td class="num">
                                        {isTarget ? `${fmtTime(raidSecondsLeft)} left` : fmtTime(seconds)}
                                        {autoOn && !isTarget && (
                                            <span class={seconds <= AUTO_RAID_SECONDS ? "good" : "hint"}>
                                                {seconds <= AUTO_RAID_SECONDS ? " · auto" : " · too slow for auto"}
                                            </span>
                                        )}
                                    </td>
                                    <td class="hint">
                                        {def.bookChance >= 1 ? "Spellbook, treasure" : `Treasure, ${Math.round(def.bookChance * 100)}% spellbook`}
                                    </td>
                                    <td>
                                        {isTarget ? (
                                            <span class="good">raiding · {Math.floor(raidFraction * 100)}%</span>
                                        ) : (
                                            <button onClick={() => setArmyTarget(state, site.index)}>Raid</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </section>
    );
}

function Campaign() {
    const state = game();
    const plan = currentPlan(state);
    const target = currentTarget(state);
    const run = state.run;
    const regionIdx = target ? Math.floor(target.index / REGION_SIZE) : plan.length;
    const upcoming = target
        ? [1, 2, 3, 4].map((i) => frontierCity(run.startingRace, plan, target.index + i, isWizard(state))).filter((c) => c !== null)
        : [];

    return (
        <section>
            <h2>
                Campaign{" "}
                {target && (
                    <span class="count">
                        · city {target.index + 1} of {frontierEnd(plan, isWizard(state))}
                    </span>
                )}
            </h2>
            <CurrentOrders />
            <div class="regions">
                {plan.map((r) => (
                    <span key={r.index} class={"region " + (r.index < regionIdx ? "done" : r.index === regionIdx ? "current" : "")}>
                        {r.name}
                    </span>
                ))}
            </div>
            {upcoming.length > 0 && (
                <div class="upcoming">
                    <span class="hint">Next on the frontier: </span>
                    {upcoming.map((c) => (
                        <span key={c!.index} class="upcoming-city">
                            {c!.name} ({fmt(c!.defense)}
                            {c!.traits.length > 0 && ", " + c!.traits.map((t) => TRAITS[t].name).join(", ")})
                        </span>
                    ))}
                </div>
            )}
        </section>
    );
}

function Troops() {
    const state = game();
    const stats = getStats(state);
    const target = currentTarget(state);
    const traits = target?.traits ?? [];
    const amount = state.settings.buyAmount;
    const units = availableUnits(state);
    const byRole = powerByRole(state, stats);

    if (units.length === 0) {
        return (
            <section>
                <h2>Troops</h2>
                <p class="hint">Build a Barracks to train troops.</p>
            </section>
        );
    }

    return (
        <section>
            <h2>
                Troops <AutoToggle kind="units" label="Auto-recruit" />
                <AutoMode
                    kind="units"
                    value={state.automation.unitMode}
                    onChange={(m) => (state.automation.unitMode = m)}
                    options={[
                        { value: "efficient", label: "Most efficient", tip: "Best power per cost against the current target" },
                        { value: "chronicle", label: "Chronicle", tip: "Rebuild your last run's army mix" },
                    ]}
                />
                {hasMilestone(state, "quartermasters") && (
                    <span class="auto-budget">
                        Budget{" "}
                        <select
                            title="Share of the production, gold and mana you gain that auto-recruit may spend"
                            value={String(state.automation.recruitShare)}
                            onChange={(e) => (state.automation.recruitShare = Number((e.target as HTMLSelectElement).value))}
                        >
                            {RECRUIT_SHARES.map((s) => (
                                <option key={s} value={String(s)}>
                                    {s >= 1 ? "everything" : `${s * 100}% of income`}
                                </option>
                            ))}
                        </select>
                    </span>
                )}
            </h2>
            {isRecruitBudgeted(state) && (
                <p class="hint">
                    Auto-recruit saves {state.automation.recruitShare * 100}% of the production, gold
                    {isWizard(state) && " and mana"} you gain as an army budget, and only spends that; the rest is yours.
                    Budget now: <b>{fmt(state.run.recruitBudget.production)}</b> production,{" "}
                    <b>{fmt(state.run.recruitBudget.gold)}</b> gold
                    {isWizard(state) && (
                        <>
                            , <b>{fmt(state.run.recruitBudget.mana)}</b> mana
                        </>
                    )}
                    {!state.automation.units && " (only builds up while auto-recruit is on)"}.
                </p>
            )}
            <div class="row">
                <span class="hint">Buy:</span>
                {BUY_AMOUNTS.map((a) => (
                    <button
                        key={String(a)}
                        class={"toggle" + (amount === a ? " on" : "")}
                        onClick={() => (state.settings.buyAmount = a)}
                        title={
                            a === "next"
                                ? `Buy up to the next ${DRILL_STEP}-owned milestone, where power doubles (fewer if you can't afford them all)`
                                : a === "max"
                                  ? "Buy as many as you can afford"
                                  : `Buy up to ${a} (fewer if you can't afford them all)`
                        }
                    >
                        {a === "max" ? "Max" : a === "next" ? "Next ×2" : "×" + a}
                    </button>
                ))}
                <span class="roles">
                    {ROLES.filter((r) => byRole[r].gt(0)).map((r) => (
                        <span key={r} class="role-power">
                            {ROLE_NAMES[r]} {fmt(byRole[r])}
                            {traits.length > 0 && traitRoleMult(traits, r) !== 1 && (
                                <span class={traitRoleMult(traits, r) > 1 ? "good" : "bad"}> ×{traitRoleMult(traits, r)}</span>
                            )}
                        </span>
                    ))}
                </span>
            </div>
            <table class="units">
                <thead>
                    <tr>
                        <th>Unit</th>
                        <th>Role</th>
                        <th class="num">Owned</th>
                        <th class="num">Power each</th>
                        <th class="num">Total</th>
                        <th />
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {units.map((id) => {
                        const u = UNITS[id];
                        const owned = state.run.units[id] ?? 0;
                        const affordable = unitAffordable(state, stats, id);
                        // buys up to the amount chosen; with nothing affordable, show the price of the full amount
                        const wanted = Math.max(1, unitsWanted(state, id, amount, affordable));
                        const n = affordable > 0 ? Math.min(wanted, affordable) : wanted;
                        const partial = affordable > 0 && n < wanted;
                        const price = unitPrice(state, stats, id, n);
                        const each = unitPower(stats, id, owned);
                        const vsTarget = traitRoleMult(traits, u.role);
                        const nextDrill = (Math.floor(owned / DRILL_STEP) + 1) * DRILL_STEP;
                        return (
                            <tr key={id}>
                                <td>
                                    {u.name}
                                    {u.text && <span class="hint"> · {u.text}</span>}
                                </td>
                                <td>
                                    {ROLE_NAMES[u.role]}
                                    {vsTarget !== 1 && <span class={vsTarget > 1 ? "good" : "bad"}> ×{vsTarget}</span>}
                                </td>
                                <td class="num">
                                    <Tip tip={`Every ${DRILL_STEP} owned doubles this unit's power. Next at ${nextDrill}.`}>
                                        {fmtInt(owned)}
                                        <span class="hint"> /{nextDrill}</span>
                                    </Tip>
                                </td>
                                <td class="num">
                                    <Tip tip={<BreakdownView stats={stats} stat={unitPowerStat(id)} title="Unit power multiplier" />}>
                                        {fmt(each)}
                                    </Tip>
                                </td>
                                <td class="num">{fmt(each.times(owned))}</td>
                                <td class="buy-button">
                                    <button
                                        class={partial ? undefined : "full"}
                                        title={partial ? `You can afford ${fmtInt(n)} of the ${fmtInt(wanted)} chosen` : undefined}
                                        disabled={affordable === 0}
                                        onClick={() => buyUnits(state, id, amount)}
                                    >
                                        +{fmtInt(n)}
                                    </button>
                                </td>
                                <td class="buy-price">
                                    <Price amount={price} currency={u.currency} have={wallet(state, u.currency)} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div class="hint">
                <Tip tip={<BreakdownView stats={stats} stat="army.power" title="Army power multiplier" />}>
                    Army power ×{fmt(stats.get("army.power"))}
                </Tip>
            </div>
        </section>
    );
}

export function ArmyPanel() {
    return (
        <div class="panel">
            <Campaign />
            <Troops />
            <HeroesSection />
        </div>
    );
}
