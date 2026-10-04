/**
 * Functionality related to gold; storage and producing
 * 
 */
import GameState from "./GameState";
import Player from "./Player";
import { Resource } from "./Resource"
import Discovery from "./Discoveries/Discovery"
import { DiscoveryId } from "./Discoveries/DiscoveryId";
import { ProjectId } from "./Projects/ProjectId";


export default class Gold {
    static readonly BASE_GOLD_PER_POPULATION = 1.0;
    static readonly BASE_MAX_GOLD_STORAGE = 1000.0;
    static readonly GOLD_PRODUCING_MINERAL_NODES: Array<DiscoveryId> = [
        DiscoveryId.SILVER_MINE, DiscoveryId.GOLD_MINE, DiscoveryId.PLATINUM_MINE
    ];



    readonly player: Player;
    readonly data: GameState;

    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
    }

    get maxGoldStorage(): number {
        return Gold.BASE_MAX_GOLD_STORAGE;
    }

    get goldInStorage(): number {
        return this.data.goldInStorage;
    }

    set goldInStorage(amount) {
        this.data.goldInStorage = Math.trunc(amount);
    }

    get goldPerPopulation(): number {
        return Gold.BASE_GOLD_PER_POPULATION;
    }

    get goldEarnedPerTurn(): number {
        const goldFromPopulation = (this.player.population.populationUnitCount * this.goldPerPopulation)
            * (this.player.projects.isOwned(ProjectId.MARKETPLACE) ? 1.5 : 1.0);
        const goldFromMinerals = this.calculateGoldEarnedFromMineralNodes()
            * (this.player.projects.isOwned(ProjectId.MARKETPLACE) ? 1.5 : 1.0);
        const goldFromNonMinerals = this.calculateGoldEarnedFromNonMineralNodes();

        return Math.trunc(goldFromPopulation + goldFromMinerals + goldFromNonMinerals);
    }

    get goldSpentPerTurn(): number {
        const spentOnProjects = this.player.projects.builtProjects.map((projectId) => {
            return this.player.projects.lookupOrError(projectId);
        }).map((project) => {
            return project.getUpkeep(Resource.Gold);
        }).reduce((total, current) => {
            return total + current;
        }, 0);

        return spentOnProjects;
    }

    // UTILITY

    calculateGoldEarnedFromMineralNodes(): number {
        return this.player.discoveries.getOwnedNodes().filter((discovery: Discovery) => {
            // Filter to only nodes that are "mineral" nodes (effected by things that incease gold from mines)
            return Gold.GOLD_PRODUCING_MINERAL_NODES.includes(discovery.id);
        }).map((discovery: Discovery) => {
            // Map to the actual amount of gold produced
            if (discovery.resource.has(Resource.Gold)) {
                return discovery.resource.get(Resource.Gold);
            }
        }).filter((gold: number | undefined): gold is number => {
            // Filter out the ones that don't produce gold (should be unnecessary)
            return !!gold;
        }).reduce((sum, current) => {
            // Sum the total
            return sum + current;
        }, 0);
    }

    calculateGoldEarnedFromNonMineralNodes(): number {
        return this.player.discoveries.getOwnedNodes().filter((discovery: Discovery) => {
            // Filter to only nodes that aren't "mineral" nodes (effected by things that incease gold from mines)
            return !Gold.GOLD_PRODUCING_MINERAL_NODES.includes(discovery.id);
        }).map((discovery: Discovery) => {
            // Map to the actual amount of gold produced
            if (discovery.resource.has(Resource.Gold)) {
                return discovery.resource.get(Resource.Gold);
            }
        }).filter((gold: number | undefined): gold is number => {
            // Filter out the ones that don't produce gold (should be unnecessary)
            return !!gold;
        }).reduce((sum, current) => {
            // Sum the total
            return sum + current;
        }, 0);
    }
}
