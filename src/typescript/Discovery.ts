/**
 * A Discovery is something that can be found by Explorers
 * There are two types
 * - Instance - add an amount of a resource (gold, production, food) to the player's storage
 *          example: a treasure stash adds an amount of gold to the player's gold storage just once, when found
 * - Node - add an amount of resource (gold, production, food) to the player's storage each turn
 *          example: a Gold Mine adds an amount of gold to the player's gold storage each turn
 * - Special - provides a benefit to the player in some way, other than resources
 *          example: A Mithril Mine allows the creation of mithril weapons, increasing the maximum Military Power by 10%
 */

import Player from "./Player";
import { Resource } from "./Resource"
import { DiscoveryType } from "./DiscoveryType"

export default class Project {
    readonly id: string;
    readonly displayName: string;
    readonly type: DiscoveryType;
    readonly resource: Map<Resource, number>;
    readonly rarity: number; // A number, on a scale of 1 to 100, of how common this resource is to fine (100 being most common)
    readonly description: string;
    readonly playerObject: Player;

    // Defined to take an object, so that we can pass in values by name
    constructor({ id, displayName, type, resource, rarity, description, playerObject }: {
        id: string;
        displayName: string;
        type: DiscoveryType;
        resource: Map<Resource, number>;
        rarity: number;
        description: string;
        playerObject: Player;
    }) {
        this.id = id;
        this.displayName = displayName;
        this.type = type;
        this.resource = resource;
        this.rarity = rarity;
        this.description = description;
        this.playerObject = playerObject;
    }

    get isOwned(): boolean {
        return this.playerObject.discoveries.isOwned(this.id);
    }

    get numberOwned(): number {
        return this.playerObject.discoveries.numberOwned(this.id);
    }

    amountOfResourceGenerated(resourceType: Resource) {
        var result: number = 0;
        for (let [type, amount] of this.resource) {
            if (resourceType === type) {
                result += amount;
            }
        }

        return result;            
    }
}
