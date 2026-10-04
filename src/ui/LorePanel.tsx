import { LORE, LORE_ORDER } from "../content/lore";
import { buyLore, canBuyLore } from "../engine/actions";
import { getStats } from "../engine/collect";
import { lorePrice } from "../engine/costs";
import { AutoToggle } from "./AutoToggle";
import { Price } from "./components";
import { game } from "./game";

export function LorePanel() {
    const state = game();
    const stats = getStats(state);
    return (
        <div class="panel">
            <section>
                <h2>
                    Lore <AutoToggle kind="lore" label="Auto-study" />
                </h2>
                <p class="hint">Your scholars turn Knowledge into lasting improvements. Each level costs more.</p>
                <div class="cards">
                    {LORE_ORDER.map((id) => {
                        const l = LORE[id];
                        const level = state.run.lore[id] ?? 0;
                        return (
                            <button class="card" key={id} disabled={!canBuyLore(state, id)} onClick={() => buyLore(state, id)}>
                                <div class="card-title">
                                    {l.name} <span class="count">Lv {level}</span>
                                </div>
                                <div class="card-text">
                                    {level > 0 ? l.text(level) : "—"} → {l.text(level + 1)}
                                </div>
                                <div class="card-cost">
                                    <Price amount={lorePrice(state, stats, id)} currency="knowledge" have={state.run.knowledge} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
