/**
 * Functionality related to food; storage and growing
 * 
 */

const BASE_FOOD_GENERATION_PER_FARMER = 2.0;
const BASE_FOOD_STORAGE = 10.0;
const BASE_FOOD_REQUIRED_PER_POPULATION = 1.0;
const INITIAL_FOOD_IN_STORAGE = 0;

export default class Food {

    constructor(player) {
        this.player = player;
    }

    get data() {
        if (!("data" in this.player)) {
            this.player.data = {}
        }
        if (!("food" in this.player.data)) {
            this.player.data.food = {}
        }

        if (!("foodInStorage" in this.player.data.food)) {
            this.player.data.food.foodInStorage = INITIAL_FOOD_IN_STORAGE;
        }

        return this.player.data.food;
    }

    get foodInStorage() {
        return this.data.foodInStorage;
    }

    set foodInStorage(amount) {
        this.data.foodInStorage = amount;
    }

    get foodPerFarmer() {
        return BASE_FOOD_GENERATION_PER_FARMER;
    }
    
    get requiredFood() {
        const foodPerPopulation = this.foodRequiredPerPopulation;
        const population = this.player.population.populationUnitCount;
        return foodPerPopulation * population;

    }

    get foodRequiredPerPopulation() {
        return BASE_FOOD_REQUIRED_PER_POPULATION;
    }
    
    
    get maxFoodStorage() {
        return BASE_FOOD_STORAGE;
    }

    // Fill food storage to maximum capacity
    fillFoodStorage() {
        this.data.foodInStorage = this.data.maxFoodStorage;
    }
    
}
