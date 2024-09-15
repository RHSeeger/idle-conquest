
import Population from "./Population.js"
import Food from "./Food.js"
import Production from "./Production.js"
import Gold from "./Gold.js"
import Projects from "./Projects.js"

export default class Player {

    constructor() {
        // [data] is where the "saveable" user data is stored; the data that
        // need to be saved to local storage to "save the game"
        this.data = {}

        // The objects that provides interfaces to data and game state
        // All of them save their actual values in [data]
        this.population = new Population(this);
        this.food = new Food(this);
        this.production = new Production(this);
        this.gold = new Gold(this);
        this.projects = new Projects(this);
    }

}
