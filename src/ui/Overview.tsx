/**
 * "At a glance": one line per active system, each saying what it is doing
 * now and what comes next. Meant to be the place a player can glance at to
 * feel in control, instead of visiting every tab. Shown above the tabs on every
 * tab, collapsible.
 */
import { ComponentChildren } from "preact";
import { useStoredOpen } from "./components";
import { ARCANUS_WIZARDS } from "../content/frontier";
import { MAX_HEROES } from "../content/heroes";
import { MYRROR_WIZARDS } from "../content/myrror";
import { Stats } from "../engine/effects";
import { heroesAllowed, hireCost, isTavernOpen } from "../engine/heroes";
import { masteryCost, masterySecondsLeft, SPELL_OF_MASTERY } from "../engine/mastery";
import { masteryGate } from "../engine/magic";
import { isMasteryTabVisible } from "./MasteryPanel";
import { banishedCount, currentRival, wardSecondsLeft, wardStrength } from "../engine/wards";
import { BUILDINGS } from "../content/buildings";
import { LORE, LORE_ORDER } from "../content/lore";
import { isLoreUnlocked, isSettlersUnlocked } from "../engine/actions";
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

/** Opens a tab by its id (App's setTab) */
type OpenTab = (tab: string) => void;

/** One system's line; its label is a link to the tab where that system lives */
function Line(props: { icon: string; label: string; tab: string; onOpen: OpenTab; auto?: AutomationKind; children: ComponentChildren }) {
    const state = game();
    const auto = props.auto && isAutomationUnlocked(state, props.auto) ? state.automation[props.auto] : undefined;
    return (
        <li>
            <button class="link ov-label" title="Go to it" onClick={() => props.onOpen(props.tab)}>
                {props.icon} {props.label}
            </button>
            <span class="ov-text">{props.children}</span>
            {auto !== undefined && <span class={"ov-auto " + (auto ? "on" : "off")}>{auto ? "auto" : "manual"}</span>}
        </li>
    );
}

/**
 * Lines keep their places: the kingdom's systems in the first column and the
 * layers above in the second, each in a fixed order, so a line appearing in one
 * column never moves the other's.
 */
export function Overview(props: { onOpen: OpenTab }) {
    const onOpen = props.onOpen;
    const [open, setOpen] = useStoredOpen("glance", true);
    const state = game();
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const mana = manaRate(state, stats);
    const run = state.run;

    // what auto-build would get next; before auto-build (or with no Chronicle yet), the soonest affordable
    const nextBuilding = buildQueue(state, isAutomationUnlocked(state, "buildings") ? state.automation.buildMode : "cheapest")[0];
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
            <div class="overview-columns">
            <ul class="overview">
                <Line icon="⚔" label="Army" tab="army" onOpen={onOpen} auto="units">
                    {armyActivity(state)}
                </Line>
                <Line icon="⚒" label="Building" tab="buildings" onOpen={onOpen} auto="buildings">
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
                    <Line icon="✎" label="Lore" tab="lore" onOpen={onOpen} auto="lore">
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
                    <Line icon="❦" label="Settlers" tab="prestige" onOpen={onOpen} auto="settlers">
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
                    <Line icon="♛" label="Heroes" tab="army" onOpen={onOpen}>
                        {heroLine(state, econ, mana)}
                    </Line>
                )}
                {isExplorationUnlocked(state) && (
                    <Line icon="🧭" label="Expeditions" tab="explore" onOpen={onOpen} auto="lairs">
                        next discovery in {fmtTime((nextSiteCost(state) - run.exploreProgress) / exploreSpeed(state, stats))}
                        {sites > 0 && ` · ${sites} lair${sites === 1 ? "" : "s"} to raid`}
                    </Line>
                )}
            </ul>
            <ul class="overview">
                {(canRefound(state) || state.prestige.refounds > 0 || isWizard(state)) && (
                    <Line icon="✦" label="Refound" tab="prestige" onOpen={onOpen}>
                        {canRefound(state) ? `+${fmtInt(fameOnRefound(state))} Fame if you Refound now` : "conquer a city of another race first"}
                    </Line>
                )}
                {isWizard(state) && (
                    <Line icon="✧" label="Magic" tab="magic" onOpen={onOpen} auto="research">
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
                {isWizard(state) && (
                    <Line icon="♜" label="Rivals" tab="magic" onOpen={onOpen}>
                        {contestLine(state, stats)}
                    </Line>
                )}
                {(asc.books > 0 || asc.wizardsGuild || isWizard(state)) && (
                    <Line icon="◈" label="Ascension" tab="ascension" onOpen={onOpen}>
                        {canAscend(state)
                            ? "ready"
                            : `Wizards' Guild ${asc.wizardsGuild ? "✓" : "✗"} · books ${asc.books}/${ASCENSION_BOOKS} · realms ${asc.realms}/${ASCENSION_REALMS}`}
                    </Line>
                )}
                {state.planes.myrror && (
                    <Line icon="❖" label="Myrror" tab="planes" onOpen={onOpen}>
                        {(() => {
                            const t = myrrorTarget(state);
                            const share = myrrorShare(state);
                            if (!t) return "all of Myrror is yours";
                            if (share <= 0) return "no troops sent";
                            const power = myrrorPower(state, stats, t.traits);
                            const eta = power.gt(0) ? t.defense.minus(state.planes.myrror!.siege).div(power).toNumber() : Infinity;
                            return `${Math.round(share * 100)}% of the army besieging ${t.name} · ${eta > 86400 ? "too strong for now" : fmtTime(eta)}`;
                        })()}
                    </Line>
                )}
                {isMasteryTabVisible(state) && (
                    <Line icon="★" label="Mastery" tab="mastery" onOpen={onOpen}>
                        {masteryLine(state, stats)}
                    </Line>
                )}
            </ul>
            </div>
        </details>
    );
}

/** The wizards' contest: whose wards are falling, and how soon */
function contestLine(state: GameState, stats: Stats): string {
    const rival = currentRival(state);
    const done = `${banishedCount(state)}/${ARCANUS_WIZARDS} banished`;
    if (!rival) return `${done}: every rival of this Ascension has fallen`;
    const pct = Math.floor(state.ascension.wardProgress.div(wardStrength(state, rival)).toNumber() * 100);
    const left = wardSecondsLeft(state, stats);
    return `${done} · ${rival}'s wards ${pct}% worn down, ${left === Infinity ? "no casting skill free" : `${fmtTime(left)} left`}`;
}

/** What the Mastery layer is waiting on: a challenge, the Spell's channel, or the gate */
function masteryLine(state: GameState, stats: Stats): string {
    const m = state.mastery;
    const gate = masteryGate(state);
    if (m.challenge) {
        return m.challengeDone
            ? `${m.challenge}'s challenge is won: complete it`
            : `${m.challenge}'s challenge · rivals banished ${gate.arcanus}/${ARCANUS_WIZARDS}`;
    }
    if (m.cast) return "the Spell is cast: claim your Mastery";
    const pct = Math.floor(m.progress.div(masteryCost(state)).toNumber() * 100);
    if (m.channelling) return `channelling the Spell: ${pct}% · ${fmtTime(masterySecondsLeft(state, stats))} left`;
    if (m.progress.gt(0)) return `the Spell is ${pct}% channelled (paused)`;
    if (gate.ready) return knowsSpell(state, SPELL_OF_MASTERY) ? "every rival wizard has fallen: channel the Spell" : "every rival wizard has fallen: research the Spell";
    return `Myrran wizards ${gate.myrran}/${MYRROR_WIZARDS} · Arcanus rivals ${gate.arcanus}/${ARCANUS_WIZARDS} this Ascension`;
}

/** Heroes: how many serve, and when the next can be hired */
function heroLine(state: GameState, econ: RealmEconomy, mana: Decimal): string {
    const n = state.run.heroes.length;
    const count = `${n}/${MAX_HEROES} heroes`;
    if (n >= MAX_HEROES) return `${count}, every place filled`;
    if (!isTavernOpen(state)) return `${count} · hiring needs an Adventurers' Guild`;
    return `${count} · next hire ${when(secondsToAfford(state, econ, mana, { gold: hireCost(state) }))}`;
}
