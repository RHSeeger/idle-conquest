/**
 * "What is going on": one line per active system, each saying what it is doing
 * now and what comes next. Meant to be the place a player can glance at to
 * feel in control, instead of visiting every tab.
 */
import { ComponentChildren } from "preact";
import { BUILDINGS } from "../content/buildings";
import { LORE, LORE_ORDER } from "../content/lore";
import { isBuildingVisible, isLoreUnlocked, isSettlersUnlocked } from "../engine/actions";
import { ascensionProgress, ASCENSION_BOOKS, ASCENSION_REALMS, canAscend } from "../engine/ascension";
import { AutomationKind, buildQueue, isAutomationUnlocked, spellReserve } from "../engine/automation";
import { getStats } from "../engine/collect";
import { buildingPrice, lorePrice, PriceMap, settlersPrice } from "../engine/costs";
import { Decimal } from "../engine/decimal";
import { realmEconomy, RealmEconomy } from "../engine/economy";
import { exploreSpeed, isExplorationUnlocked, nextSiteCost } from "../engine/exploration";
import { fmtInt, fmtTime } from "../engine/format";
import { availableSpells, isWizard, knowsSpell, manaRate, researchCost } from "../engine/magic";
import { canRefound, fameOnRefound } from "../engine/prestige";
import { GameState } from "../engine/state";
import { armyActivity } from "./ArmyPanel";
import { myrrorPower, myrrorTarget } from "../engine/planes";
import { myrrorShare } from "../engine/army";
import { game } from "./game";

/** Seconds until a price is affordable at current income (0 if it already is) */
function secondsToAfford(state: GameState, econ: RealmEconomy, mana: Decimal, price: PriceMap): number {
    const run = state.run;
    const wait = (have: Decimal, need: Decimal | undefined, rate: Decimal) =>
        !need || have.gte(need) ? 0 : rate.lte(0) ? Infinity : need.minus(have).div(rate).toNumber();
    return Math.max(
        wait(run.production, price.production, econ.production),
        wait(run.gold, price.gold, econ.gold),
        wait(run.mana, price.mana, mana),
    );
}

function when(seconds: number): string {
    return seconds <= 0 ? "affordable now" : seconds === Infinity ? "no income for it yet" : `in ${fmtTime(seconds)}`;
}

function Line(props: { icon: string; label: string; auto?: AutomationKind; children: ComponentChildren }) {
    const state = game();
    const auto = props.auto && isAutomationUnlocked(state, props.auto) ? state.automation[props.auto] : undefined;
    return (
        <li>
            <span class="ov-label">
                {props.icon} {props.label}
            </span>
            <span class="ov-text">{props.children}</span>
            {auto !== undefined && <span class={"ov-auto " + (auto ? "on" : "off")}>{auto ? "auto" : "manual"}</span>}
        </li>
    );
}

export function Overview() {
    const state = game();
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const mana = manaRate(state, stats);
    const run = state.run;

    // the next building in the auto-build order that can be built
    const nextBuilding = buildQueue(state).find((id) => !run.buildings.includes(id) && isBuildingVisible(state, id));
    const cheapestLore = isLoreUnlocked(state)
        ? LORE_ORDER.map((id) => ({ id, price: lorePrice(state, stats, id) })).sort((a, b) => a.price.cmp(b.price))[0]
        : null;
    const reserve = spellReserve(state);
    const sites = run.sites.filter((s) => s.kind === "lair" && !s.cleared).length;
    const asc = ascensionProgress(state);
    // the spell auto-research would pick next: the cheapest unknown one
    const nextSpell = isWizard(state)
        ? availableSpells(state)
              .filter((s) => !knowsSpell(state, s.id))
              .sort((x, y) => researchCost(state, stats, x).cmp(researchCost(state, stats, y)))[0]
        : undefined;
    const spellCost = nextSpell ? researchCost(state, stats, nextSpell) : undefined;

    return (
        <section>
            <h2>Overview</h2>
            <ul class="overview">
                <Line icon="⚔" label="Army" auto="units">
                    {armyActivity(state)}
                </Line>
                <Line icon="⚒" label="Building" auto="buildings">
                    {nextBuilding ? (
                        <>
                            next: <b>{BUILDINGS[nextBuilding].name}</b>,{" "}
                            {when(secondsToAfford(state, econ, mana, buildingPrice(stats, nextBuilding)))}
                        </>
                    ) : (
                        "everything available is built"
                    )}
                </Line>
                {cheapestLore && (
                    <Line icon="✎" label="Lore" auto="lore">
                        next: <b>{LORE[cheapestLore.id].name}</b>,{" "}
                        {when(
                            run.knowledge.gte(cheapestLore.price.plus(reserve))
                                ? 0
                                : econ.knowledge.lte(0)
                                  ? Infinity
                                  : cheapestLore.price.plus(reserve).minus(run.knowledge).div(econ.knowledge).toNumber(),
                        )}
                        {reserve.gt(0) && <span class="hint"> (after saving for a spell)</span>}
                    </Line>
                )}
                {isSettlersUnlocked(state) && (
                    <Line icon="❦" label="Settlers" auto="settlers">
                        next town{" "}
                        {when(
                            run.food.gte(settlersPrice(state, stats))
                                ? 0
                                : econ.food.lte(0)
                                  ? Infinity
                                  : settlersPrice(state, stats).minus(run.food).div(econ.food).toNumber(),
                        )}
                    </Line>
                )}
                {isExplorationUnlocked(state) && (
                    <Line icon="🧭" label="Expeditions" auto="lairs">
                        next discovery in {fmtTime((nextSiteCost(state) - run.exploreProgress) / exploreSpeed(state, stats))}
                        {sites > 0 && ` · ${sites} lair${sites === 1 ? "" : "s"} to raid (Army tab)`}
                    </Line>
                )}
                {state.planes.myrror && (
                    <Line icon="❖" label="Myrror">
                        {(() => {
                            const t = myrrorTarget(state);
                            const share = myrrorShare(state);
                            if (!t) return "all of Myrror is yours";
                            if (share <= 0) return "no troops sent (Planes tab)";
                            const power = myrrorPower(state, stats, t.traits);
                            const eta = power.gt(0) ? t.defense.minus(state.planes.myrror!.siege).div(power).toNumber() : Infinity;
                            return `${Math.round(share * 100)}% of the army besieging ${t.name} · ${eta > 86400 ? "too strong for now" : fmtTime(eta)}`;
                        })()}
                    </Line>
                )}
                {(canRefound(state) || state.prestige.refounds > 0) && (
                    <Line icon="✦" label="Refound">
                        {canRefound(state) ? `+${fmtInt(fameOnRefound(state))} Fame if you Refound now` : "conquer a city of another race first"}
                    </Line>
                )}
                {isWizard(state) && (
                    <Line icon="✧" label="Magic" auto="research">
                        {nextSpell ? (
                            <>
                                next spell: <b>{nextSpell.name}</b>,{" "}
                                {when(
                                    run.knowledge.gte(spellCost!)
                                        ? 0
                                        : econ.knowledge.lte(0)
                                          ? Infinity
                                          : spellCost!.minus(run.knowledge).div(econ.knowledge).toNumber(),
                                )}
                            </>
                        ) : (
                            "every spell you can research is known"
                        )}
                        {` · ${run.enchantments.length} enchantment${run.enchantments.length === 1 ? "" : "s"} active`}
                    </Line>
                )}
                {(asc.books > 0 || asc.wizardsGuild || isWizard(state)) && (
                    <Line icon="◈" label="Ascension">
                        {canAscend(state)
                            ? "ready (Ascension tab)"
                            : `Wizards' Guild ${asc.wizardsGuild ? "✓" : "✗"} · books ${asc.books}/${ASCENSION_BOOKS} · realms ${asc.realms}/${ASCENSION_REALMS}`}
                    </Line>
                )}
            </ul>
        </section>
    );
}
