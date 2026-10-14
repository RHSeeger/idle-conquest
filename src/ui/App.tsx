import { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { isLoreUnlocked } from "../engine/actions";
import { currentTarget, siegePower } from "../engine/army";
import { getStats } from "../engine/collect";
import { Decimal } from "../engine/decimal";
import { realmEconomy } from "../engine/economy";
import { fmt, fmtInt, fmtSigned, fmtTime } from "../engine/format";
import { ArmyPanel, armyActivity } from "./ArmyPanel";
import { BuildingsPanel } from "./BuildingsPanel";
import { BreakdownView, CURRENCY_ICON, Tip } from "./components";
import { ConfirmHost } from "./Confirm";
import { game, useTicker } from "./game";
import { LorePanel } from "./LorePanel";
import { OfflineSummary, OfflineReport } from "./OfflineReport";
import { OptionsPanel } from "./OptionsPanel";
import { AboutPanel, AboutSection, Footer } from "./AboutPanel";
import { FamePanel, isRefoundShown, PrestigePanel } from "./PrestigePanel";
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
import { JumpBar } from "./kit";
import { ResetReportCard } from "./ResetReport";
import { QuestsPanel } from "./QuestsPanel";
import { WildsPanel } from "./WildsPanel";
import { insightOnAscend, planeshiftProgress } from "../engine/ascension";
import { essenceOnPlaneshift, isMyrrorOpen } from "../engine/planes";

type TabId =
    | "fame"
    | "buildings"
    | "army"
    | "lore"
    | "explore"
    | "magic"
    | "prestige"
    | "ascension"
    | "quests"
    | "planes"
    | "wilds"
    | "mastery"
    | "stats"
    | "options"
    | "about";

/**
 * The tab bar's groups, one per layer (in the layer's colour) and the utilities;
 * each group's tabs share a tint (TODO #44)
 */
type TabGroup = "kingdom" | "wizard" | "planes" | "mastery" | "utility";

interface TabDef {
    id: TabId;
    label: string;
    group: TabGroup;
    visible: () => boolean;
    render: () => ComponentChildren;
}

const TABS: TabDef[] = [
    // the id is from when this tab held the Refound too; kept for old ?tab= links
    { id: "prestige", label: "Kingdom", group: "kingdom", visible: () => true, render: () => <PrestigePanel /> },
    { id: "fame", label: "Fame", group: "kingdom", visible: () => isRefoundShown(game()), render: () => <FamePanel /> },
    { id: "buildings", label: "Buildings", group: "kingdom", visible: () => true, render: () => <BuildingsPanel /> },
    { id: "army", label: "Army", group: "kingdom", visible: () => true, render: () => <ArmyPanel /> },
    { id: "lore", label: "Lore", group: "kingdom", visible: () => isLoreUnlocked(game()), render: () => <LorePanel /> },
    {
        id: "explore",
        label: "Exploration",
        group: "kingdom",
        visible: () => isExplorationUnlocked(game()),
        render: () => <ExplorationPanel />,
    },
    { id: "magic", label: "Magic", group: "wizard", visible: () => isWizard(game()), render: () => <MagicPanel /> },
    { id: "quests", label: "Quests", group: "wizard", visible: () => isWizard(game()), render: () => <QuestsPanel /> },
    {
        id: "ascension",
        label: "Ascension",
        group: "wizard",
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
        group: "planes",
        visible: () => {
            const s = game();
            const gate = planeshiftProgress(s);
            return s.planes.planeshifts > 0 || gate.towerUnsealed || gate.riteKnown;
        },
        render: () => <PlanesPanel />,
    },
    { id: "wilds", label: "Wilds", group: "planes", visible: () => isMyrrorOpen(game()), render: () => <WildsPanel /> },
    { id: "mastery", label: "Mastery", group: "mastery", visible: () => isMasteryTabVisible(game()), render: () => <MasteryPanel /> },
    {
        id: "stats",
        label: "Statistics",
        group: "utility",
        visible: () => game().records.totalRefounds > 0 || game().ascension.ascensions > 0,
        render: () => <StatsPanel />,
    },
    { id: "options", label: "Options", group: "utility", visible: () => true, render: () => <OptionsPanel /> },
    // rendered by App itself, which keeps the About section
    { id: "about", label: "About", group: "utility", visible: () => true, render: () => null },
];

/** One box of the resource bar; `short` is its rate in the one-line strip (omitted: the strip shows just the amount) */
interface ResourceItem {
    cls: string;
    icon: string;
    name: string;
    amount: string;
    rate: string;
    short?: string;
    tip?: ComponentChildren;
}

function resourceItems(): ResourceItem[] {
    const state = game();
    const stats = getStats(state);
    const econ = realmEconomy(state, stats);
    const run = state.run;
    const target = currentTarget(state);
    const siege = siegePower(state, stats, target?.traits ?? []);
    const flow = (cls: string, icon: string, name: string, amount: Decimal, rate: Decimal, tip: ComponentChildren): ResourceItem => {
        const r = `${fmtSigned(rate)}/s`;
        return { cls, icon, name, amount: fmt(amount), rate: r, short: r, tip };
    };
    const items: ResourceItem[] = [
        flow("production", CURRENCY_ICON.production, "Production", run.production, econ.production, <BreakdownView stats={stats} stat="prod.mult" title="Production multiplier" />),
        flow(
            "gold",
            CURRENCY_ICON.gold,
            "Gold",
            run.gold,
            econ.gold.plus(manaRate(state, stats).times(stats.get("gold.fromMana"))),
            <BreakdownView stats={stats} stat="gold.mult" title="Gold multiplier" />,
        ),
        flow("food", CURRENCY_ICON.food, "Food", run.food, econ.food, <BreakdownView stats={stats} stat="food.flat" title="Surplus food per city" />),
    ];
    if (isLoreUnlocked(state)) {
        items.push(
            flow("knowledge", CURRENCY_ICON.knowledge, "Knowledge", run.knowledge, econ.knowledge, <BreakdownView stats={stats} stat="knowledge.perPop" title="Knowledge per citizen" />),
        );
    }
    items.push({ cls: "pop", icon: "☗", name: "Population", amount: fmt(econ.population * 1000), rate: `${run.cities.length} cities` });
    if (isWizard(state)) {
        items.push(flow("mana", CURRENCY_ICON.mana, "Mana", run.mana, manaRate(state, stats), <BreakdownView stats={stats} stat="mana.mult" title="Mana multiplier" />));
    }
    // once Fame has been seen: it stays through Ascensions (unspent, or from Echo of Glory)
    if (state.prestige.fameTotal.gt(0) || state.prestige.fame.gt(0) || canRefound(state) || state.ascension.ascensions > 0 || state.planes.planeshifts > 0) {
        items.push({ cls: "fame", icon: "✦", name: "Fame", amount: fmtInt(state.prestige.fame), rate: `+${fmtInt(fameOnRefound(state))} on Refound` });
    }
    if (state.ascension.insightTotal.gt(0) || state.planes.planeshifts > 0) {
        items.push({ cls: "insight", icon: "◈", name: "Insight", amount: fmtInt(state.ascension.insight), rate: `+${fmtInt(insightOnAscend(state))} on Ascension` });
    }
    if (state.planes.planeshifts > 0) {
        const rate = isMyrrorOpen(state) ? `+${fmtInt(essenceOnPlaneshift(state))} on Planeshift` : "";
        items.push({ cls: "essence", icon: "❖", name: "Essence", amount: fmtInt(state.planes.essence), rate });
    }
    if (state.mastery.masteries > 0) {
        items.push({ cls: "mastery", icon: "★", name: "Mastery", amount: fmtInt(state.mastery.masteries), rate: `×${fmtInt(masteryBonus(state))} income` });
    }
    items.push({ cls: "siege", icon: "⚔", name: "Army", amount: `${fmt(siege)}/s`, rate: armyActivity(state) });
    return items;
}

function Resource(props: { item: ResourceItem }) {
    const it = props.item;
    const body = (
        <div class={"resource " + it.cls}>
            <span class="resource-name">
                {it.icon} {it.name}
            </span>
            <span class="resource-amount">{it.amount}</span>
            <span class="resource-rate" title={it.cls === "siege" ? it.rate : undefined}>
                {it.rate}
            </span>
        </div>
    );
    return it.tip ? <Tip tip={it.tip}>{body}</Tip> : body;
}

/** The strip's sizes in px, as in styles.css: an item, the extra for a rate, the gap, and the padding at both ends */
const STRIP_ITEM = 100;
const STRIP_RATE = 65;
const STRIP_GAP = 8;
const STRIP_PAD = 32;

/**
 * The resource boxes; once they scroll out of view, a one-line strip of icons
 * and numbers takes their place at the top of the window (TODO #32)
 */
function ResourceBar(props: { onCompact: (compact: boolean) => void }) {
    const items = resourceItems();
    const ref = useRef<HTMLDivElement>(null);
    const [compact, setCompact] = useState(false);
    // the strip shows rates only if every item fits with them at its full width (see .strip-item)
    const rated = items.filter((it) => it.short).length;
    const withRates = items.length * (STRIP_ITEM + STRIP_GAP) + rated * STRIP_RATE + STRIP_PAD <= window.innerWidth;
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(([entry]) => {
            const out = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            setCompact(out);
            props.onCompact(out);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return (
        <>
            <div class="resources" ref={ref}>
                {items.map((it) => (
                    <Resource key={it.cls} item={it} />
                ))}
            </div>
            {compact && (
                <div class="resource-strip" aria-hidden="true">
                    {items.map((it) => (
                        <span
                            key={it.cls}
                            class={"strip-item " + it.cls + (it.short && withRates ? " has-rate" : "")}
                            title={`${it.name}: ${it.amount}${it.rate ? " · " + it.rate : ""}`}
                        >
                            {it.icon} <span class="resource-amount">{it.amount}</span>
                            {it.short && withRates && <span class="strip-rate"> {it.short}</span>}
                        </span>
                    ))}
                </div>
            )}
        </>
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
    // the resource strip is showing: the jump bar sits under it
    const [compact, setCompact] = useState(false);
    const state = game();
    const visible = TABS.filter((t) => t.visible());
    const active = visible.find((t) => t.id === tab) ?? visible[0];
    const openAbout = (s: AboutSection) => {
        setAboutSection(s);
        setTab("about");
    };

    return (
        <div class={"app" + (compact ? " compact-resources" : "")}>
            <header>
                <h1>Idle Conquest</h1>
                <span class="hint">
                    Kingdom {fmtTime(state.run.time)} · Total {fmtTime(state.meta.playtime)}
                </span>
                <button class="link tribute" onClick={() => openAbout("tribute")}>
                    A tribute to Master of Magic (1994)
                </button>
            </header>
            <ResourceBar onCompact={setCompact} />
            <Overview onOpen={(t) => setTab(t as TabId)} />
            <nav class="tabs">
                {visible.map((t, i) => {
                    const attention = tabAttention(state, t.id);
                    const groupStart = i > 0 && visible[i - 1].group !== t.group;
                    return (
                        <button
                            key={t.id}
                            class={"tab group-" + t.group + (groupStart ? " group-start" : "") + (t.id === active.id ? " active" : "")}
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
            <ResetReportCard />
            <div class="main">
                <main>
                    <TabIntro tab={active.id} />
                    <JumpBar key={active.id} />
                    {active.id === "about" ? <AboutPanel section={aboutSection} onSection={setAboutSection} /> : active.render()}
                </main>
                <Log />
            </div>
            <Footer onAbout={openAbout} />
            {offline && <OfflineReport summary={offline} onClose={() => setOffline(null)} />}
            {!offline && <Welcome />}
            {!offline && <Victory />}
            {!offline && <MasteryNotice />}
            <ConfirmHost />
        </div>
    );
}
