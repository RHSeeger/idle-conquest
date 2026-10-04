/**
 * Stores the actual "game state" data, the values that need to be written to local storage to "save the game"
 */

export default class GameState {
    static readonly INITIAL_GOLD_IN_STORAGE : number = 0;
    static readonly INITIAL_FOOD_IN_STORAGE : number = 0;
    static readonly INITIAL_POPULATION: number  = 1000;
    static readonly INITIAL_FARMER_UNITS : number = 1;
    static readonly INITIAL_MILITARY_UNITS : number = 0;
    static readonly INTIAL_PRODUCTION_IN_STORAGE : number = 0;

    // Food
    foodInStorage: number = GameState.INITIAL_FOOD_IN_STORAGE;

    // Gold
    goldInStorage: number = GameState.INITIAL_GOLD_IN_STORAGE;

    // Population
    populationCount: number = GameState.INITIAL_POPULATION;
    populationNumFarmers: number = GameState.INITIAL_FARMER_UNITS;
    populationNumMilitary: number = GameState.INITIAL_MILITARY_UNITS;

    // Production
    productionInStorage: number = GameState.INTIAL_PRODUCTION_IN_STORAGE;

    // Projects
    projectsBuilt: Array<string> = [];

    // Military Power
    militaryPowerInStorage: number = 0;
    militaryDistanceTraveled: number = 0;
    militaryDistanceLastCityConquered: number = 0;
    militaryTotalCityStrengthConquered = 0;

    // Discoveries
    discoveredNodes: Array<string> = [];
    // TODO: Rename this to explorerDistanceTravelled - or perhaps grouped data in sub-objects
    distanceTraveled: number = 0;
}

