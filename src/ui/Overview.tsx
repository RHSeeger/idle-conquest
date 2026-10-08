/**
 * "At a glance": one line per active system, each saying what it is doing
 * now and what comes next. Meant to be the place a player can glance at to
 * feel in control, instead of visiting every tab. Shown above the tabs on every
 * tab, collapsible.
 */
import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { ARCANUS_WIZARDS } from "../content/frontier";
import { MAX_HEROES } from "../content/heroes";
import { MYRROR_WIZARDS } from "../content/myrror";
import { Stats } from "../engine/effects";
import { heroesAllowed, hireCost, isTavernOpen } from "../engine/heroes";
import { masteryCost, masterySecondsLeft, SPELL_OF_MASTERY } from "../engine/mastery";
import { masteryGate } from "../engine/magic";
import { isMasteryTabVisible } from "./MasteryPanel";
import { BUILDINGS } from "../content/buildings";
import { LORE, LORE_ORDER } from "../content/lore";
import { isBuildingVisible, isLoreUnlocked, isSettlersUnlocked } from "../engine/actions";
import { ascensionProgress, ASCENSION_BOOKS, ASCENSION_REALMS, canAscend } from "../engine/ascension";
import { AutomationKind, buildQueue, isAutomationUnlocked, isSavingForSpell } from "../engine/automation";
import { getStats } from "../engine/collect";
import { buildingPrice, lorePrice, PriceMap, settlersPrice } from "../engine/costs";
import { Decimal, ZERO } from "../engine/decimal";
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

const OPEN_KEY = "idle-conquest.glanceOpen";

/** Whether the panel was left open (per browser; open unless closed before) */
function loadOpen(): boolean {
    try {
        return localStorage.getItem(OPEN_KEY) !== "0";
    } catch {
        return true;
    }
}

function saveOpen(open: boolean): void {
    try {
        localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
        // storage blocked: the panel just forgets
    }
}

export function Overview() {
    const [open, setOpenState] = useState(loadOpen);
    const setOpen = (o: boolean) => {
        if (o !== open) {
            setOpenState(o);
            saveOpen(o);
        }
    };
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
    // auto-study only pays loreSpendCap of the Knowledge on hand while saving for a spell
    const spendCap = isAutomationUnlocked(state, "lore") && state.automation.lore && isSavingForSpell(state) ? state.automation.loreSpendCap : 1;
    const loreNeed = cheapestLore ? cheapestLore.price.div(spendCap) : ZERO;
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
        <details class="glance" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>At a glance</summary>
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
                            run.knowledge.gte(loreNeed)
                                ? 0
                                : econ.knowledge.lte(0)
                                  ? Infinity
                                  : loreNeed.minus(run.knowledge).div(econ.knowledge).toNumber(),
                        )}
                        {spendCap < 1 && <span class="hint"> (auto-study waits until it's {Math.round(spendCap * 100)}% of your Knowledge)</span>}
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
                {heroesAllowed(state) && (isTavernOpen(state) || run.heroes.length > 0) && (
                    <Line icon="♛" label="Heroes">
                        {heroLine(state, econ, mana)}
                    </Line>
                )}
                {isExplorationUnlocked(state) && (
                    <Line icon="🧭" label="Expeditions" auto="lairs">
                        next discovery in {fmtTime((nextSiteCost(state) - run.exploreProgress) / exploreSpeed(state, stats))}
                        {sites > 0 && ` · ${sites} lair${sites === 1 ? "" : "s"} to raid`}
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
                {isMasteryTabVisible(state) && (
                    <Line icon="★" label="Mastery">
                        {masteryLine(state, stats)}
                    </Line>
                )}
            </ul>
        </details>
    );
}

/** What the Mastery layer is waiting on: a challenge, the Spell's channel, or the gate */
function masteryLine(state: GameState, stats: Stats): string {
    const m = state.mastery;
    const gate = masteryGate(state);
    if (m.challenge) {
        return m.challengeDone
            ? `${m.challenge}'s challenge is won: complete it (Mastery tab)`
            : `${m.challenge}'s challenge · Fortresses ${state.run.fortressesTaken}/${ARCANUS_WIZARDS} in this kingdom`;
    }
    if (m.cast) return "the Spell is cast: claim your Mastery (Mastery tab)";
    const pct = Math.floor(m.progress.div(masteryCost(state)).toNumber() * 100);
    if (m.channelling) return `channelling the Spell: ${pct}% · ${fmtTime(masterySecondsLeft(state, stats))} left`;
    if (m.progress.gt(0)) return `the Spell is ${pct}% channelled (paused)`;
    if (gate.ready) return knowsSpell(state, SPELL_OF_MASTERY) ? "every rival wizard has fallen: channel the Spell" : "every rival wizard has fallen: research the Spell";
    return `Myrran wizards ${gate.myrran}/${MYRROR_WIZARDS} · Arcanus Fortresses ${gate.fortresses}/${ARCANUS_WIZARDS} in this kingdom`;
}

/** Heroes: how many serve, and when the next can be hired */
function heroLine(state: GameState, econ: RealmEconomy, mana: Decimal): string {
    const n = state.run.heroes.length;
    const count = `${n}/${MAX_HEROES} heroes`;
    if (n >= MAX_HEROES) return `${count}, every place filled`;
    if (!isTavernOpen(state)) return `${count} · hiring needs an Adventurers' Guild`;
    return `${count} · next hire ${when(secondsToAfford(state, econ, mana, { gold: hireCost(state) }))} (Army tab)`;
}
