import { RACES } from "../content/races";
import { canFoundSettlers, foundSettlers, isSettlersUnlocked, setTaxShare } from "../engine/actions";
import { getStats } from "../engine/collect";
import { settlersPrice } from "../engine/costs";
import { realmEconomy } from "../engine/economy";
import { fmt, fmtPercent } from "../engine/format";
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

export function RealmPanel() {
    const state = game();
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const run = state.run;

    return (
        <div class="panel">
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
                        step={5}
                        value={Math.round(run.taxShare * 100)}
                        onInput={(e) => setTaxShare(state, Number((e.target as HTMLInputElement).value) / 100)}
                    />
                    <span>Tax {fmtPercent(run.taxShare)}</span>
                </div>
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
                    Cities <span class="count">({run.cities.length})</span>
                </h2>
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
                                                <div>Realm: {RACES[c.city.race].realmEffectText}</div>
                                            </div>
                                        }
                                    >
                                        {RACES[c.city.race].name}
                                    </Tip>
                                </td>
                                <td>{sizeTier(c.city.pop)}</td>
                                <td class="num">
                                    <Tip tip={<BreakdownView stats={stats} stat="pop.max" scope={c.city.race} title="Maximum population" />}>
                                        {c.city.pop.toFixed(1)} / {c.maxPop.toFixed(1)}
                                    </Tip>
                                    {c.growth > 0 && <span class="growth"> +{(c.growth * 60).toFixed(2)}/m</span>}
                                </td>
                                <td class="num">{c.farmers.toFixed(1)}</td>
                                <td class="num">{fmt(c.production)}</td>
                                <td class="num">{fmt(c.gold)}</td>
                                <td class="num">{c.foodSurplus > 0.005 ? "+" + fmt(c.foodSurplus) : "0"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
