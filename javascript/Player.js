
import Population from "./Population.js"
import Food from "./Food.js"
import Production from "./Production.js"
import Gold from "./Gold.js"

export default class Player {

    constructor() {
        this.data = {}
        this.population = new Population(this);
        this.food = new Food(this);
        this.production = new Production(this);
        this.gold = new Gold(this);
    }

}
