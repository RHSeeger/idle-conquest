/**
 * Functionality related to gold; storage and producing
 * 
 */
import GameState from "./GameState";
import Player from "./Player";
import { Resource } from "./Resource"

const BASE_GOLD_PER_POPULATION = 1.0;
const BASE_MAX_GOLD_STORAGE = 1000.0;

export default class Gold {
    readonly player: Player;
    readonly data: GameState;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
    }

    get maxGoldStorage(): number {
        return BASE_MAX_GOLD_STORAGE;
    }

    get goldInStorage(): number {
        return this.data.goldInStorage;
    }

    set goldInStorage(amount) {
        this.data.goldInStorage = Math.trunc(amount);
    }

    get goldPerPopulation(): number {
        return BASE_GOLD_PER_POPULATION;
    }

    get goldEarnedPerTurn(): number {
        const goldFromPopulation = (this.player.population.populationUnitCount * this.goldPerPopulation)
            * (this.player.projects.isOwned('MARKETPLACE') ? 1.5 : 1.0);
        const goldFromMinerals = 0
            * (this.player.projects.isOwned('MARKETPLACE') ? 1.5 : 1.0);

        return Math.trunc(goldFromPopulation + goldFromMinerals);
    }

    get goldSpentPerTurn(): number {
        const spentOnProjects = this.player.projects.builtProjects.map((projectId) => {
            return this.player.projects.definedProjects.get(projectId);
        }).filter((project) => {
            return project !== undefined;
        }).map((project) => {
            return project.getUpkeep(Resource.Gold);
        }).reduce((total, current) => {
            return total + current;
        }, 0);

        return spentOnProjects;
    }
}
