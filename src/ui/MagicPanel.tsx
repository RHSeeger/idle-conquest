import { LAIRS } from "../content/exploration";
import { REALM_DEFS, REALMS } from "../content/magic";
import { RARITY_BOOKS, RARITY_NAMES, SPELLS, SPELL_ORDER, SpellDef, SpellRealm } from "../content/spells";
import { currentTarget, siegePower } from "../engine/army";
import { getStats } from "../engine/collect";
import { lairTarget } from "../engine/exploration";
import { fmt, fmtTime } from "../engine/format";
import {
    booksIn,
    canCastEnchantment,
    canCastInstant,
    canResearch,
    castEnchantment,
    dormantSpells,
    castInstant,
    enchantmentCost,
    fortressMana,
    instantCost,
    knowsSpell,
    manaRate,
    meldedNodes,
    NODE_BONUS,
    research,
    researchCost,
    spellAvailable,
    spellMemoryLevel,
    towerCleared,
} from "../engine/magic";
import { GameState } from "../engine/state";
import { AutoToggle } from "./AutoToggle";
import { INSTANT_RESERVE_SECONDS } from "../engine/automation";
import { BreakdownView, Price, Tip } from "./components";
import { game } from "./game";
import { CurrentProfile } from "./AscensionPanel";

const REALM_LABEL: Record<SpellRealm, string> = { arcane: "Arcane", ...Object.fromEntries(REALMS.map((r) => [r, REALM_DEFS[r].name])) } as Record<
    SpellRealm,
    string
>;

function SpellAction(props: { state: GameState; spell: SpellDef }) {
    const { state, spell } = props;
    const stats = getStats(state);
    if (!knowsSpell(state, spell.id)) {
        return (
            <span class="spell-action">
                <button disabled={!canResearch(state, spell.id)} onClick={() => research(state, spell.id)}>
                    Research
                </button>
                <Price amount={researchCost(state, stats, spell)} currency="knowledge" have={state.run.knowledge} />
            </span>
        );
    }
    switch (spell.kind) {
        case "enchantment":
            if (state.run.enchantments.includes(spell.id)) {
                return <span class="good">Active</span>;
            }
            return (
                <span class="spell-action">
                    <button disabled={!canCastEnchantment(state, spell.id)} onClick={() => castEnchantment(state, spell.id)}>
                        Cast
                    </button>
                    <Price amount={enchantmentCost(spell)} currency="mana" have={state.run.mana} />
                </span>
            );
        case "instant": {
            const cooldown = state.run.cooldowns[spell.id] ?? 0;
            const lair = lairTarget(state);
            const traits = lair ? lair.traits : (currentTarget(state)?.traits ?? []);
            return (
                <span class="spell-action">
                    <button
                        disabled={!canCastInstant(state, spell.id)}
                        onClick={() => castInstant(state, spell.id, siegePower(state, stats, traits))}
                    >
                        {cooldown > 0 ? fmtTime(cooldown) : "Cast"}
                    </button>
                    <Tip tip={`A fixed price: the more mana you make, the more often you can cast it (up to once every ${fmtTime(spell.cooldown ?? 0)}). Its siege burst grows with your army. Auto-recruit leaves mana for instants you can afford within ${fmtTime(INSTANT_RESERVE_SECONDS)} of income.`}>
                        <Price amount={instantCost(spell)} currency="mana" have={state.run.mana} />
                        <span class="hint"> (every {fmtTime(spell.cooldown ?? 0)})</span>
                    </Tip>
                </span>
            );
        }
        case "summon":
            return <span class="hint">Known: conjure them in the Army tab</span>;
        case "utility":
            return <span class="good">Known</span>;
    }
}

function RealmSpells(props: { realm: SpellRealm }) {
    const state = game();
    const spells = SPELL_ORDER.map((id) => SPELLS[id]).filter((s) => s.realm === props.realm);
    const books = props.realm === "arcane" ? null : booksIn(state, props.realm);
    return (
        <section class={"realm-" + props.realm}>
            <h2 class="realm-head">
                {REALM_LABEL[props.realm]}{" "}
                <span class="count">{books === null ? "· known to every wizard" : `· ${books} book${books === 1 ? "" : "s"}`}</span>
            </h2>
            <table class="spells">
                <tbody>
                    {spells.map((s) => {
                        const available = spellAvailable(state, s);
                        return (
                            <tr key={s.id} class={available ? "" : "unavailable"}>
                                <td class="spell-name">{s.name}</td>
                                <td class="hint">
                                    {RARITY_NAMES[s.rarity]} {s.kind}
                                </td>
                                <td>{s.text}</td>
                                <td class="buy">
                                    {available ? (
                                        <SpellAction state={state} spell={s} />
                                    ) : (
                                        <span class="hint">
                                            {state.ascension.spellMemory.includes(s.id) && !knowsSpell(state, s.id) && (
                                                <span class="insight" title="Spell Memory: known again once your profile has the books">
                                                    remembered ·{" "}
                                                </span>
                                            )}
                                            {s.requiresTower && !towerCleared(state)
                                                ? "needs a Tower of Wizardry cleared this run"
                                                : `needs ${RARITY_BOOKS[s.rarity]} books`}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}

/** Spell Memory: remembered spells the profile lacks the books for, grouped by realm */
function DormantSpells() {
    const state = game();
    const dormant = dormantSpells(state).map((id) => SPELLS[id]).filter((s) => s);
    if (dormant.length === 0) return null;
    const byRealm = REALMS.map((r) => ({ realm: r, spells: dormant.filter((s) => s.realm === r) })).filter((g) => g.spells.length > 0);
    return (
        <p class="hint">
            <span class="insight">Spell Memory:</span> {dormant.length} remembered spell{dormant.length === 1 ? "" : "s"} wait for
            the books to use them:{" "}
            {byRealm
                .map((g) => `${REALM_DEFS[g.realm].name} (${g.spells.map((s) => `${s.name}, ${RARITY_BOOKS[s.rarity]} books`).join("; ")})`)
                .join(" · ")}
            .
        </p>
    );
}

export function MagicPanel() {
    const state = game();
    const stats = getStats(state);
    const realms: SpellRealm[] = ["arcane", ...REALMS.filter((r) => booksIn(state, r) > 0)];
    const nodes = meldedNodes(state);
    const unmelded = state.run.sites.filter((s) => s.cleared && LAIRS[s.type]?.magicNode).length - nodes.length;

    return (
        <div class="panel">
            <section>
                <h2>
                    Mana <span class="mana">{fmt(state.run.mana)}</span>{" "}
                    <Tip tip={<BreakdownView stats={stats} stat="mana.mult" title="Mana multiplier" />}>
                        <span class="count">+{fmt(manaRate(state, stats))}/s</span>
                    </Tip>
                    <AutoToggle kind="research" label="Auto-research" />
                    <AutoToggle kind="cast" label="Auto-cast" />
                </h2>
                <p class="hint">
                    Your Fortress channels {fortressMana(state)} mana/s (1 + one per spellbook). Shrines, Temples and
                    Cathedrals add mana in every city; the Wizards' Guild and melded magic nodes multiply it. Spells are
                    researched with Knowledge and stay known until you Ascend again
                    {spellMemoryLevel(state) > 0 && " (Spell Memory brings them back after an Ascension, if your profile has the books)"}.
                    Enchantments last until the end of the run.
                </p>
                <CurrentProfile />
                <DormantSpells />
                {(nodes.length > 0 || unmelded > 0) && (
                    <p>
                        Magic nodes: {nodes.map((n) => `${LAIRS[n].name} (${NODE_BONUS[n]?.text})`).join(", ") || "none melded"}
                        {unmelded > 0 && <span class="bad"> · {unmelded} cleared node(s) need Magic Spirit to meld</span>}
                    </p>
                )}
            </section>
            {realms.map((r) => (
                <RealmSpells key={r} realm={r} />
            ))}
        </div>
    );
}
