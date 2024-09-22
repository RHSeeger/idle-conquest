/**
 * Something that can be build (building, unit, special project)
 */
import Player from "./Player";
import { Resource } from "./Resource"

export default class Project {
    readonly id: string;
    readonly displayName: string;
    readonly cost: Map<Resource, number>;
    readonly upkeep: Map<Resource, number>;
    readonly description: string;
    readonly dependencies: Array<string>;
    readonly playerObject: Player;

    // Defined to take an object, so that we can pass in values by name
    constructor({ id, displayName, cost, upkeep, description, dependencies, playerObject }: {
        id: string;
        displayName: string;
        cost: Map<Resource, number>;
        upkeep: Map<Resource, number>;
        description: string;
        dependencies: Array<string>;
        playerObject: Player;
    }) {
        this.id = id;
        this.displayName = displayName;
        this.cost = cost;
        this.upkeep = upkeep;
        this.description = description;
        this.dependencies = dependencies;
        this.playerObject = playerObject;
    }

    /*     constructor(id: string, displayName: string, cost: Map<string, number>, upkeep: Map<string, number>, description: string, dependencies: Array<string>, playerObject: Player) {
            this.id = id;
            this.displayName = displayName;
            this.cost = cost;
            this.upkeep = upkeep;
            this.description = description;
            this.dependencies = dependencies;
            this.playerObject = playerObject;
        }
     */
    getCost(type: Resource): number {
        return this.cost.get(type) ?? 0;
    }

    getUpkeep(type: Resource): number {
        return this.upkeep.get(type) ?? 0;
    }

    /**
     * Returns true if the player has unlocked the project
     * - has a max gold higher than the gold cost (if any)
     * - has a max production higher than the production cost (if any)
     * - has other projects this one depends on (if any)
     * - fullfills any other requirements
     */
    get isUnlocked(): boolean {
        if (this.playerObject.gold.maxGoldStorage < this.getCost(Resource.Gold)) {
            return false;
        }
        if (this.playerObject.production.maxProductionStorage < this.getCost(Resource.Production)) {
            return false;
        }
        // Check to make sure all dependencies are owned
        for (const projectId of this.dependencies) {
            if (!this.playerObject.projects.isOwned(projectId)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Returns true if the player can currently afford this project
     * - Gold in storage is >= the gold cost of this project (if any)
     * - Production in storage is >= the production cost of this project (if any)
     * - Gold earned per turn is >= gold upkeep of this project (if any)
     * - Production earned per turn is >= production upkeep of this project (if any)
     */
    get canAfford(): boolean {
        if (this.playerObject.gold.goldInStorage < this.getCost(Resource.Gold)) {
            return false;
        }
        if (this.playerObject.production.productionInStorage < this.getCost(Resource.Production)) {
            return false;
        }
        if ((this.playerObject.gold.goldEarnedPerTurn - this.playerObject.gold.goldSpentPerTurn) < this.getUpkeep(Resource.Gold)) {
            return false;
        }
        if (this.playerObject.production.productionPerTurn < this.getUpkeep(Resource.Production)) {
            return false;
        }

        return true;
    }

    get isOwned(): boolean {
        return this.playerObject.projects.isOwned(this.id);
    }
}
