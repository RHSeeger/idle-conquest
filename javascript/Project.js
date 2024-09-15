/**
 * Something that can be build (building, unit, special project)
 */

export default class Project {
    constructor({
        displayName = '',
        cost = {},
        upkeep = {},
        description = '',
        dependencies = []} = {}) {
        this.displayName = displayName;
        this.cost = cost;
        this.upkeep = upkeep;
        this.description = description;
        this.dependencies = dependencies;
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
     * - has a max production higher than the production cost (if any)
     * - has a max gold higher than the gold cost (if any)
     * - has other projects this one depends on (if any)
     * - fullfills any other requirements
     */
    isUnlocked(playerObject) {
        if (playerObject.gold.maxGoldStorage < this.getCost("gold")) {
            return false;
        }
        if (playerObject.production.maxProductionStorage < this.getCost("production")) {
            return false;
        }
        if (playerObject.gold.goldPerTurn < this.getUpkeep("gold")) {
            return false;
        }
        if (playerObject.production.productionPerTurn < this.getUpkeep("production")) {
            return false;
        }

        return true;
    }

    canAfford(playerObject) {
        if (playerObject.gold.goldInStorage < this.getCost("gold")) {
            return false;
        }
        if (playerObject.production.productionInStorage < this.getCost("production")) {
            return false;
        }
        if (playerObject.gold.goldPerTurn < this.getUpkeep("gold")) {
            return false;
        }
        if (playerObject.production.productionPerTurn < this.getUpkeep("production")) {
            return false;
        }

        return true;
    }

}
