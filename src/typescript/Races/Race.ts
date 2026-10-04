/**
 * Something that can be build (building, unit, special project)
 */
import Player from "../Player";
import { RaceId } from "./RaceId";

export default class Race {
    readonly id: RaceId;
    readonly displayName: string; // The Human race
    readonly pluralName: string; // The Humans in the city
    readonly adjectiveName: string; // The Human city
    readonly description: string;
    readonly playerObject: Player;

    // Defined to take an object, so that we can pass in values by name
    constructor({ id, displayName, pluralName, adjectiveName, description, playerObject }: {
         id: RaceId;
         displayName: string;
         pluralName: string;
         adjectiveName: string;
         description: string;
         playerObject: Player;
        }) {
        this.id = id;
        this.displayName = displayName;
        this.pluralName = pluralName;
        this.adjectiveName = adjectiveName;
        this.description = description;
        this.playerObject = playerObject;
    }

    /**
     * Whether the player has ever seen the race, in any prestige (not sure if we need this)
     */
    get hasDiscovered(): boolean {
        return this.playerObject.races.hasDiscovered(this.id) ;;
    }

    /**
     * Whether player has added the race, either temporarily or permanently 
     */
    get hasAcquired(): boolean {
        return this.playerObject.races.hasAcquired();
    }

    /**
     * The player has conquered a city of this race during this world
     */
    get hasAcquiredTemporarily(): boolean {
        return this.playerObject.races.hasAcquiredTemporarily(this.id);
    }

    /**
     * The player has added the race to their civilization upon presitige
     * (or Human, which is the race the player starts with)
     */
    get hasAcquiredPermanently(): boolean {
        return this.playerObject.races.hasAcquiredPermanently(this.id);
    }
}
