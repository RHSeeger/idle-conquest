/**
 * Handles military power, conquering other cities, etc
 */

import GameState from "./GameState";
import Player from "./Player";

export default class Military {
    static readonly BASE_MILITARY_POWER_STORAGE: number = 100;
    static readonly BASE_MILITARY_POWER_PER_SOLDIER: number = 1;

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

    get militaryPowerEarnedPerTurn(): number {
        return this.player.population.numberOfMilitary * Military.BASE_MILITARY_POWER_PER_SOLDIER;
    }

    get militaryPowerMaxStorage(): number {
        return Military.BASE_MILITARY_POWER_STORAGE;
    }
}