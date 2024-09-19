/**
 * Functionality related to gold; storage and producing
 * 
 */

const BASE_GOLD_PER_POPULATION = 1.0;
const INITIAL_GOLD_IN_STORAGE = 0;
const BASE_GOLD_STORAGE = 1000.0;

export default class Gold {

    constructor(player) {
        this.player = player;
    }

    get data() {
        if (!("data" in this.player)) {
            this.player.data = {}
        }
        if (!("gold" in this.player.data)) {
            this.player.data.gold = {}
        }

        if (!("goldInStorage" in this.player.data.gold)) {
            console.log("Initializing gold to " + INITIAL_GOLD_IN_STORAGE);
            this.player.data.gold.goldInStorage = INITIAL_GOLD_IN_STORAGE;
        }

        return this.player.data.gold;
    }

    get maxGoldStorage() {
        return BASE_GOLD_STORAGE;
    }

    get goldInStorage() {
        return this.data.goldInStorage;
    }

    set goldInStorage(amount) {
        this.data.goldInStorage = Math.trunc(amount);
    }

    get goldPerPopulation() {
        return BASE_GOLD_PER_POPULATION;
    }

    get goldEarnedPerTurn() {
        return Math.trunc(this.player.population.populationUnitCount * this.goldPerPopulation);
    }

    get goldSpentPerTurn() {
        const spentOnProjects = this.player.projects.builtProjects.map((projectId) => {
            return this.player.projects.definedProjects[projectId]
        }).map((project) => {
            return project.getUpkeep('gold')
        }).reduce((total, current) => {
            return total + current;
        }, 0);

        return spentOnProjects;
    }
}
