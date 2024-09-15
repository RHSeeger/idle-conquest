/**
 * Functionality related to production; storage and generation
 * 
 */

const INTIAL_PRODUCTION_IN_STORAGE = 0;
const BASE_PRODUCTION_GENERATION_PER_WORKER = 1.0;
const BASE_PRODUCTION_STORAGE = 100.0;

export default class Production {

    constructor(player) {
        this.player = player;
    }

    get data() {
        if (!("data" in this.player)) {
            this.player.data = {}
        }
        if (!("production" in this.player.data)) {
            this.player.data.production = {}
        }

        if (!("productionInStorage" in this.player.data.production)) {
            this.player.data.production.productionInStorage = this.initialProductionInStorage;
        }

        return this.player.data.production;
    }

    get productionInStorage() {
        return this.data.productionInStorage;
    }
    
    set productionInStorage(amount) {
        this.data.productionInStorage = amount;
    }

    get initialProductionInStorage() {
        return INTIAL_PRODUCTION_IN_STORAGE;
    }

    get maxProductionStorage() {
        return BASE_PRODUCTION_STORAGE;
    }
    
    get productionPerWorker() {
        return BASE_PRODUCTION_GENERATION_PER_WORKER;
    }

    get productionPerTurn() {
        return (this.player.population.populationUnitCount * this.productionPerWorker);
    }
}
