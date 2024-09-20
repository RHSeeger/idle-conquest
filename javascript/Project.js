/**
 * Something that can be build (building, unit, special project)
 */

export default class Project {
    constructor({
        id = '',
        displayName = '',
        cost = {},
        upkeep = {},
        description = '',
        dependencies = [],
        playerObject = {}} = {}) {
        this.id = id;
        this.displayName = displayName;
        this.cost = cost;
        this.upkeep = upkeep;
        this.description = description;
        this.dependencies = dependencies;
        this.playerObject = playerObject;
    }

    getCost(type) {
        if (!(type in this.cost)) {
            return 0;
        }
        return this.cost[type];
    }

    getUpkeep(type) {
        if (!(type in this.upkeep)) {
            return 0;
        }
        return this.upkeep[type];
    }

    /**
     * Returns true if the player has unlocked the project
     * - has a max gold higher than the gold cost (if any)
     * - has a max production higher than the production cost (if any)
     * - has other projects this one depends on (if any)
     * - fullfills any other requirements
     */
    get isUnlocked() {
        if (this.playerObject.gold.maxGoldStorage < this.getCost("gold")) {
            return false;
        }
        if (this.playerObject.production.maxProductionStorage < this.getCost("production")) {
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
    get canAfford() {
        if (this.playerObject.gold.goldInStorage < this.getCost("gold")) {
            return false;
        }
        if (this.playerObject.production.productionInStorage < this.getCost("production")) {
            return false;
        }
        if ((this.playerObject.gold.goldEarnedPerTurn - this.playerObject.gold.goldSpentPerTurn) < this.getUpkeep("gold")) {
            return false;
        }
        if (this.playerObject.production.productionPerTurn < this.getUpkeep("production")) {
            return false;
        }

        return true;
    }

    get isOwned() {
        return this.playerObject.projects.isOwned(this.id);
    }
}
