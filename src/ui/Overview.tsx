/**
 * "At a glance": one line per active system, each saying what it is doing
 * now and what comes next. Meant to be the place a player can glance at to
 * feel in control, instead of visiting every tab. Shown above the tabs on every
 * tab, collapsible.
 *
 * Each line leads with one key fact in its own column (a time, "now", a count),
 * green when there's something to do now, so the eye can run down the column
 * instead of reading every line (TODO #33); the rest of the line is detail.
 */
import { ComponentChildren } from "preact";
import { useStoredOpen } from "./components";
import { ARCANUS_WIZARDS } from "../content/frontier";
import { CHALLENGES, challengeGoalRivals } from "../content/challenges";
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
import { AutomationKind, autoPrestigeDue, buildQueue, isAutomationUnlocked, isSavingForSpell } from "../engine/automation";
import { getStats } from "../engine/collect";
import { buildingPrice, lorePrice, PriceMap, settlersPrice } from "../engine/costs";
import { Decimal, ZERO } from "../engine/decimal";
import { realmEconomy, RealmEconomy } from "../engine/economy";
import { exploreSpeed, isExplorationUnlocked, nextSiteCost } from "../engine/exploration";
import { fmtInt, fmtTime } from "../engine/format";
import { availableSpells, isWizard, knowsSpell, manaRate, researchCost } from "../engine/magic";
import { canRefound, fameOnRefound } from "../engine/prestige";
import { GameState } from "../engine/state";
import { armyOrders } from "./ArmyPanel";
import { myrrorPower, myrrorTarget } from "../engine/planes";
import { myrrorShare } from "../engine/army";
import { openQuests, questSecondsLeft } from "../engine/quests";
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

/** Seconds until `need` is reached from `have` at `rate` per second */
function secondsToReach(have: Decimal, need: Decimal, rate: Decimal): number {
    return have.gte(need) ? 0 : rate.lte(0) ? Infinity : need.minus(have).div(rate).toNumber();
}

/**
 * A line's key fact and how it stands: ready (something to do now), waiting,
 * stuck (it won't move by itself) or done (nothing left to do)
 */
interface Fact {
    fact: ComponentChildren;
    status: "ready" | "wait" | "stuck" | "done";
    tip?: string;
}

/** Past this, a wait reads as "not soon": shown as a dash rather than days */
const TOO_LONG = 86400;

function wait(seconds: number, what = "Affordable"): Fact {
    if (seconds <= 0) return { fact: "now", status: "ready", tip: `${what} now` };
    if (seconds === Infinity) return { fact: "—", status: "stuck", tip: "No income for it yet" };
    if (seconds > TOO_LONG) return { fact: "—", status: "stuck", tip: `Over a day at the current rate (${fmtTime(seconds)})` };
    return { fact: fmtTime(seconds), status: "wait", tip: `${what} in ${fmtTime(seconds)}` };
}

const DONE: Fact = { fact: "✓", status: "done" };

/** Opens a tab by its id (App's setTab) */
type OpenTab = (tab: string) => void;

/** Each line's automation, by the name its tab's toggle uses */
const AUTO_NAMES: Partial<Record<AutomationKind, string>> = {
    units: "Auto-recruit",
    buildings: "Auto-build",
    lore: "Auto-study",
    settlers: "Auto-settle",
    lairs: "Auto-raid",
    research: "Auto-research",
    cast: "Auto-cast",
    refound: "Auto-Refound",
    ascend: "Auto-Ascend",
    works: "Myrran works auto-buy",
    quests: "Auto-quest",
};

/** The marker's tooltip; warns when switching auto-Refound/Ascend on would act at once */
function autoTip(state: GameState, kind: AutomationKind, on: boolean): string {
    const name = AUTO_NAMES[kind] ?? "Automation";
    if (on) return `${name} is on: click to turn it off. Its settings are on the tab.`;
    const now =
        (kind === "ascend" || kind === "refound") && autoPrestigeDue(state, kind)
            ? ` Careful: its condition is already met, so it would ${kind === "ascend" ? "Ascend" : "Refound"} right away.`
            : "";
    return `${name} is off: click to turn it on.${now} Its settings are on the tab.`;
}

/** One system's line: its label links to its tab, then its key fact, the detail, and a marker that switches its automation */
function Line(props: {
    icon: string;
    label: string;
    tab: string;
    onOpen: OpenTab;
    auto?: AutomationKind;
    fact: Fact;
    children: ComponentChildren;
}) {
    const state = game();
    const kind = props.auto && isAutomationUnlocked(state, props.auto) ? props.auto : undefined;
    const on = kind ? state.automation[kind] : false;
    return (
        <li class={"ov-" + props.fact.status}>
            <button class="link ov-label" title="Go to it" onClick={() => props.onOpen(props.tab)}>
                {props.icon} {props.label}
            </button>
            <span class="ov-fact" title={props.fact.tip}>
                {props.fact.fact}
            </span>
            <span class="ov-text">{props.children}</span>
            {kind && (
                <button class={"ov-auto " + (on ? "on" : "off")} title={autoTip(state, kind, on)} onClick={() => (state.automation[kind] = !on)}>
                    {on ? "auto" : "manual"}
                </button>
            )}
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
    const lairs = run.sites.filter((s) => s.kind === "lair" && !s.cleared).length;
    const asc = ascensionProgress(state);
    const ascMet = [asc.wizardsGuild, asc.books >= ASCENSION_BOOKS, asc.realms >= ASCENSION_REALMS].filter((x) => x).length;
    // the spell auto-research would pick next: the cheapest unknown one
    const nextSpell = isWizard(state)
        ? availableSpells(state)
              .filter((s) => !knowsSpell(state, s.id))
              .sort((x, y) => researchCost(state, stats, x).cmp(researchCost(state, stats, y)))[0]
        : undefined;
    const army = armyOrders(state);
    const settlers = settlersPrice(state, stats);

    return (
        <details class="glance" open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>At a glance</summary>
            <div class="overview-columns">
                <ul class="overview">
                    <Line
                        icon="⚔"
                        label="Army"
                        tab="army"
                        onOpen={onOpen}
                        auto="units"
                        fact={
                            army.eta !== null
                                ? wait(army.eta, "Taken")
                                : army.text.startsWith("Idle")
                                  ? { fact: "idle", status: "stuck" }
                                  : {
                                        fact: "halted",
                                        status: "wait",
                                        tip: isWizard(state)
                                            ? "Your spell power has to banish the rival first (Magic tab)"
                                            : "Only a wizard can break a rival wizard's wards (Ascension)",
                                    }
                        }
                    >
                        {army.text}
                    </Line>
                    <Line
                        icon="⚒"
                        label="Building"
                        tab="buildings"
                        onOpen={onOpen}
                        auto="buildings"
                        fact={nextBuilding ? wait(secondsToAfford(state, econ, mana, buildingPrice(stats, nextBuilding))) : DONE}
                    >
                        {nextBuilding ? (
                            <>
                                next: <b>{BUILDINGS[nextBuilding].name}</b>
                            </>
                        ) : (
                            "everything available is built"
                        )}
                    </Line>
                    {cheapestLore && (
                        <Line icon="✎" label="Lore" tab="lore" onOpen={onOpen} auto="lore" fact={wait(secondsToReach(run.knowledge, loreNeed, econ.knowledge))}>
                            next: <b>{LORE[cheapestLore.id].name}</b>
                            {spendCap < 1 && <span class="hint"> (auto-study waits until it's {Math.round(spendCap * 100)}% of your Knowledge)</span>}
                        </Line>
                    )}
                    {isSettlersUnlocked(state) && (
                        <Line icon="❦" label="Settlers" tab="prestige" onOpen={onOpen} auto="settlers" fact={wait(secondsToReach(run.food, settlers, econ.food))}>
                            next town
                        </Line>
                    )}
                    {heroesAllowed(state) && (isTavernOpen(state) || run.heroes.length > 0) && <HeroLine state={state} econ={econ} mana={mana} onOpen={onOpen} />}
                    {isExplorationUnlocked(state) && (
                        <Line
                            icon="🧭"
                            label="Expeditions"
                            tab="explore"
                            onOpen={onOpen}
                            auto="lairs"
                            fact={wait((nextSiteCost(state) - run.exploreProgress) / exploreSpeed(state, stats), "Discovered")}
                        >
                            next discovery
                            {lairs > 0 && ` · ${lairs} lair${lairs === 1 ? "" : "s"} to raid`}
                        </Line>
                    )}
                </ul>
                <ul class="overview">
                    {(canRefound(state) || state.prestige.refounds > 0 || isWizard(state)) && (
                        <Line
                            icon="✦"
                            label="Refound"
                            tab="fame"
                            onOpen={onOpen}
                            auto="refound"
                            fact={
                                canRefound(state)
                                    ? { fact: <span class="fame">+{fmtInt(fameOnRefound(state))}</span>, status: "wait", tip: "Fame if you Refound now" }
                                    : { fact: "—", status: "stuck" }
                            }
                        >
                            {canRefound(state) ? "Fame if you Refound now" : "conquer a city of another race first"}
                        </Line>
                    )}
                    {isWizard(state) && (
                        <Line
                            icon="✧"
                            label="Research"
                            tab="magic"
                            onOpen={onOpen}
                            auto="research"
                            fact={nextSpell ? wait(secondsToReach(run.knowledge, researchCost(state, stats, nextSpell), econ.knowledge)) : DONE}
                        >
                            {nextSpell ? (
                                <>
                                    next spell: <b>{nextSpell.name}</b>
                                </>
                            ) : (
                                "every spell you can research is known"
                            )}
                        </Line>
                    )}
                    {isWizard(state) && (
                        <Line icon="✺" label="Casting" tab="magic" onOpen={onOpen} auto="cast" fact={{ fact: String(run.enchantments.length), status: "wait" }}>
                            enchantment{run.enchantments.length === 1 ? "" : "s"} active
                        </Line>
                    )}
                    {isWizard(state) && <RivalsLine state={state} stats={stats} onOpen={onOpen} />}
                    {isWizard(state) && <QuestsLine state={state} stats={stats} onOpen={onOpen} />}
                    {(asc.books > 0 || asc.wizardsGuild || isWizard(state)) && (
                        <Line
                            icon="◈"
                            label="Ascension"
                            tab="ascension"
                            onOpen={onOpen}
                            auto="ascend"
                            fact={canAscend(state) ? { fact: "ready", status: "ready" } : { fact: `${ascMet}/3`, status: "wait", tip: "Requirements met" }}
                        >
                            Wizards' Guild {asc.wizardsGuild ? "✓" : "✗"} · books {asc.books}/{ASCENSION_BOOKS} · realms {asc.realms}/{ASCENSION_REALMS}
                        </Line>
                    )}
                    {state.planes.myrror && <MyrrorLine state={state} stats={stats} onOpen={onOpen} />}
                    {isMasteryTabVisible(state) && <MasteryLine state={state} stats={stats} onOpen={onOpen} />}
                </ul>
            </div>
        </details>
    );
}

/** Heroes: how many serve, and when the next can be hired */
function HeroLine(props: { state: GameState; econ: RealmEconomy; mana: Decimal; onOpen: OpenTab }) {
    const { state } = props;
    const n = state.run.heroes.length;
    const count = `${n}/${MAX_HEROES} heroes`;
    const [fact, text]: [Fact, string] =
        n >= MAX_HEROES
            ? [DONE, `${count}, every place filled`]
            : !isTavernOpen(state)
              ? [{ fact: "—", status: "stuck" }, `${count} · hiring needs an Adventurers' Guild`]
              : [wait(secondsToAfford(state, props.econ, props.mana, { gold: hireCost(state) })), `next hire · ${count}`];
    return (
        <Line icon="♛" label="Heroes" tab="army" onOpen={props.onOpen} fact={fact}>
            {text}
        </Line>
    );
}

/** The wizards' contest: whose wards are falling, and how soon */
function RivalsLine(props: { state: GameState; stats: Stats; onOpen: OpenTab }) {
    const { state } = props;
    const rival = currentRival(state);
    const done = `${banishedCount(state)}/${ARCANUS_WIZARDS} banished`;
    let fact: Fact = DONE;
    let text = `${done}: every rival of this Ascension has fallen`;
    if (rival) {
        const pct = Math.floor(state.ascension.wardProgress.div(wardStrength(state, rival)).toNumber() * 100);
        const left = wardSecondsLeft(state, props.stats);
        fact = left === Infinity ? { fact: "—", status: "stuck", tip: "No casting skill free" } : wait(left, "Banished");
        text = `${rival}'s wards ${pct}% worn down · ${done}${left === Infinity ? " · no casting skill free" : ""}`;
    }
    return (
        <Line icon="♜" label="Rivals" tab="magic" onOpen={props.onOpen} fact={fact}>
            {text}
        </Line>
    );
}

/** Quests: the soonest one done, how many are under way and waiting */
function QuestsLine(props: { state: GameState; stats: Stats; onOpen: OpenTab }) {
    const { state } = props;
    const quests = state.ascension.quests;
    const open = openQuests(state);
    const running = quests.map((q, k) => ({ q, k })).filter(({ q }) => q.active && !q.done);
    const waiting = quests.filter((q, k) => k < open && !q.done && !q.active).length;
    const more = quests.length - open;
    let fact: Fact;
    let text: string;
    if (running.length > 0) {
        fact = wait(Math.min(...running.map(({ k }) => questSecondsLeft(state, props.stats, k))), "Done");
        text = `${running.length} under way${waiting > 0 ? ` · ${waiting} waiting` : ""}`;
    } else if (waiting > 0) {
        [fact, text] = [{ fact: "—", status: "stuck", tip: "No quest under way" }, `${waiting} waiting for a hero`];
    } else {
        [fact, text] = [DONE, more > 0 ? `every open quest done · ${more} more as rivals fall` : "every quest of this Ascension done"];
    }
    return (
        <Line icon="⚑" label="Quests" tab="quests" onOpen={props.onOpen} auto="quests" fact={fact}>
            {text}
        </Line>
    );
}

/** Myrror's siege, with the share of the army sent there */
function MyrrorLine(props: { state: GameState; stats: Stats; onOpen: OpenTab }) {
    const { state } = props;
    const t = myrrorTarget(state);
    const share = myrrorShare(state);
    let fact: Fact;
    let text: string;
    if (!t) [fact, text] = [DONE, "all of Myrror is yours"];
    else if (state.mastery.challenge) [fact, text] = [{ fact: "paused", status: "stuck" }, `paused during ${state.mastery.challenge}'s challenge`];
    else if (share <= 0) [fact, text] = [{ fact: "—", status: "stuck" }, "no troops sent"];
    else {
        const power = myrrorPower(state, props.stats, t.traits);
        const eta = power.gt(0) ? t.defense.minus(state.planes.myrror!.siege).div(power).toNumber() : Infinity;
        fact = wait(eta, "Taken");
        text = `${Math.round(share * 100)}% of the army besieging ${t.name}${eta > TOO_LONG ? " · too strong for now" : ""}`;
    }
    return (
        <Line icon="❖" label="Myrror" tab="planes" onOpen={props.onOpen} auto="works" fact={fact}>
            {text}
        </Line>
    );
}

/** What the Mastery layer is waiting on: a challenge, the Spell's channel, or the gate */
function MasteryLine(props: { state: GameState; stats: Stats; onOpen: OpenTab }) {
    const { state } = props;
    const m = state.mastery;
    const gate = masteryGate(state);
    const pct = Math.floor(m.progress.div(masteryCost(state)).toNumber() * 100);
    let fact: Fact;
    let text: string;
    if (m.challenge) {
        const goal = challengeGoalRivals(CHALLENGES[m.challenge]);
        [fact, text] = m.challengeDone
            ? [{ fact: "won", status: "ready" }, `${m.challenge}'s challenge is won: complete it`]
            : [{ fact: `${gate.arcanus}/${goal}`, status: "wait", tip: "Rivals banished" }, `${m.challenge}'s challenge · rivals banished`];
    } else if (m.cast) [fact, text] = [{ fact: "claim", status: "ready" }, "the Spell is cast: claim your Mastery"];
    else if (m.channelling) [fact, text] = [wait(masterySecondsLeft(state, props.stats), "Cast"), `channelling the Spell: ${pct}%`];
    else if (m.progress.gt(0)) [fact, text] = [{ fact: `${pct}%`, status: "stuck" }, "of the Spell channelled (paused)"];
    else if (gate.ready)
        [fact, text] = [
            { fact: "now", status: "ready" },
            knowsSpell(state, SPELL_OF_MASTERY) ? "every rival wizard has fallen: channel the Spell" : "every rival wizard has fallen: research the Spell",
        ];
    else
        [fact, text] = [
            { fact: `${gate.myrran + gate.arcanus}/${MYRROR_WIZARDS + ARCANUS_WIZARDS}`, status: "wait", tip: "Rival wizards fallen" },
            `Myrran wizards ${gate.myrran}/${MYRROR_WIZARDS} · Arcanus rivals ${gate.arcanus}/${ARCANUS_WIZARDS} this Ascension`,
        ];
    return (
        <Line icon="★" label="Mastery" tab="mastery" onOpen={props.onOpen} fact={fact}>
            {text}
        </Line>
    );
}
