import Player from "../Player"
import GameState from "../GameState"
import { RaceId } from "./RaceId"
import Race from "./Race";

export default class Races {
    readonly player: Player;
    readonly data: GameState;
    readonly definedRaces: Map<RaceId, Race>;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
        this.definedRaces = Races.createDefinedRaces(player);
    }

    /**
     * Whether the player has ever seen the race, in any prestige (not sure if we need this)
     */
    hasDiscovered(raceId: RaceId): boolean {
        return false;
    }

    /**
     * Whether player has added the race, either temporarily or permanently 
     */
    hasAcquired(raceId: RaceId): boolean {
        return this.hasAcquiredTemporarily(raceId) || this.hasAcquiredPermanently(raceId);
    }

    /**
     * The player has conquered a city of this race during this world
     */
    hasAcquiredTemporarily(raceId: RaceId): boolean {
        return false;
    }

    /**
     * The player has added the race to their civilization upon presitige
     * (or Human, which is the race the player starts with)
     */
    hasAcquiredPermanently(raceId: RaceId): boolean {
        return false;
    }


    /**
     * Given a string "key" (the string value of a RaceId), returns the Race with that RaceId
     * If the string is empty or no such project exists, throws an error
     */
    lookupOrError(key: string | null | undefined): Race {
        if (key === null || key === undefined) {
            throw new Error("key cannot be empty");
        }

        const raceId: RaceId = (RaceId.fromString(key));
        const race = this.definedRaces.get(raceId);
        if (race === undefined) {
            throw new Error("Unknown race: " + raceId);
        }

        return race;
    }

    static createDefinedRaces(playerObject: Player): Map<RaceId, Race> {
        var definedRaces: Map<RaceId, Race> = new Map();

        [
            new Race({
                id: RaceId.HUMAN,
                displayName: "Human",
                pluralName: "Humans",
                adjectiveName: "Human",
                description: "Humans are the starting race, with no specific benefits",
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.ELF,
                displayName: "Elf",
                pluralName: "Elves",
                adjectiveName: "Elven",
                description: "Elves are agile and in harmony with the world around them, both nature and magic.",
                // Base Racial Prestige Ability: +20% to maximum Military Power, because their agility makes them more adept at combat
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.DWARF,
                displayName: "Dwarf",
                pluralName: "Dwarves",
                adjectiveName: "Dwarven",
                description: "Dwarves live underground and are one with the earth around them",
                // Base Racial Prestige Ability: +1 productivity/turn per worker, +0.5 productivity/turn per non-worker
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.HALFLING,
                displayName: "Halfling",
                pluralName: "Halflings",
                adjectiveName: "Halfling",
                description: "",
                // Base Racial Prestige Ability: +1 food/turn per farmer, +0.5 food/turn per non-farmer
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.ORC,
                displayName: "Orc",
                pluralName: "Orcs",
                adjectiveName: "Orc",
                description: "",
                // Base Racial Prestige Ability: +20% to maximum Military Power, because their heartiness makes them hard to kill
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.BEASTMAN,
                displayName: "Beastman",
                pluralName: "Beastmen",
                adjectiveName: "Beastman",
                description: "",
                // Base Racial Prestige Ability: +20% population growth/turn
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.DARK_ELF,
                displayName: "Dark Elf",
                pluralName: "Dark Elves",
                adjectiveName: "Dark Elven",
                description: "",
                // Base Racial Prestige Ability: something related to ranged magical attacks
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.DRACONIAN,
                displayName: "Draconian",
                pluralName: "Draconians",
                adjectiveName: "Draconian",
                description: "",
                // Base Racial Prestige Ability: +25% movement per turn for all units (military, explorers, and adventurers)
                playerObject: playerObject
            }),
            new Race({
                id: RaceId.TROLL,
                displayName: "Troll",
                pluralName: "Trolls",
                adjectiveName: "Troll",
                description: "",
                // Base Racial Prestige Ability: +25% Military Power per turn, as injured forces heal faster. Which also means they can train faster; "Medic!"
                playerObject: playerObject
            }),

        ].forEach(function (race, _index) {
            definedRaces.set(race.id, race);
        })

        return definedRaces;
    }
}

