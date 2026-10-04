/**
 * Represents the population (people) and their assignments
 * 
 * population - the number of people in the civilization
 * populationUnit - a group of 1,000 people that can be assigned to a role. This the is "population" 
 *     that the player interacts with; when they assign "1 farmer", they're assigning 1,000 people
 *     to the role of farmer. This is also what most of the math is done using
 * 
 */
import GameState from "./GameState";
import Player from "./Player";
import { ProjectId } from "./Projects/ProjectId";

export default class Population {
    readonly player: Player;
    readonly data: GameState;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
    }

    // General population
    get populationCount(): number {
        return this.data.populationCount;
    }

    set populationCount(value) {
        this.data.populationCount = value;
    }

    get populationUnitCount(): number {
        return Math.trunc(this.data.populationCount / 1000);
    }

    get maxPopulationUnitCount(): number {
        return this.player.food.maxFoodStorage
            // Granary adds 2
            + (this.player.projects.isOwned(ProjectId.GRANARY) ? 2 : 0);
    }

    // Famer units
    get numberOfFarmers(): number {
        return this.data.populationNumFarmers;
    }

    set numberOfFarmers(amount) {
        this.data.populationNumFarmers = amount;
    }

    // Military units
    get numberOfMilitary(): number {
        return this.data.populationNumMilitary;
    }

    set numberOfMilitary(amount) {
        this.data.populationNumMilitary = amount;
    }

    // Worker units - calculated
    get numberOfWorkers(): number {
        return this.populationUnitCount - (this.numberOfFarmers + this.numberOfMilitary);
    }

    // Calculates the number of population gained per turn
    get populationPerTurn(): number {
        // Base amount is: (<food in storage> - <current population unit size>) * 5
        //     So if the population unit size is currently 5
        //     And the amount of food in storage is 10
        //     Then the base is 25 ((10 - 5) * 5)
        const base = (this.player.food.foodInStorage - this.populationUnitCount) * 5;
        const total = base
            // granary add 20
            + (this.player.projects.isOwned(ProjectId.GRANARY) ? 20 : 0);
        const maximum = this.maxPopulationUnitCount - this.populationUnitCount;
        return Math.min(total, maximum);
    }

    /**
     * Returns true if it's not possible to remove a farmer
     * - the number of farmers is already 0, OR
     * - after removing a farmer, the minimum amount of required food will still be generated
     */
    canRemoveFarmer(): boolean {
        // If there are no farmers, we can't remove any
        if (this.numberOfFarmers === 0) {
            return false;
        }

        // Otherwise, if enough food would be produced with 1 less farmer, one ca be removed
        const requiredFood = this.player.food.requiredFood;
        return this.player.food.calculateFoodProducedPerTurn(this.numberOfFarmers - 1) >= requiredFood;
    }

    /**
     * Returns true if it's possible to add a farmer
     * Always true unless the entire population is already assigned to farming
     */
    canAddFarmer(): boolean {
        return this.numberOfFarmers < this.populationUnitCount
    }

    /**
     * Returns true if it's possible to add a soldier
     * If adding a soldier would force the removal of a farmer AND it's not possible to remove a farmer
     */
    canAddSoldier(): boolean {
        if (this.numberOfWorkers > 0) {
            // adding a soldier would replace a worker
            return true;
        }
        if (this.canRemoveFarmer()) {
            // adding a soldier would replace a farmer, which is fine
            return true;
        }
        return false;
    }

    /**
     * Returns true if it's possible to remove a soldier
     * Only false if there are no soldiers currently assigned
     */
    canRemoveSoldier(): boolean {
        return this.numberOfMilitary > 0
    }
}
