import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { isLoreUnlocked } from "../engine/actions";
import { currentTarget, siegePower } from "../engine/army";
import { getStats } from "../engine/collect";
import { Decimal } from "../engine/decimal";
import { realmEconomy } from "../engine/economy";
import { fmt, fmtInt, fmtSigned, fmtTime } from "../engine/format";
import { ArmyPanel, armyActivity } from "./ArmyPanel";
import { BuildingsPanel } from "./BuildingsPanel";
import { BreakdownView, CURRENCY_ICON, Tip } from "./components";
import { game, useTicker } from "./game";
import { LorePanel } from "./LorePanel";
import { OfflineSummary, OfflineReport } from "./OfflineReport";
import { OptionsPanel } from "./OptionsPanel";
import { AboutPanel, AboutSection, Footer } from "./AboutPanel";
import { PrestigePanel } from "./PrestigePanel";
import { canRefound, fameOnRefound } from "../engine/prestige";
import { isExplorationUnlocked } from "../engine/exploration";
import { ExplorationPanel } from "./ExplorationPanel";
import { AscensionPanel } from "./AscensionPanel";
import { MagicPanel } from "./MagicPanel";
import { StatsPanel } from "./StatsPanel";
import { GoalBar } from "./Goal";
import { TabIntro, tabIsNew, Welcome } from "./Intro";
import { ChallengeBanner, isMasteryTabVisible, MasteryNotice, MasteryPanel, Victory } from "./MasteryPanel";
import { masteryBonus } from "../engine/mastery";
import { tabAttention } from "./attention";
import { isWizard, manaRate } from "../engine/magic";
import { Overview } from "./Overview";
import { PlanesPanel } from "./PlanesPanel";
import { planeshiftProgress } from "../engine/ascension";
import { essenceOnPlaneshift, isMyrrorOpen } from "../engine/planes";

type TabId =
    | "buildings"
    | "army"
    | "lore"
    | "explore"
    | "magic"
    | "prestige"
    | "ascension"
    | "planes"
    | "mastery"
    | "stats"
    | "options"
    | "about";

interface TabDef {
    id: TabId;
    label: string;
    visible: () => boolean;
    render: () => ComponentChildren;
}

const TABS: TabDef[] = [
    // named for the layer, like Ascension, Planes and Mastery (Refound is the verb); the id is kept for saves
    { id: "prestige", label: "Kingdom", visible: () => true, render: () => <PrestigePanel /> },
    { id: "buildings", label: "Buildings", visible: () => true, render: () => <BuildingsPanel /> },
    { id: "army", label: "Army", visible: () => true, render: () => <ArmyPanel /> },
    { id: "lore", label: "Lore", visible: () => isLoreUnlocked(game()), render: () => <LorePanel /> },
    {
        id: "explore",
        label: "Exploration",
        visible: () => isExplorationUnlocked(game()),
        render: () => <ExplorationPanel />,
    },
    { id: "magic", label: "Magic", visible: () => isWizard(game()), render: () => <MagicPanel /> },
    {
        id: "ascension",
        label: "Ascension",
        // not in the very first kingdom: it has enough to take in already
        visible: () => {
            const s = game();
            return (
                s.ascension.ascensions > 0 ||
                s.run.buildings.includes("wizardsGuild") ||
                (s.prestige.realmsSeen.length > 0 && s.prestige.refounds > 0)
            );
        },
        render: () => <AscensionPanel />,
    },
    {
        id: "planes",
        label: "Planes",
        visible: () => {
            const s = game();
            const gate = planeshiftProgress(s);
            return s.planes.planeshifts > 0 || gate.towerUnsealed || gate.riteKnown;
        },
        render: () => <PlanesPanel />,
    },
    { id: "mastery", label: "Mastery", visible: () => isMasteryTabVisible(game()), render: () => <MasteryPanel /> },
    {
        id: "stats",
        label: "Statistics",
        visible: () => game().records.totalRefounds > 0 || game().ascension.ascensions > 0,
        render: () => <StatsPanel />,
    },
    { id: "options", label: "Options", visible: () => true, render: () => <OptionsPanel /> },
    // rendered by App itself, which keeps the About section
    { id: "about", label: "About", visible: () => true, render: () => null },
];

function Resource(props: { icon: string; name: string; amount: Decimal; rate: Decimal; tip?: ComponentChildren; cls: string }) {
    const body = (
        <div class={"resource " + props.cls}>
            <span class="resource-name">
                {props.icon} {props.name}
            </span>
            <span class="resource-amount">{fmt(props.amount)}</span>
            <span class="resource-rate">{fmtSigned(props.rate)}/s</span>
        </div>
    );
    return props.tip ? <Tip tip={props.tip}>{body}</Tip> : body;
}

function ResourceBar() {
    const state = game();
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const run = state.run;
    const target = currentTarget(state);
    const siege = siegePower(state, stats, target?.traits ?? []);
    return (
        <div class="resources">
            <Resource
                cls="production"
                icon={CURRENCY_ICON.production}
                name="Production"
                amount={run.production}
                rate={econ.production}
                tip={<BreakdownView stats={stats} stat="prod.mult" title="Production multiplier" />}
            />
            <Resource
                cls="gold"
                icon={CURRENCY_ICON.gold}
                name="Gold"
                amount={run.gold}
                rate={econ.gold.plus(manaRate(state, stats).times(stats.get("gold.fromMana")))}
                tip={<BreakdownView stats={stats} stat="gold.mult" title="Gold multiplier" />}
            />
            <Resource
                cls="food"
                icon={CURRENCY_ICON.food}
                name="Food"
                amount={run.food}
                rate={econ.food}
                tip={<BreakdownView stats={stats} stat="food.flat" title="Surplus food per city" />}
            />
            {isLoreUnlocked(state) && (
                <Resource
                    cls="knowledge"
                    icon={CURRENCY_ICON.knowledge}
                    name="Knowledge"
                    amount={run.knowledge}
                    rate={econ.knowledge}
                    tip={<BreakdownView stats={stats} stat="knowledge.perPop" title="Knowledge per citizen" />}
                />
            )}
            <div class="resource pop">
                <span class="resource-name">☗ Population</span>
                <span class="resource-amount">{fmt(econ.population * 1000)}</span>
                <span class="resource-rate">{run.cities.length} cities</span>
            </div>
            {isWizard(state) && (
                <Resource
                    cls="mana"
                    icon={CURRENCY_ICON.mana}
                    name="Mana"
                    amount={run.mana}
                    rate={manaRate(state, stats)}
                    tip={<BreakdownView stats={stats} stat="mana.mult" title="Mana multiplier" />}
                />
            )}
            {(state.prestige.fameTotal.gt(0) || canRefound(state)) && (
                <div class="resource fame">
                    <span class="resource-name">✦ Fame</span>
                    <span class="resource-amount">{fmtInt(state.prestige.fame)}</span>
                    <span class="resource-rate">+{fmtInt(fameOnRefound(state))} on refound</span>
                </div>
            )}
            {(state.ascension.insightTotal.gt(0) || state.planes.planeshifts > 0) && (
                <div class="resource insight">
                    <span class="resource-name">◈ Insight</span>
                    <span class="resource-amount">{fmtInt(state.ascension.insight)}</span>
                    <span class="resource-rate">{state.ascension.ascensions} ascensions</span>
                </div>
            )}
            {state.planes.planeshifts > 0 && (
                <div class="resource essence">
                    <span class="resource-name">❖ Essence</span>
                    <span class="resource-amount">{fmtInt(state.planes.essence)}</span>
                    <span class="resource-rate">
                        {isMyrrorOpen(state) ? `+${fmtInt(essenceOnPlaneshift(state))} on Planeshift` : ""}
                    </span>
                </div>
            )}
            {state.mastery.masteries > 0 && (
                <div class="resource mastery">
                    <span class="resource-name">★ Mastery</span>
                    <span class="resource-amount">{fmtInt(state.mastery.masteries)}</span>
                    <span class="resource-rate">×{fmtInt(masteryBonus(state))} income</span>
                </div>
            )}
            <div class="resource siege">
                <span class="resource-name">⚔ Army</span>
                <span class="resource-amount">{fmt(siege)}/s</span>
                <span class="resource-rate">{armyActivity(state)}</span>
            </div>
        </div>
    );
}

function Log() {
    const state = game();
    const entries = state.log.slice(-40).reverse();
    return (
        <aside class="log">
            <h3>Chronicle</h3>
            {entries.length === 0 && <p class="hint">Your story has yet to be written.</p>}
            {entries.map((e, i) => (
                <div key={i} class={"log-entry " + e.kind}>
                    <span class="log-time">{fmtTime(e.t)}</span> {e.text}
                </div>
            ))}
        </aside>
    );
}

export function App(props: { offline: OfflineSummary | null; initialTab?: string }) {
    useTicker(10);
    // "realm" was the first tab's id before it became part of the Kingdom tab (old ?tab= links)
    const [tab, setTab] = useState<TabId>(props.initialTab === "realm" || !props.initialTab ? "prestige" : (props.initialTab as TabId));
    const [offline, setOffline] = useState(props.offline);
    const [aboutSection, setAboutSection] = useState<AboutSection>("howto");
    const state = game();
    const visible = TABS.filter((t) => t.visible());
    const active = visible.find((t) => t.id === tab) ?? visible[0];
    const openAbout = (s: AboutSection) => {
        setAboutSection(s);
        setTab("about");
    };

    return (
        <div class="app">
            <header>
                <h1>Idle Conquest</h1>
                <span class="hint">
                    Kingdom {fmtTime(state.run.time)} · Total {fmtTime(state.meta.playtime)}
                </span>
                <button class="link tribute" onClick={() => openAbout("tribute")}>
                    A tribute to Master of Magic (1994)
                </button>
            </header>
            <ResourceBar />
            <Overview onOpen={(t) => setTab(t as TabId)} />
            <nav class="tabs">
                {visible.map((t) => {
                    const attention = tabAttention(state, t.id);
                    return (
                        <button
                            key={t.id}
                            class={"tab" + (t.id === active.id ? " active" : "")}
                            title={attention ?? undefined}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                            {attention ? (
                                <span class="tab-badge">!</span>
                            ) : (
                                t.id !== active.id && tabIsNew(state, t.id) && <span class="tab-new">new</span>
                            )}
                        </button>
                    );
                })}
            </nav>
            <GoalBar />
            <ChallengeBanner onOpen={() => setTab("mastery")} />
            <div class="main">
                <main>
                    <TabIntro tab={active.id} />
                    {active.id === "about" ? <AboutPanel section={aboutSection} onSection={setAboutSection} /> : active.render()}
                </main>
                <Log />
            </div>
            <Footer onAbout={openAbout} />
            {offline && <OfflineReport summary={offline} onClose={() => setOffline(null)} />}
            {!offline && <Welcome />}
            {!offline && <Victory />}
            {!offline && <MasteryNotice />}
        </div>
    );
}
