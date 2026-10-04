
import Population from "./Population"
import Food from "./Food"
import Production from "./Production"
import Gold from "./Gold"
import Projects from "./Projects/Projects"
import GameState from "./GameState";
import Military from "./Military"
import Discoveries from "./Discoveries/Discoveries"
import Races from "./Races/Races"

/**
 * Effectively, the API to interact with the player's information (game state)
 * Provides access to get to specific types of data
 */
export default class Player {
    // This is the field used by other classes to access the "game state", which includes their own data
    // The other classes don't store their own data; they provide a useful API to the data stored in the game state
    data: GameState; // TODO: Rename to gameState

    // These are the fields that other classes use to access information other than their own
    readonly population: Population;
    readonly food: Food;
    readonly production: Production;
    readonly gold: Gold;
    readonly projects: Projects;
    readonly military: Military;
    readonly discoveries: Discoveries;
    readonly races: Races;

    constructor() {
        // [data] is where the "saveable" user data is stored; the data that
        // need to be saved to local storage to "save the game"
        this.data = new GameState();

        // The objects that provides interfaces to data and game state
        // All of them save their actual values in [data]
        this.population = new Population(this);
        this.food = new Food(this);
        this.production = new Production(this);
        this.gold = new Gold(this);
        this.projects = new Projects(this);
        this.military = new Military(this);
        this.discoveries = new Discoveries(this);
        this.races = new Races(this);
    }

}
