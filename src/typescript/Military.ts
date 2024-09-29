/**
 * Handles military power, conquering other cities, etc
 */

import GameState from "./GameState";
import Player from "./Player";
import { DiscoveryId } from "./DiscoveryId";

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
        return Math.trunc(this.player.population.numberOfMilitary * Military.BASE_MILITARY_POWER_PER_SOLDIER);
    }

    get militaryPowerMaxStorage(): number {
        const discoveriesMultiplier = 1
            + (this.player.discoveries.numberOwned(DiscoveryId.MYTHRIL_MINE) * 0.1)
            + (this.player.discoveries.numberOwned(DiscoveryId.ADAMANTUM_MINE) * 0.2);
        return Math.trunc(Military.BASE_MILITARY_POWER_STORAGE * discoveriesMultiplier);
    }
}