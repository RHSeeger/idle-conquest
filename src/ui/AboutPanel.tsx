/**
 * About, in four sections: How to play; the tribute to Master of Magic, which
 * this game is built on (the same write-up is in README.md; keep the two in
 * step); To do & changes (content/changelog.ts); Credits & links (AI
 * disclosure, the code, support; README.md has the same disclosure). Plus
 * the page footer.
 */

import { ComponentChildren } from "preact";
import { CHANGES, PLANNED } from "../content/changelog";
import { HowToPlay } from "./Intro";

const GITHUB_URL = "https://github.com/RHSeeger/idle-conquest";

/** Set once the Patreon page exists; its links stay hidden until then */
const PATREON_URL: string | null = null;

function Ext(props: { href: string; children: ComponentChildren }) {
    return (
        <a href={props.href} target="_blank" rel="noopener noreferrer">
            {props.children}
        </a>
    );
}

function Tribute() {
    return (
        <>
            <section>
                <h2>A tribute to Master of Magic</h2>
                <p>
                    <b>Idle Conquest is heavily inspired by Master of Magic</b>, the fantasy strategy game designed by
                    Steve Barcia, developed by SimTex and published by MicroProse in 1994. Most of the terms and names in
                    this game come from Master of Magic, and so does the shape of the journey: a small settlement grows into a
                    realm, its ruler becomes a wizard, rival wizards fall, the way to a second world opens, and the Spell of
                    Mastery waits at the end of it all.
                </p>
                <p>
                    This game would not exist without it. If you enjoy Idle Conquest even a little, please play the
                    original: it is still the real thing.
                </p>
            </section>

            <section>
                <h2>Why it deserves the praise</h2>
                <p>
                    Master of Magic is one of the best-loved strategy games ever made. Few games give you so much to play
                    with: you build your own wizard from spellbooks and retorts, choose from over two hundred spells
                    across five realms of magic, lead fourteen races, recruit heroes, meld magic nodes and raid monster
                    lairs. And then you discover there is a whole second world, Myrror, on the other side of a Tower of
                    Wizardry. It is generous, surprising, and full of moments you remember for years.
                </p>
                <p>
                    It was inducted into the GameSpy and Computer Gaming World Halls of Fame and appeared on IGN's lists
                    of the greatest games of all time. In 2012, Eurogamer wrote that it hadn't yet been surpassed by any
                    other fantasy 4X game. Thirty years on it is still played, modded, re-released and remade, which
                    says more than any list.
                </p>
            </section>

            <section>
                <h2>What comes from Master of Magic</h2>
                <ul>
                    <li>
                        <b>The journey:</b> from a city to an empire, from ruler to wizard, from Arcanus to Myrror, and
                        finally the Spell of Mastery.
                    </li>
                    <li>
                        <b>The two planes:</b> Arcanus and Myrror, linked by Towers of Wizardry, and crossing between
                        them with Plane Shift.
                    </li>
                    <li>
                        <b>The races:</b> High Men, High Elves, Nomads, Orcs, Halflings, Barbarians, Gnolls and Lizardmen
                        of Arcanus; Beastmen, Dark Elves, Draconians, Dwarves, Klackons and Trolls of Myrror, with units
                        like War Trolls, Steam Cannons, Doom Drakes and Nightblades.
                    </li>
                    <li>
                        <b>Magic:</b> the realms of Life, Death, Chaos, Nature and Sorcery, plus Arcane; spellbook picks,
                        and Life and Death never mixing; retorts such as Warlord, Channeler, Archmage, Alchemy, Sage Master
                        and Divine Power; spells such as Magic Spirit, Dispel Magic, Armageddon and Plane Shift.
                    </li>
                    <li>
                        <b>The rival wizards:</b> Merlin, Raven, Sharee, Lo Pan, Jafar, Oberic, Rjak, Sss'ra, Tauron,
                        Freya, Horus, Ariel, Tlaloc and Kali, their Fortresses and their wards.
                    </li>
                    <li>
                        <b>Cities:</b> buildings such as the Builders' Hall, Smithy, Sawmill, Sages' Guild and Wizards'
                        Guild.
                    </li>
                    <li>
                        <b>The world:</b> magic nodes, monster lairs, ruins and Towers of Wizardry; heroes who grow with
                        experience; the riches of Myrror: Adamantium, Quork and Crysx.
                    </li>
                </ul>
            </section>

            <section>
                <h2>What's different</h2>
                <p>
                    Master of Magic is a turn-based 4X game with tactical battles. Idle Conquest is an incremental game,
                    so the numbers, effects and pacing are reinterpreted rather than faithful. The prestige layers
                    (Refound, Ascension, Planeshift) and their rewards (Fame, Insight, Planar Essence) are this game's
                    own way of turning that journey into something you return to again and again.
                </p>
            </section>

            <section>
                <h2>Play it, and read more</h2>
                <ul>
                    <li>
                        <Ext href="https://en.wikipedia.org/wiki/Master_of_Magic">Master of Magic (1994) on Wikipedia</Ext>
                    </li>
                    <li>
                        Master of Magic Classic, the original, re-released by Slitherine:{" "}
                        <Ext href="https://store.steampowered.com/app/1146370/Master_of_Magic/">Steam</Ext> ·{" "}
                        <Ext href="https://www.gog.com/en/game/master_of_magic_classic">GOG</Ext>
                    </li>
                    <li>
                        <Ext href="https://www.gog.com/en/game/master_of_magic_caster_of_magic">Caster of Magic</Ext>: Seravy's
                        fan-made overhaul of the original, now official DLC
                    </li>
                    <li>
                        Master of Magic (2022), the remake by MuHa Games and Slitherine:{" "}
                        <Ext href="https://en.wikipedia.org/wiki/Master_of_Magic_(2022_video_game)">Wikipedia</Ext> ·{" "}
                        <Ext href="https://store.steampowered.com/app/1623070/Master_of_Magic/">Steam</Ext>
                    </li>
                    <li>
                        <Ext href="https://www.filfre.net/2020/10/master-of-magic/">"Master of Magic"</Ext> by Jimmy Maher,
                        The Digital Antiquarian: the story of how the game was made
                    </li>
                    <li>
                        <Ext href="https://masterofmagic.fandom.com/">The Master of Magic Wiki</Ext>
                    </li>
                </ul>
                <p class="hint">
                    Idle Conquest is an unofficial fan project. It is not affiliated with or endorsed by SimTex,
                    MicroProse, Slitherine or MuHa Games. Master of Magic and its names belong to their respective owners.
                </p>
            </section>
        </>
    );
}

function Updates() {
    return (
        <>
            <section>
                <h2>To do</h2>
                <ul>
                    {PLANNED.map((p) => (
                        <li key={p}>{p}</li>
                    ))}
                </ul>
            </section>

            <section>
                <h2>Changes</h2>
                {CHANGES.map((c) => (
                    <div key={c.date}>
                        <h3>{c.date}</h3>
                        <ul>
                            {c.items.map((i) => (
                                <li key={i}>{i}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        </>
    );
}

function Credits() {
    return (
        <>
            <section>
                <h2>AI Disclosure</h2>
                <p>
                    Idle Conquest started manually implemented, before AI was really available to help with coding. I 
                    worked on it for a good while and the result was... something that didn't feel like an 
                    idle/incremental game at all. It was coming out to feel like a text based 4X game, which was not
                    what I was aiming for at all.
                </p>
                <p>
                    So then I started over - manually crafting the game, using TypeScript. And... after another good,
                    long while it started feeling like I was building a text based 4X game - again.
                </p>
                <p>
                    Eventually, when I had Claude Code available, I had it help me come up with a design the 
                    had many of the elements of Master of Magic, but the feel of an incremental/idle. And it did
                    a fantastic job (at least in my opinion). Since then, I've been using Claude Code to help me 
                    design the game and write pretty much all the code. I've been heavily involved in the design,
                    balance, and flow of everything - but Claude Code has written all the actual code. There's still 
                    some remnants of my original code (especially the ones with the names of things, etc), but it is
                    it very much the minority.
                </p>
                <p>
                    For all real considerations, the code and the in-game text should be considered to have been written by
                    Claude, Anthropic's AI model, using Claude Code. And it had significant input into the design
                    of the UI.
                </p>
                <p>
                    The game's direction is human: what to build, how it should play and feel, the design decisions, and
                    the play-testing that shapes various changes. The AI works from that direction, proposing designs and
                    writing them up, and the results are reviewed and played before they stay.
                </p>
                <p>There is no AI-generated art: the game uses only text and symbols.</p>
            </section>
            <section>
                <h2>The code</h2>
                <p>
                    Idle Conquest is source available: <Ext href={GITHUB_URL}>the code is on GitHub</Ext>.
                </p>
            </section>
            {PATREON_URL && (
                <section>
                    <h2>Support</h2>
                    <p>
                        If you enjoy the game, you can <Ext href={PATREON_URL}>support it on Patreon</Ext>.
                    </p>
                </section>
            )}
        </>
    );
}

export type AboutSection = "howto" | "tribute" | "updates" | "credits";

const SECTIONS: { id: AboutSection; label: string; render: () => ComponentChildren }[] = [
    { id: "howto", label: "How to play", render: () => <HowToPlay /> },
    { id: "tribute", label: "Master of Magic", render: () => <Tribute /> },
    { id: "updates", label: "To do & changes", render: () => <Updates /> },
    { id: "credits", label: "Credits & links", render: () => <Credits /> },
];

export function AboutPanel(props: { section: AboutSection; onSection: (s: AboutSection) => void }) {
    const active = SECTIONS.find((s) => s.id === props.section) ?? SECTIONS[0];
    return (
        <div class="panel about">
            <nav class="subtabs">
                {SECTIONS.map((s) => (
                    <button key={s.id} class={"toggle" + (s.id === active.id ? " on" : "")} onClick={() => props.onSection(s.id)}>
                        {s.label}
                    </button>
                ))}
            </nav>
            {active.render()}
        </div>
    );
}

/** A slim footer on every page: the code, support, and the About sections */
export function Footer(props: { onAbout: (s: AboutSection) => void }) {
    return (
        <footer class="site-footer">
            <span>Idle Conquest</span>
            <Ext href={GITHUB_URL}>Code on GitHub</Ext>
            {PATREON_URL && <Ext href={PATREON_URL}>Support on Patreon</Ext>}
            <button class="link" onClick={() => props.onAbout("credits")}>
                AI disclosure
            </button>
            <button class="link" onClick={() => props.onAbout("tribute")}>
                Inspired by Master of Magic
            </button>
        </footer>
    );
}
