/**
 * Represents the population (people) and their assignments
 * 
 * population - the number of people in the civilization
 * populationUnit - a group of 1,000 people that can be assigned to a role. This the is "population" 
 *     that the player interacts with; when they assign "1 farmer", they're assigning 1,000 people
 *     to the role of farmer. This is also what most of the math is done using
 * 
 * The n
 */
const INITIAL_POPULATION = 1000;
const INITIAL_FARMER_UNITS = 1;
const INITIAL_MILITARY_UNITS = 0;

export default class Population {

    constructor(player) {
        this.player = player;
    }

    get data() {

        if (!("data" in this.player)) {
            this.player.data = {}
        }
        if (!("population" in this.player.data)) {
            this.player.data.population = {}
        }

        if (!("count" in this.player.data.population)) {
            this.player.data.population.count = INITIAL_POPULATION;
        }
        if (!("numFarmers" in this.player.data.population)) {
            this.player.data.population.numFarmers = INITIAL_FARMER_UNITS;
        }
        if (!("numMilitary" in this.player.data.population)) {
            this.player.data.population.numMilitary = INITIAL_MILITARY_UNITS;
        }

        return this.player.data.population;
    }

    // Now create getters and setters to it _looks_ like there are direct fields

    // General population
    get populationCount() {
        return this.data.count;
    }

    set populationCount(value) {
        this.data.count = value;
    }

    get populationUnitCount() {
        return Math.trunc(this.data.count / 1000);
    }

    get maxPopulationUnitCount() {
        return this.player.food.maxFoodStorage
            // Granary adds 2
            + (this.player.projects.isOwned('GRANARY') ? 2 : 0);
    }

    // Famer units
    get numberOfFarmers() {
        return this.data.numFarmers;
    }

    set numberOfFarmers(amount) {
        this.data.numFarmers = amount;
    }

    // Military units

    get numberOfMilitary() {
        return this.data.numMilitary;
    }

    set numberOfMilitary(amount) {
        this.data.numMilitary = amount;
    }

    // Worker units - calculated
    get numberOfWorkers() {
        return this.populationUnitCount - (this.numberOfFarmers + this.numberOfMilitary);
    }

    // Calculates the number of population gained per turn
    get populationPerTurn() {
        // Base amount is: (<food in storage> - <current population unit size>) * 5
        //     So if the population unit size is currently 5
        //     And the amount of food in storage is 10
        //     Then the base is 25 ((10 - 5) * 5)
        const base = (this.player.food.foodInStorage - this.populationUnitCount) * 5;
        const total = base
            // granary add 20
            + (this.player.projects.isOwned('GRANARY') ? 20 : 0);
        const maximum = this.maxPopulationUnitCount - this.populationUnitCount;
        return Math.min(total, maximum);
    }

}
