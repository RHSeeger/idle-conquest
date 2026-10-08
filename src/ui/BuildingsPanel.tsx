import { BUILDINGS, BUILDING_ORDER, Currency } from "../content/buildings";
import { RACES } from "../content/races";
import {
    buildingRaceOk,
    buyBuilding,
    canBuyBuilding,
    canRushBuilding,
    isBuildingVisible,
    rushBuilding,
    rushPrice,
    RUSH_GOLD_PER_PRODUCTION,
} from "../engine/actions";
import { getStats } from "../engine/collect";
import { buildingPrice, wallet } from "../engine/costs";
import { AutoMode, AutoToggle } from "./AutoToggle";
import { Price, Tip } from "./components";
import { game } from "./game";

export function BuildingsPanel() {
    const state = game();
    const stats = getStats(state);
    const owned = state.run.buildings;

    const available = BUILDING_ORDER.filter((id) => !owned.includes(id) && isBuildingVisible(state, id));
    // locked buildings whose requirements are partly met are shown as a teaser
    const upcoming = BUILDING_ORDER.filter(
        (id) =>
            !owned.includes(id) &&
            !isBuildingVisible(state, id) &&
            BUILDINGS[id].requires.some((r) => owned.includes(r)),
    );

    return (
        <div class="panel">
            <section>
                <h2>
                    Available <AutoToggle kind="buildings" label="Auto-build" />
                    <AutoMode
                        kind="buildings"
                        value={state.automation.buildMode}
                        onChange={(m) => (state.automation.buildMode = m)}
                        options={[
                            { value: "cheapest", label: "Cheapest", tip: "Build whatever costs least first" },
                            { value: "chronicle", label: "Chronicle", tip: "Follow your last kingdom's build order" },
                        ]}
                    />
                </h2>
                {available.length === 0 && <p class="hint">Nothing to build right now.</p>}
                <div class="cards">
                    {available.map((id) => {
                        const b = BUILDINGS[id];
                        const price = buildingPrice(stats, id);
                        const affordable = canBuyBuilding(state, id);
                        return (
                            <div class={"card panel-card" + (affordable ? "" : " dim")} key={id}>
                                <div class="card-title">{b.name}</div>
                                <div class="card-text">{b.text}</div>
                                <div class="card-cost">
                                    <button disabled={!affordable} onClick={() => buyBuilding(state, id)}>
                                        Build
                                    </button>
                                    {Object.entries(price).map(([c, amount]) => (
                                        <Price key={c} amount={amount!} currency={c as Currency} have={wallet(state, c as Currency)} />
                                    ))}
                                </div>
                                {!affordable && state.run.gold.gte(rushPrice(state, id).div(4)) && (
                                    <div class="card-cost">
                                        <Tip tip={`Pay entirely in gold: ${RUSH_GOLD_PER_PRODUCTION} gold per production point.`}>
                                            <button disabled={!canRushBuilding(state, id)} onClick={() => rushBuilding(state, id)}>
                                                Rush
                                            </button>
                                        </Tip>
                                        <Price amount={rushPrice(state, id)} currency="gold" have={state.run.gold} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {upcoming.length > 0 && (
                <section>
                    <h2>Locked</h2>
                    <ul class="locked">
                        {upcoming.map((id) => {
                            const missing = BUILDINGS[id].requires.filter((r) => !owned.includes(r)).map((r) => BUILDINGS[r].name);
                            if (!buildingRaceOk(state, id)) {
                                missing.push(
                                    "a city of " + BUILDINGS[id].races!.map((r) => RACES[r].plural).join(", ").replace(/, ([^,]*)$/, " or $1"),
                                );
                            }
                            return (
                                <li key={id}>
                                    <b>{BUILDINGS[id].name}</b> — needs {missing.join(", ")}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {owned.length > 0 && (
                <section>
                    <h2>
                        Built <span class="count">({owned.length})</span>
                    </h2>
                    <ul class="built">
                        {owned.map((id) => (
                            <li key={id}>
                                <b>{BUILDINGS[id].name}</b> <span class="hint">{BUILDINGS[id].text}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
