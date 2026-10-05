import { LORE, LORE_ORDER } from "../content/lore";
import { buyLore, canBuyLore } from "../engine/actions";
import { getStats } from "../engine/collect";
import { lorePrice } from "../engine/costs";
import { isAutomationUnlocked, isSavingForSpell, loreSpendLimit } from "../engine/automation";
import { fmt } from "../engine/format";
import { isWizard } from "../engine/magic";
import { AutoToggle } from "./AutoToggle";
import { Price } from "./components";
import { game } from "./game";

const LORE_SPEND_CAPS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1];

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
                {isAutomationUnlocked(state, "lore") && isWizard(state) && (
                    <div class="row auto-prestige">
                        <span class="hint">While a spell is left to research, auto-study spends at most</span>
                        <select
                            value={String(state.automation.loreSpendCap)}
                            onChange={(e) => (state.automation.loreSpendCap = Number((e.target as HTMLSelectElement).value))}
                        >
                            {LORE_SPEND_CAPS.map((c) => (
                                <option key={c} value={String(c)}>
                                    {c >= 1 ? "everything" : `${c * 100}%`}
                                </option>
                            ))}
                        </select>
                        <span class="hint">
                            of your Knowledge on any one study
                            {isSavingForSpell(state) && state.automation.loreSpendCap < 1 && (
                                <>
                                    {" "}
                                    (now: up to <b>{fmt(loreSpendLimit(state))}</b>)
                                </>
                            )}
                            . The rest piles up for spells (Magic tab).
                        </span>
                    </div>
                )}
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
