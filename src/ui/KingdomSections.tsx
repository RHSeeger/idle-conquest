import { useState } from "preact/hooks";
import { RACES, RaceId } from "../content/races";
import { Decimal, ZERO } from "../engine/decimal";
import { canFoundSettlers, foundSettlers, isSettlersUnlocked, setTaxShare } from "../engine/actions";
import { getStats } from "../engine/collect";
import { settlersPrice } from "../engine/costs";
import { realmEconomy } from "../engine/economy";
import { fmt, fmtFixed, fmtPercent, fmtTime } from "../engine/format";
import { isAutomationUnlocked, TAX_FLOORS, taxPlan } from "../engine/automation";
import { BUILDINGS } from "../content/buildings";
import { AutoToggle } from "./AutoToggle";
import { BreakdownView, Price, Tip } from "./components";
import { game } from "./game";

/** Master of Magic city size names (population in thousands) */
export function sizeTier(pop: number): string {
    if (pop < 1) return "Outpost";
    if (pop < 5) return "Hamlet";
    if (pop < 9) return "Village";
    if (pop < 13) return "Town";
    if (pop < 17) return "City";
    return "Capital";
}

/** Auto-tax (with auto-build): its switch, its floor, and what it's doing */
function AutoTax() {
    const state = game();
    if (!isAutomationUnlocked(state, "buildings")) return null;
    const a = state.automation;
    const plan = a.taxAuto ? taxPlan(state) : null;
    const target = plan ? [plan.building && BUILDINGS[plan.building].name, plan.hero && "the next hero"].filter(Boolean).join(" and ") : "";
    return (
        <>
            <div class="row">
                <button
                    class={"toggle auto" + (a.taxAuto ? " on" : "")}
                    title="Automation: click to switch it on or off. Moving the slider switches it off."
                    onClick={() => (a.taxAuto = !a.taxAuto)}
                >
                    Auto-tax: {a.taxAuto ? "on" : "off"}
                </button>
                <span class="auto-budget">
                    Lowest tax{" "}
                    <select
                        title="The tax share auto-tax keeps while nothing you're saving for needs gold (Mercenaries, rushing and heroes still use gold)"
                        value={String(a.taxFloor)}
                        onChange={(e) => (a.taxFloor = Number((e.target as HTMLSelectElement).value))}
                    >
                        {TAX_FLOORS.map((f) => (
                            <option key={f} value={String(f)}>
                                {fmtPercent(f)}
                            </option>
                        ))}
                    </select>
                </span>
            </div>
            <p class="hint">
                {!plan
                    ? "Auto-tax sets the split so that production and gold for what you're saving for arrive together."
                    : !plan.needsGold
                      ? `Auto-tax: ${target ? `${target} needs no more gold` : "nothing to save for"}, so taxes stay at the lowest (${fmtPercent(a.taxFloor)}) and everyone else works.`
                      : `Auto-tax: saving for ${target}; at ${fmtPercent(plan.share)} tax, production and gold are both there ${plan.seconds === Infinity ? "never at this income" : plan.seconds <= 0 ? "now" : `in ${fmtTime(plan.seconds)}`}.`}
            </p>
        </>
    );
}

/** The kingdom itself (top of the Kingdom tab): citizens, settlers and cities */
export function KingdomSections() {
    const state = game();
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const run = state.run;
    const [showAll, setShowAll] = useState(false);
    // per-race summary: with dozens of cities a full list is mostly noise
    const byRace = new Map<RaceId, { cities: number; pop: number; maxPop: number; production: Decimal; gold: Decimal }>();
    for (const c of econ.cities) {
        const e = byRace.get(c.city.race) ?? { cities: 0, pop: 0, maxPop: 0, production: ZERO, gold: ZERO };
        e.cities++;
        e.pop += c.city.pop;
        e.maxPop += c.maxPop;
        e.production = e.production.plus(c.production);
        e.gold = e.gold.plus(c.gold);
        byRace.set(c.city.race, e);
    }

    return (
        <>
            <section>
                <h2>Citizens</h2>
                <p class="hint">
                    Just enough citizens farm to feed each city. The rest either <b>work</b> (production) or{" "}
                    <b>pay taxes</b> (gold).
                </p>
                <div class="slider-row">
                    <span>Work {fmtPercent(1 - run.taxShare)}</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(run.taxShare * 100)}
                        onInput={(e) => {
                            // moving it by hand takes over from auto-tax
                            state.automation.taxAuto = false;
                            setTaxShare(state, Number((e.target as HTMLInputElement).value) / 100);
                        }}
                    />
                    <span>Tax {fmtPercent(run.taxShare)}</span>
                </div>
                <AutoTax />
            </section>

            {isSettlersUnlocked(state) && (
                <section>
                    <h2>
                        Settlers <AutoToggle kind="settlers" label="Auto-settle" />
                    </h2>
                    <div class="row">
                        <button disabled={!canFoundSettlers(state)} onClick={() => foundSettlers(state)}>
                            Found a new {RACES[run.startingRace].adjective} town
                        </button>
                        <Price amount={settlersPrice(state, stats)} currency="food" have={run.food} />
                        <span class="hint">Settlers founded: {run.settlersFounded}</span>
                    </div>
                </section>
            )}

            <section>
                <h2>
                    Cities <span class="count">({run.cities.length})</span>{" "}
                    <button class="toggle" onClick={() => setShowAll(!showAll)}>
                        {showAll ? "Group by race" : "Show every city"}
                    </button>
                </h2>
                {!showAll && (
                    <table class="cities">
                        <thead>
                            <tr>
                                <th>Race</th>
                                <th class="num">Cities</th>
                                <th class="num">Pop</th>
                                <th class="num">⚒/s</th>
                                <th class="num">◉/s</th>
                                <th>Kingdom bonus while held</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...byRace.entries()].map(([race, e]) => (
                                <tr key={race}>
                                    <td>
                                        <Tip tip={<div>City: {RACES[race].cityEffectText}</div>}>{RACES[race].plural}</Tip>
                                    </td>
                                    <td class="num">{e.cities}</td>
                                    <td class="num">
                                        {fmtFixed(e.pop, 0)} / {fmtFixed(e.maxPop, 0)}
                                    </td>
                                    <td class="num">{fmt(e.production)}</td>
                                    <td class="num">{fmt(e.gold)}</td>
                                    <td class="hint">{RACES[race].realmEffectText}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {showAll && (
                <table class="cities">
                    <thead>
                        <tr>
                            <th>City</th>
                            <th>Race</th>
                            <th>Size</th>
                            <th class="num">Pop</th>
                            <th class="num">Farmers</th>
                            <th class="num">⚒/s</th>
                            <th class="num">◉/s</th>
                            <th class="num">❦/s</th>
                        </tr>
                    </thead>
                    <tbody>
                        {econ.cities.map((c) => (
                            <tr key={c.city.id}>
                                <td>
                                    {c.city.name}
                                    {c.city.origin === "capital" && <span class="tag">capital</span>}
                                </td>
                                <td>
                                    <Tip
                                        tip={
                                            <div>
                                                <b>{RACES[c.city.race].plural}</b>
                                                <div>City: {RACES[c.city.race].cityEffectText}</div>
                                                <div>Kingdom: {RACES[c.city.race].realmEffectText}</div>
                                            </div>
                                        }
                                    >
                                        {RACES[c.city.race].name}
                                    </Tip>
                                </td>
                                <td>{sizeTier(c.city.pop)}</td>
                                <td class="num">
                                    <Tip tip={<BreakdownView stats={stats} stat="pop.max" scope={c.city.race} title="Maximum population" />}>
                                        {fmtFixed(c.city.pop, 1)} / {fmtFixed(c.maxPop, 1)}
                                    </Tip>
                                    {c.growth > 0 && <span class="growth"> +{fmtFixed(c.growth * 60, 2)}/m</span>}
                                </td>
                                <td class="num">{fmtFixed(c.farmers, 1)}</td>
                                <td class="num">{fmt(c.production)}</td>
                                <td class="num">{fmt(c.gold)}</td>
                                <td class="num">{c.foodSurplus > 0.005 ? "+" + fmt(c.foodSurplus) : "0"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </section>
        </>
    );
}
