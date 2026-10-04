import { LAIRS, NODES } from "../content/exploration";
import { REALM_DEFS, REALMS } from "../content/magic";
import { TRAITS } from "../content/traits";
import { ascensionProgress, ASCENSION_BOOKS, ASCENSION_REALMS } from "../engine/ascension";
import { getStats } from "../engine/collect";
import {
    exploreSpeed,
    lairLoot,
    lairPower,
    lairTarget,
    nextSiteCost,
    setArmyTarget,
    siteName,
} from "../engine/exploration";
import { fmt, fmtTime } from "../engine/format";
import { AutoToggle } from "./AutoToggle";
import { ProgressBar, Tip } from "./components";
import { game } from "./game";

export function ExplorationPanel() {
    const state = game();
    const stats = getStats(state);
    const run = state.run;
    const speed = exploreSpeed(state, stats);
    const cost = nextSiteCost(state);
    const target = lairTarget(state);

    const lairs = run.sites.filter((s) => s.kind === "lair");
    const nodeCounts: Record<string, number> = {};
    for (const s of run.sites) {
        if (s.kind === "node") nodeCounts[s.type] = (nodeCounts[s.type] ?? 0) + 1;
    }
    const asc = ascensionProgress(state);

    return (
        <div class="panel">
            <section>
                <h2>Expeditions</h2>
                <ProgressBar
                    class="explore"
                    fraction={run.exploreProgress / cost}
                    label={`Next discovery: ${fmtTime((cost - run.exploreProgress) / speed)} · speed ×${fmt(speed)} (more cities, more lands to explore)`}
                />
                <p class="hint">{run.sites.length} sites discovered this run.</p>
            </section>

            <section>
                <h2>
                    Monster lairs <AutoToggle kind="lairs" label="Auto-raid" />
                </h2>
                {lairs.length === 0 && <p class="hint">No lairs found yet.</p>}
                {target && (
                    <div class="target">
                        <div class="target-head">
                            Your army is raiding the <b>{siteName(target)}</b>
                            <button class="toggle" onClick={() => setArmyTarget(state, null)}>
                                Recall to the frontier
                            </button>
                        </div>
                        <ProgressBar
                            fraction={run.lairSiege.div(target.defense!).toNumber()}
                            label={`${fmt(run.lairSiege)} / ${fmt(target.defense!)} · ${fmt(lairPower(state, target))}/s`}
                        />
                    </div>
                )}
                <table>
                    <thead>
                        <tr>
                            <th>Lair</th>
                            <th>Monsters</th>
                            <th class="num">Defense</th>
                            <th class="num">Time to clear</th>
                            <th>Treasure</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {lairs.map((site) => {
                            const def = LAIRS[site.type];
                            const power = lairPower(state, site);
                            const seconds = power.gt(0) ? site.defense!.div(power).toNumber() : Infinity;
                            const loot = site.cleared ? null : lairLoot(state, site);
                            return (
                                <tr key={site.index} class={site.cleared ? "cleared" : ""}>
                                    <td>{def.name}</td>
                                    <td>
                                        {site.traits.length === 0 && <span class="hint">—</span>}
                                        {site.traits.map((t) => (
                                            <Tip key={t} tip={TRAITS[t].description}>
                                                <span class="trait">{TRAITS[t].name}</span>
                                            </Tip>
                                        ))}
                                    </td>
                                    <td class="num">{fmt(site.defense!)}</td>
                                    <td class="num">{site.cleared ? "cleared" : fmtTime(seconds)}</td>
                                    <td class="hint">
                                        {loot &&
                                            (def.bookChance >= 1
                                                ? "Spellbook, treasure"
                                                : `Treasure, ${Math.round(def.bookChance * 100)}% spellbook`)}
                                    </td>
                                    <td>
                                        {!site.cleared && target?.index !== site.index && (
                                            <button onClick={() => setArmyTarget(state, site.index)}>Raid</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <p class="hint">While raiding, your army stops besieging the frontier. Siege progress there is kept.</p>
            </section>

            <section>
                <h2>Resource sites</h2>
                {Object.keys(nodeCounts).length === 0 && <p class="hint">None yet.</p>}
                <ul class="built">
                    {Object.entries(nodeCounts).map(([id, n]) => (
                        <li key={id}>
                            <b>
                                {NODES[id].name} ×{n}
                            </b>{" "}
                            <span class="hint">{NODES[id].text} each</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2>Spellbooks</h2>
                <div class="books">
                    {REALMS.map((r) => (
                        <div key={r} class={"book realm-" + r + ((run.spellbooks[r] ?? 0) > 0 ? "" : " none")}>
                            <b>{REALM_DEFS[r].name}</b> ×{run.spellbooks[r] ?? 0}
                            <div class="hint">{REALM_DEFS[r].perBookText}</div>
                        </div>
                    ))}
                </div>
                <p class="hint">
                    You are no wizard, but your scholars puzzle over these books. With a <b>Wizards' Guild</b>{" "}
                    {asc.wizardsGuild ? "✓" : "✗"} and {ASCENSION_BOOKS} books ({asc.books}) from {ASCENSION_REALMS} realms (
                    {asc.realms}), you could learn to wield magic yourself.
                </p>
            </section>
        </div>
    );
}
