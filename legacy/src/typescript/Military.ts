/**
 * Handles military power, conquering other cities, etc
 * 
 * Here's the current plan
 * Every turn, the military travels <military travel per turn distance>
 * This distance is originally 1, but there will be modifiers (projects, racial, prestige abilities, etc)
 * 
 * Every <distance between cities> the military encounters a city
 * 
 * Each city has a "power level"
 * If the current military power is greater than or equal to the city's power level, the city is conquered
 * 
 * Otherwise, the city is skipped (the player is informed of this, and why)
 *     and the total military traveled distance is reduced back to the last city's distance
 * The "in game" reason for this is that the military went back to the last city and looked in another direction
 * The practical reason is that the plan is to have the power level of cities be (at least partially) 
 *     determined by the travel distance, and we don't want the player to keep seeing more an more powerful
 *     cities that they cannot conquer. They can get blocked at a specific power level, but then their distance
 *     doesn't change; unti they build up their military enough to conquer it (allowing them to move further)
 * 
 * If the city is conquered, the player's military power is reduced by the amount of the city's power
 * Otherwise, the player's military power is halved "because they attempted to fight, but failed"
 * This means that the player will eventually be able to conquer a city with a power level up to their
 *     maximum military power; assumign they can generate military power equal to half their maximum
 *     in the time it takes to travel the distance between cities
 * 
 * TO BE FLESHED OUT
 * - A city can be one of a the races in the current world
 * - Up to 4 non-human races will be present in any one world (or maybe 3)
 * - It might be possible to raise the number of races with a prestige point, but that seems a waste
 * - The further the distance traveled, the more likely the city is from a non-human race
 * - (probably) there will be a certain minimum distance before non-human races are encountered
 * - Capturing a city of a non-human race gives the player access to that race's automatic prestige ability (the one that costs 0)
 * - This means that the player can get up to 4 racial "prestige abilities" before ever prestiging (but only temporarily)
 * - The next world, that ability is lost (though see prestige and adding a race to the civilization)
 * 
 * - A city's power level determines it's size
 * - If the city's size is greater than the player's current "maximum unmodified size" (the size before other size bonuses are added)
 *   then the player's "maximum unmodified size" is increased to that amount
 *   TODO: document the various city size terms and how they interact
 *   It's important that any other max size impacts (such as a prestige ability) are not "negated" by the city conquer functionality
 *   For example, if the base max city size is 25
 *                and conquering a city of size 26 increases that maximum to 26
 *                the, the next world the player adds a prestige ability that increases the max size to 26
 *                then conquering a city of size 26 should increase the "total' max size to 27 (rather than have no effect)
 * 
 * - The total size of all cities conquered is included in the formula for the amount of prestige points gained for the world
 */

import GameState from "./GameState";
import Player from "./Player";
import { DiscoveryId } from "./Discoveries/DiscoveryId";

export default class Military {
    static readonly BASE_MILITARY_POWER_STORAGE: number = 100;
    static readonly BASE_MILITARY_POWER_PER_SOLDIER: number = 1;
    static readonly BASE_TRAVEL_PER_TURN: number = 1.0;
    static readonly BASE_TRAVEL_NEEDED_PER_CITY: number = 100;
    static readonly BASE_CHANCE_TO_LOCATE_CITY: number = 20.0;

    readonly player: Player;
    readonly data: GameState;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
    }

    get militaryPowerInStorage(): number {
        return this.data.militaryPowerInStorage
    }

    set militaryPowerInStorage(value: number) {
        this.data.militaryPowerInStorage = value;
    }

    get totalCityStrengthConquered(): number {
        return this.data.militaryTotalCityStrengthConquered;
    }

    set totalCityStrengthConquered(value: number) {
        this.data.militaryTotalCityStrengthConquered = value;
    }

    get distanceLastCityConquered(): number {
        return this.data.militaryDistanceLastCityConquered;
    }

    set distanceLastCityConquered(value: number) {
        this.data.militaryDistanceLastCityConquered = value;
    }

    get distanceTraveled(): number {
        return this.data.militaryDistanceTraveled;
    }

    set distanceTraveled(value: number) {
        this.data.militaryDistanceTraveled = value;
    }

    // Calculated Fields

    get militaryPowerEarnedPerTurn(): number {
        return Math.trunc(this.player.population.numberOfMilitary * Military.BASE_MILITARY_POWER_PER_SOLDIER);
    }

    get militaryPowerMaxStorage(): number {
        const discoveriesMultiplier = 1
            + (this.player.discoveries.numberOwned(DiscoveryId.MYTHRIL_MINE) * 0.1)
            + (this.player.discoveries.numberOwned(DiscoveryId.ADAMANTUM_MINE) * 0.2);
        return Math.trunc(Military.BASE_MILITARY_POWER_STORAGE * discoveriesMultiplier);
    }

    // Distance Travelled Methods

    /**
     * 
     */
    travel() {
        this.distanceTraveled += this.distanceTraveledPerTurn;

        if (this.canLocateCity()) {
            if ((Math.random() * 100.0) < this.chanceToLocateCity) {
                const cityStrength = this.generateCityStrengthForDistance(this.data.militaryDistanceTraveled);
                const cityRace = TODO;
                if (this.canConquerCityWithStrength(cityStrength)) {
                    // reduce stored military power by strength of city
                    this.militaryPowerInStorage -= cityStrength
                    // increment the total strength of cities conquered
                    this.totalCityStrengthConquered += cityStrength;
                    // update distance of last city conquered
                    this.distanceLastCityConquered = this.distanceTraveled;
                    // add city race to races the player has conquered this world
                    

                } else {
                    // set distance traveled back to the previously conquered city

                    // reduce stored strength by 1/2 it's current value

                }
            }
        }


    }

    /**
     * Returns true if, upon adding one turn of travel distance, the military will have traveled enough
     * distance to encounter another city
     */
    canLocateCity(): boolean {
        const distanceTraveledSinceLastCity = this.distanceTraveled - this.distanceLastCityConquered;
        return distanceTraveledSinceLastCity > this.travelNeededPerCity;
    }

    /**
     * Returns the amount of travel needed, since conquering the previous city, before it's possible to find the next city
     */
    get travelNeededPerCity(): number {
        return Military.BASE_TRAVEL_NEEDED_PER_CITY;
    }

    /**
     * Returns the distance traveled by the military per turn
     */
    get distanceTraveledPerTurn(): number {
        return Military.BASE_TRAVEL_PER_TURN;
    }

    /**
     * Returns the chance (0-100) to discover a city, once the required amount of distance has been travelled
     * 
     */
    get chanceToLocateCity(): number {
        return Military.BASE_CHANCE_TO_LOCATE_CITY;
    }

    canConquerCityWithStrength(strength: number): boolean {
        return this.militaryPowerInStorage >= strength;
    }

    /**
     * Generates a strength appropriate for a city at this distance
     * The strength has a random component, but will be around a distance calculated directly from the distance
     * Thoughts on calculation
     * - First city encountered should be at about half the default maximum military power (BASE_MILITARY_POWER_STORAGE)
     * - Maybe increase it by 1 for each <default travel between cities> (BASE_TRAVEL_NEEDED_PER_CITY)
     */
    generateCityStrengthForDistance(distance: number): number {
        // TODO: change this to use more of a bell curve, with a wider range below the "calculated" distance (75/25% or so)
        const numberOfCityDistancesTaveled = distance / Military.BASE_TRAVEL_NEEDED_PER_CITY;
        const rawStrength = (Military.BASE_MILITARY_POWER_STORAGE / 2)
            + (numberOfCityDistancesTaveled - 1);
        return rawStrength;
    }
}