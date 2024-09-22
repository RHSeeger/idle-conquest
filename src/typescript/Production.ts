/**
 * Functionality related to production; storage and generation
 * 
 */
import GameState from "./GameState";
import Player from "./Player";


export default class Production {
    static readonly BASE_PRODUCTION_GENERATION_PER_WORKER: number = 1.0;
    static readonly BASE_PRODUCTION_STORAGE: number = 100.0;

    readonly player: Player;
    readonly data: GameState;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
    }

    get productionInStorage(): number {
        return this.data.productionInStorage;
    }

    set productionInStorage(amount) {
        this.data.productionInStorage = amount;
    }

    get maxProductionStorage(): number {
        return Production.BASE_PRODUCTION_STORAGE;
    }

    get productionPerWorker(): number {
        return Production.BASE_PRODUCTION_GENERATION_PER_WORKER;
    }

    get productionPerTurn(): number {
        return (this.player.population.populationUnitCount * this.productionPerWorker);
    }
}
