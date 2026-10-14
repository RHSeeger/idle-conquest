/**
 * The Forge tab (DESIGN.md §18): artifact recipes known, forging from Myrran
 * resources, the vault, and each hero's three slots. In the Planes group,
 * after Wilds. Hero cards (Army tab) show what each hero has on.
 */
import { POWER_NAMES, powerText, RECIPE_ORDER, RECIPES, SLOT_NAMES, SLOT_RESOURCE } from "../content/artifacts";
import { HEROES } from "../content/heroes";
import { REALM_DEFS, REALMS } from "../content/magic";
import { MYRRAN_RESOURCES, RESOURCE_DEFS } from "../content/myrror";
import { canForge, copiesOf, equip, forge, forgeCost, heroSlots, itemInSlot, items, itemsOn, knowsRecipe, unequip, vaultFor } from "../engine/artifacts";
import { heroesAllowed } from "../engine/heroes";
import { AutoToggle } from "./AutoToggle";
import { game } from "./game";
import { Chip, HowItWorks, Notice, Part, SectionHead } from "./kit";

const fmtRes = (n: number) => String(Number(n.toFixed(1)));

/** What a hero has on, as chips (hero cards); nothing if they have none */
export function HeroItems(props: { heroId: string }) {
    const state = game();
    const on = itemsOn(state, props.heroId);
    if (on.length === 0) return null;
    return (
        <div class="chips">
            <span class="chips-label">Artifacts</span>
            {on.map((i, k) => {
                const r = RECIPES[i.recipe];
                return (
                    <Chip key={k} realm={r.realm} title={powerText(r)}>
                        {r.name}
                    </Chip>
                );
            })}
        </div>
    );
}

function Recipes() {
    const state = game();
    const m = state.planes.myrror;
    const known = RECIPE_ORDER.filter((id) => knowsRecipe(state, id));
    const unknown = REALMS.map((realm) => ({ realm, n: RECIPE_ORDER.filter((id) => RECIPES[id].realm === realm && !knowsRecipe(state, id)).length })).filter((x) => x.n > 0);
    return (
        <Part title="Recipes" note={`${known.length} of ${RECIPE_ORDER.length} known`}>
            {known.length === 0 ? (
                <p class="hint">
                    No recipes yet. Myrror's sites teach them: a Sorcerer's Lair, Drake Nest, Behemoth Wallow, Wraith Keep or Sunken Shrine (Wilds tab)
                    teaches one of its guardian's realm. Recipes are yours for good.
                </p>
            ) : (
                <table class="nodes">
                    <thead>
                        <tr>
                            <th>Recipe</th>
                            <th>Slot</th>
                            <th>Power</th>
                            <th class="num">Cost</th>
                            <th class="num">Forged</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {known.map((id) => {
                            const r = RECIPES[id];
                            const res = RESOURCE_DEFS[SLOT_RESOURCE[r.slot]];
                            return (
                                <tr key={id}>
                                    <td>
                                        <Chip realm={r.realm}>{r.name}</Chip>
                                    </td>
                                    <td>{SLOT_NAMES[r.slot]}</td>
                                    <td>
                                        {POWER_NAMES[r.power]}: {powerText(r)}
                                    </td>
                                    <td class="num" title={res.name}>
                                        {res.icon} {fmtRes(forgeCost(state, id))}
                                    </td>
                                    <td class="num">{copiesOf(state, id)}</td>
                                    <td>
                                        <button disabled={!m || !canForge(state, id)} onClick={() => forge(state, id)}>
                                            Forge
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            {unknown.length > 0 && known.length > 0 && (
                <p class="hint">Still to learn: {unknown.map((u) => `${u.n} ${REALM_DEFS[u.realm].name}`).join(", ")} (from sites guarded by that realm).</p>
            )}
        </Part>
    );
}

/** Each hero's three slots, with a pick of the vault items that fit */
function Slots() {
    const state = game();
    const heroes = heroesAllowed(state) ? state.run.heroes : [];
    if (heroes.length === 0) return <p class="hint">You have no heroes in this kingdom: hire one at the Adventurers' Guild (Army tab).</p>;
    const all = items(state);
    return (
        <Part title="Your heroes">
            <table class="nodes">
                <tbody>
                    {heroes.map((h) => (
                        <tr key={h.id}>
                            <td>
                                <b>{HEROES[h.id].name}</b>
                            </td>
                            {heroSlots(h.id).map((kind, slot) => {
                                const current = itemInSlot(state, h.id, slot);
                                const currentIndex = current ? all.indexOf(current) : -1;
                                const options = vaultFor(state, kind);
                                return (
                                    <td key={slot}>
                                        <span class="hint">{SLOT_NAMES[kind]}: </span>
                                        <select
                                            value={String(currentIndex)}
                                            onChange={(e) => {
                                                const v = Number((e.target as HTMLSelectElement).value);
                                                if (v < 0) {
                                                    if (currentIndex >= 0) unequip(state, currentIndex);
                                                } else equip(state, v, h.id, slot);
                                            }}
                                        >
                                            <option value="-1">empty</option>
                                            {currentIndex >= 0 && (
                                                <option value={String(currentIndex)}>
                                                    {RECIPES[current!.recipe].name} ({powerText(RECIPES[current!.recipe])})
                                                </option>
                                            )}
                                            {options.map((i) => (
                                                <option key={i} value={String(i)}>
                                                    {RECIPES[all[i].recipe].name} ({powerText(RECIPES[all[i].recipe])})
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </Part>
    );
}

function Vault() {
    const state = game();
    const vault = items(state).filter((i) => i.hero === null);
    if (vault.length === 0) return null;
    return (
        <Part title="Vault" note={`${vault.length} not on a hero`}>
            <div class="chips">
                {vault.map((i, k) => {
                    const r = RECIPES[i.recipe];
                    return (
                        <Chip key={k} realm={r.realm} title={`${SLOT_NAMES[r.slot]}: ${powerText(r)}`}>
                            {r.name}
                        </Chip>
                    );
                })}
            </div>
        </Part>
    );
}

export function ForgePanel() {
    const state = game();
    const m = state.planes.myrror;
    return (
        <div class="panel">
            <section>
                <SectionHead title="The Forge" value={`${items(state).length}`} note="artifacts forged this Planeshift">
                    <AutoToggle kind="artifacts" label="Auto-forge" />
                </SectionHead>
                <HowItWorks id="forge.how">
                    <ul>
                        <li>
                            Myrror's sites teach <b>recipes</b>, which you keep for good. Forge items from them with Myrran resources: weapons,
                            bows and armour take Adamantium, staves Quork, jewels Crysx. Each copy of the same recipe costs twice the last.
                        </li>
                        <li>
                            Each hero has <b>three slots</b>, set by their calling: Warriors a weapon, armour and a jewel; Sages a staff and two
                            jewels; and so on. An item fits only a slot of its kind.
                        </li>
                        <li>
                            <b>Might</b> makes the hero's aura count as more levels. <b>Haste</b> speeds them on quests. <b>Lore</b> gives
                            them more experience.
                        </li>
                        <li>
                            Items last the Planeshift, like the resources they're made of. A hero who leaves you puts theirs back in the vault,
                            ready for the next one.
                        </li>
                    </ul>
                </HowItWorks>
                {state.mastery.challenge && <Notice kind="challenge">Artifacts are off during {state.mastery.challenge}'s challenge, as Myrror is.</Notice>}
                {m && (
                    <p>
                        On hand:{" "}
                        {MYRRAN_RESOURCES.map((r) => (
                            <span key={r} title={RESOURCE_DEFS[r].name}>
                                {RESOURCE_DEFS[r].icon} <b>{fmtRes(m.resources[r])}</b> {RESOURCE_DEFS[r].name}{" "}
                            </span>
                        ))}
                        <span class="hint">(shared with the Myrran works, Planes tab)</span>
                    </p>
                )}
                <Recipes />
                {m && <Slots />}
                {m && <Vault />}
            </section>
        </div>
    );
}
