/**
 * Functionality related to production; storage and generation
 * 
 */
import GameState from "./GameState";
import Player from "./Player";
import Discovery from "./Discoveries/Discovery"
import { Resource } from "./Resource"
import { DiscoveryId } from "./Discoveries/DiscoveryId";


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
        const discoveriesMultiplier = 1
            + (this.player.discoveries.numberOwned(DiscoveryId.WANDERING_MASTER) * 0.1);
        return Math.trunc(Production.BASE_PRODUCTION_STORAGE * discoveriesMultiplier);
    }

    get productionPerWorker(): number {
        return Production.BASE_PRODUCTION_GENERATION_PER_WORKER;
    }

    get productionPerTurn(): number {
        const productionFromWorkers = this.player.population.populationUnitCount * this.productionPerWorker;
        const calculateProductionFromDiscoveries = this.calculateProductionFromDiscoveries();
        return productionFromWorkers + calculateProductionFromDiscoveries;
    }

    calculateProductionFromDiscoveries(): number {
        return this.player.discoveries.getOwnedNodes().map((discovery: Discovery) => {
            // Map to the actual amount of gold produced
            if (discovery.resource.has(Resource.Production)) {
                return discovery.resource.get(Resource.Production);
            }
        }).filter((production: number | undefined): production is number => {
            // Filter out the ones that don't produce gold (should be unnecessary)
            return !!production;
        }).reduce((sum, current) => {
            // Sum the total
            return sum + current;
        }, 0);
    }

}
