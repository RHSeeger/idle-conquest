/**
 * Functionality related to finding and keeping track of Discovery items (found by Explorers)
 */

import Player from "./Player"
import GameState from "./GameState"
import Discovery from "./Discovery"
import { Resource } from "./Resource"
import { DiscoveryType } from "./DiscoveryType"

export default class Discoveries {
    static readonly BASE_TRAVEL_PER_TURN: number = 1.0;
    static readonly BASE_TRAVEL_NEEDED_PER_DISCOVERY: number = 100;
    static readonly BASE_CHANCE_TO_DISCOVER_DISCOVERY: number = 100.0;// TODO: change back to 10

    readonly player: Player;
    readonly data: GameState;
    readonly definedDiscoveries: Map<string, Discovery>;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
        this.definedDiscoveries = Discoveries.createDefinedDiscoveries(player);
    }

    isOwned(discoveryId: string) {
        return this.data.discoveredNodes.includes(discoveryId);
    }

    numberOwned(discoveryId: string) {
        return this.data.discoveredNodes.filter((id) => {
            return discoveryId === id;
        }).length;
    }

    getOwnedNodes(): Array<Discovery> {
        return this.data.discoveredNodes.map((key) => {
            return this.definedDiscoveries.get(key);
        }).filter((discovery: Discovery | undefined): discovery is Discovery => {
            return !!discovery;
        });
    }

    addOwned(key: string) {
        this.data.discoveredNodes.push(key);
        // TODO: sort?
    }

    get distanceTraveledPerTurn(): number {
        return Discoveries.BASE_TRAVEL_PER_TURN;
    }

    get travelNeededPerDiscovery(): number {
        return Discoveries.BASE_TRAVEL_NEEDED_PER_DISCOVERY;
    }

    /**
     * Returns the percentage chance (0-100) to discover something when traveling
     */
    get chanceToDiscover(): number {
        return Discoveries.BASE_CHANCE_TO_DISCOVER_DISCOVERY;
    }

    /**
     * 
     */
    travel() {
        if (this.canDiscoverOnTravel()) {
            if ((Math.random() * 100.0) < this.chanceToDiscover) {
                const discovery = this.selectRandomDiscovery();
                console.log("Found discovery", discovery.displayName);

                if (discovery.type === DiscoveryType.Instant) {
                    // Add resources
                    for (let [resourceType, resourceAmount] of discovery.resource) {
                        if (resourceType === Resource.Gold) {
                            // console.log("Adding " + resourceAmount + " gold");
                            this.player.gold.goldInStorage += resourceAmount;
                        } else if (resourceType === Resource.Food) {
                            // console.log("Adding " + resourceAmount + " food");
                            this.player.food.foodInStorage += resourceAmount;
                        } else if (resourceType === Resource.MilitaryPower) {
                            // console.log("Adding " + resourceAmount + " military power");
                            this.player.military.militaryPowerInStorage += resourceAmount;
                        } else if (resourceType === Resource.Production) {
                            // console.log("Adding " + resourceAmount + " production");
                            this.player.production.productionInStorage += resourceAmount;
                        } else {
                            console.log("Unknown resource type: {}", resourceType);
                            throw new Error("Unknown resource type: " + resourceType);
                        }
                    }
                } else if (discovery.type === DiscoveryType.Node) {
                    // Add node
                    this.addOwned(discovery.id);
                } else if (discovery.type === DiscoveryType.Special) {
                    // Other
                    // TODO
                } else {
                    throw new Error("Should not get here");
                }
            }
        }

        this.data.distanceTraveled = this.data.distanceTraveled + this.distanceTraveledPerTurn;
    }

    /**
     * Returns true if traveling will result in a possible new discovery
     */
    canDiscoverOnTravel(): boolean {
        const previousNumberOfDiscoveries = Math.floor(this.data.distanceTraveled / this.travelNeededPerDiscovery);
        const newNumberOfDiscoveries = Math.floor((this.data.distanceTraveled + this.distanceTraveledPerTurn) / this.travelNeededPerDiscovery);
        return previousNumberOfDiscoveries < newNumberOfDiscoveries;
    }

    selectRandomDiscovery(): Discovery {
        const maxRoll = Array.from(this.definedDiscoveries.values()).map((discovery) => {
            return discovery.rarity;
        }).reduce((sum, current) => {
            return sum + current;
        }, 0);

        const roll = Math.random() * maxRoll;
        var currentSum = 0;

        for (let [discoveryId, discovery] of this.definedDiscoveries) {
            if (roll < (currentSum + discovery.rarity)) {
                return discovery;
            }
            currentSum += discovery.rarity;
        }

        throw new Error("This should not be possible");
    }

    static createDefinedDiscoveries(playerObject: Player): Map<string, Discovery> {
        var definedDiscoveries: Map<string, Discovery> = new Map();

        [
            new Discovery({
                id: "SILVER_MINE",
                displayName: "Silver Mine",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>([[Resource.Gold, 1]]),
                rarity: 40,
                description: "A Silver Mine generates 1 gold per turn",
                playerObject: playerObject
            }),
            new Discovery({
                id: "GOLD_MINE",
                displayName: "Gold Mine",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>([[Resource.Gold, 2]]),
                rarity: 20,
                description: "A Gold Mine generates 2 gold per turn",
                playerObject: playerObject
            }),
            new Discovery({
                id: "PLATINUM_MINE",
                displayName: "Platinum Mine",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>([[Resource.Gold, 4]]),
                rarity: 10,
                description: "A Gold Mine generates 4 gold per turn",
                playerObject: playerObject
            }),
            new Discovery({
                id: "TREASURE_STASH_GOLD",
                displayName: "Treasure Stash of Gold",
                type: DiscoveryType.Instant,
                resource: new Map<Resource, number>([[Resource.Gold, 100]]),
                rarity: 100, // most common
                description: "A Treasure Stash containing gold was found, boosting your coffers",
                playerObject: playerObject
            }),
            new Discovery({
                id: "MYTHRIL_MINE",
                displayName: "Mithril Mine",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>(), // increases max Military Power by 10%
                rarity: 10,
                description: "A Mithril Mine allows the generation of mithril weapons, increasing maximum military power by 10%",
                playerObject: playerObject
            }),
            new Discovery({
                id: "ADAMANTUM_MINE",
                displayName: "Adamantum Mine",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>(), // increases max Military Power by 20%
                rarity: 5,
                description: "An Adamantum Mine allows the generation of adamantum weapons, increasing maximum military power by 20%",
                playerObject: playerObject
            }),
            new Discovery({
                id: "BOUNTIFUL_FOREST",
                displayName: "Bountiful Forest",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>([[Resource.Food, 1]]),
                rarity: 20,
                description: "A Bountiful Forest generates 1 food per turn",
                playerObject: playerObject
            }),
            new Discovery({
                id: "OLD_MILL",
                displayName: "Old Mill",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>([[Resource.Production, 1]]),
                rarity: 10,
                description: "A old mill is used by your workers to generate 1 production per turn",
                playerObject: playerObject
            }),
            new Discovery({
                id: "WANDERING_MASTER",
                displayName: "Wandering Master",
                type: DiscoveryType.Node,
                resource: new Map<Resource, number>([[Resource.Production, 1]]),
                rarity: 5,
                description: "A Wandering Master joins your workers and generates 1 production per turn and increases your maximum stored resources",
                playerObject: playerObject
            }),

        ].forEach(function (discovery, _index) {
            definedDiscoveries.set(discovery.id, discovery);
        })

        return definedDiscoveries;
    }
}

