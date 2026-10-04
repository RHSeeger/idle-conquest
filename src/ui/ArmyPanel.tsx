import { frontierCity, REGION_SIZE, wallIndex } from "../content/frontier";
import { RACES } from "../content/races";
import { ROLE_NAMES, ROLES, TRAITS, traitRoleMult } from "../content/traits";
import { DRILL_STEP, UNITS } from "../content/units";
import { buyUnits } from "../engine/actions";
import { availableUnits, currentPlan, currentTarget, powerByRole, siegePower, unitPower } from "../engine/army";
import { getStats } from "../engine/collect";
import { unitAffordable, unitPrice, wallet } from "../engine/costs";
import { unitPowerStat } from "../engine/effects";
import { fmt, fmtInt, fmtTime } from "../engine/format";
import { Settings } from "../engine/state";
import { isAutomationUnlocked } from "../engine/automation";
import { ZERO } from "../engine/decimal";
import { lairTarget, siteName } from "../engine/exploration";
import { AutoToggle } from "./AutoToggle";
import { HeroesSection } from "./HeroesSection";
import { BreakdownView, Price, ProgressBar, Tip } from "./components";
import { game } from "./game";

const BUY_AMOUNTS: Settings["buyAmount"][] = [1, 10, 100, "max"];

function Frontier() {
    const state = game();
    const stats = getStats(state);
    const plan = currentPlan(state);
    const target = currentTarget(state);
    const run = state.run;

    if (!target) {
        const wizardRegion = plan[plan.length - 1];
        return (
            <section>
                <h2>Frontier</h2>
                <div class="wall">
                    <b>{wizardRegion.name}</b>
                    <p>
                        Your armies stand before a rival wizard's domain. Mortal soldiers cannot pass the wards that
                        guard it. Only a wizard could break them.
                    </p>
                </div>
            </section>
        );
    }

    const raiding = lairTarget(state);
    const power = raiding ? ZERO : siegePower(state, stats, target.traits);
    const remaining = target.defense.minus(run.frontier.siege);
    const eta = power.gt(0) ? remaining.div(power).toNumber() : Infinity;
    const regionIdx = Math.floor(target.index / REGION_SIZE);
    const upcoming = [1, 2, 3, 4]
        .map((i) => frontierCity(run.startingRace, plan, target.index + i))
        .filter((c) => c !== null);

    return (
        <section>
            <h2>
                Frontier <span class="count">— {target.region.name}</span>
            </h2>
            <div class="target">
                <div class="target-head">
                    <b>{target.name}</b> · {RACES[target.race].adjective}
                    {target.isRegionCapital && <span class="tag">region capital</span>}
                    <span class="target-def">Defense {fmt(target.defense)}</span>
                </div>
                <div class="traits">
                    {target.traits.length === 0 && <span class="hint">No special defenses</span>}
                    {target.traits.map((t) => (
                        <Tip key={t} tip={TRAITS[t].description}>
                            <span class="trait">{TRAITS[t].name}</span>
                        </Tip>
                    ))}
                </div>
                <ProgressBar
                    fraction={run.frontier.siege.div(target.defense).toNumber()}
                    label={
                        raiding
                            ? `Paused: the army is raiding the ${siteName(raiding)} (see Exploration)`
                            : power.gt(0)
                              ? `Siege ${fmt(run.frontier.siege)} / ${fmt(target.defense)} · ${fmt(power)}/s · ${fmtTime(eta)}`
                              : "Train troops to besiege this city"
                    }
                />
            </div>
            <div class="regions">
                {plan.map((r) => (
                    <span key={r.index} class={"region " + (r.index < regionIdx ? "done" : r.index === regionIdx ? "current" : "")}>
                        {r.name}
                    </span>
                ))}
                <span class="hint">
                    {" "}
                    · city {target.index + 1} of {wallIndex(plan)}
                </span>
            </div>
            {upcoming.length > 0 && (
                <div class="upcoming">
                    <span class="hint">Next: </span>
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
                {isAutomationUnlocked(state, "units") && state.automation.units && (
                    <button
                        class="toggle"
                        title="Chronicle: rebuild your last run's army mix. Efficient: best power per cost against the current city."
                        onClick={() =>
                            (state.automation.unitMode = state.automation.unitMode === "chronicle" ? "efficient" : "chronicle")
                        }
                    >
                        Mode: {state.automation.unitMode === "chronicle" ? "Chronicle" : "Efficient"}
                    </button>
                )}
            </h2>
            <div class="row">
                <span class="hint">Buy:</span>
                {BUY_AMOUNTS.map((a) => (
                    <button
                        key={String(a)}
                        class={"toggle" + (amount === a ? " on" : "")}
                        onClick={() => (state.settings.buyAmount = a)}
                    >
                        {a === "max" ? "Max" : "×" + a}
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
                    </tr>
                </thead>
                <tbody>
                    {units.map((id) => {
                        const u = UNITS[id];
                        const owned = state.run.units[id] ?? 0;
                        const affordable = unitAffordable(state, stats, id);
                        const n = amount === "max" ? Math.max(1, affordable) : amount;
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
                                <td class="buy">
                                    <button disabled={affordable < n || affordable === 0} onClick={() => buyUnits(state, id, amount)}>
                                        {amount === "max" ? `+${fmtInt(affordable)}` : `+${n}`}
                                    </button>
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
            <Frontier />
            <Troops />
            <HeroesSection />
        </div>
    );
}
