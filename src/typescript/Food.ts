/**
 * Functionality related to food; storage and growing
 * 
 */
import GameState from "./GameState";
import Player from "./Player";

export default class Food {
    static readonly BASE_FOOD_GENERATION_PER_FARMER : number = 2.0;
    static readonly BASE_MAX_FOOD_STORAGE : number = 10.0;
    static readonly BASE_FOOD_REQUIRED_PER_POPULATION : number = 1.0;

    readonly player: Player;
    readonly data: GameState;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
    }

    get foodInStorage(): number {
        return this.data.foodInStorage;
    }

    set foodInStorage(amount) {
        this.data.foodInStorage = amount;
    }

    get foodPerFarmer(): number {
        return Food.BASE_FOOD_GENERATION_PER_FARMER;
    }
    
    get foodProducedPerTurn(): number {
        return this.calculateFoodProducedPerTurn(this.player.population.numberOfFarmers);
    }

    calculateFoodProducedPerTurn(withNumberOfFarmers: number): number {
        const foodFarmed = withNumberOfFarmers * this.foodPerFarmer;

        const totalFoodProduced = foodFarmed
            + (this.player.projects.isOwned('GRANARY') ? 2 : 0);
            
        return totalFoodProduced;
    }

    get requiredFood(): number {
        const foodPerPopulation = this.foodRequiredPerPopulation;
        const population = this.player.population.populationUnitCount;
        return foodPerPopulation * population;

    }

    get foodRequiredPerPopulation(): number {
        return Food.BASE_FOOD_REQUIRED_PER_POPULATION;
    }
    
    get maxFoodStorage(): number {
        return Food.BASE_MAX_FOOD_STORAGE;
    }

    // Fill food storage to maximum capacity
    fillFoodStorage(): void {
        this.data.foodInStorage = this.maxFoodStorage;
    }
    
}
