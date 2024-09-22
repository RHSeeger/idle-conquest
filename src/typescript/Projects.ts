
import Project from "./Project"
import Player from "./Player"
import GameState from "./GameState"
import { Resource } from "./Resource"

export default class Projects {
    readonly player: Player;
    readonly data: GameState;
    readonly definedProjects: Map<string, Project>;
    
    constructor(player: Player) {
        this.player = player;
        this.data = player.data;
        this.definedProjects = Projects.createDefinedProjects(player);
    }

    get builtProjects(): Array<string> {
        return this.data.projectsBuilt;
    }

    purchase(project: Project) {
        if (project.isOwned || !project.isUnlocked || !project.canAfford) {
            return;
        }

        this.player.gold.goldInStorage -= project.getCost(Resource.Gold);
        this.player.production.productionInStorage -= project.getCost(Resource.Production);
        this.addOwned(project.id);
    }

    isOwned(key: string) {
        return this.data.projectsBuilt.includes(key);
    }

    addOwned(key: string) {
        if (!this.isOwned(key)) {
            this.data.projectsBuilt.push(key);
        }
    }

    removeOwned(key: string) {
        const index = this.data.projectsBuilt.indexOf(key);
        if (index > -1) { // only splice array when item is found
            this.data.projectsBuilt = this.data.projectsBuilt.splice(index, 1); // 2nd parameter means remove one item only
        }
    }

    static createDefinedProjects(playerObject: Player): Map<string, Project> {
        var definedProjects: Map<string, Project> = new Map();

        [
            new Project({
                id: "BUILDERS_HALL",
                displayName: "Builder's Hall",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "The Builder's Hall provides no direct benefit of it's own, but is required for the construction of many other projects; such as a Granary",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "SMITHY",
                displayName: "Smithy",
                cost: new Map<Resource, number>([[Resource.Production, 40]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "The Smithy provides no direct benefit of it's own, but is required for the construction of many other projects; such as a Marketplace",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                // +20 population per turn
                // +2 maximum population
                // +2 food per turn (total, not per unit)
                id: "GRANARY",
                displayName: "Granary",
                cost: new Map<Resource, number>([[Resource.Production, 40]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "An important building for beginning town, adds both population growth and food output.",
                dependencies: [ 'BUILDERS_HALL' ],
                playerObject: playerObject
            }),
            new Project({
                id: "BARRACKS",
                displayName: "Barracks",
                cost: new Map<Resource, number>([[Resource.Production, 30]]),
                upkeep: new Map<Resource, number>(),
                description: "A simple building used to train and house basic units. When combined with other buildings, allows the the training of more advanced units.",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "MARKETPLACE",
                displayName: "Marketplace",
                cost: new Map<Resource, number>([[Resource.Production, 100]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "Increases the amount of gold gained from taxes and minerals/mining by 50%",
                dependencies: [ 'SMITHY' ],
                playerObject: playerObject
            }),
            new Project({
                id: "FARMERS_MARKET",
                displayName: "Farmer's Market",
                cost: new Map<Resource, number>([[Resource.Production, 61000]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [ 'GRANARY', 'SMITHY', 'MARKETPLACE'],
                playerObject: playerObject
            }),/*
            new Project({
                id: "SAWMILL",
                displayName: "Sawmill",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 100 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "FORESTERS_GUILD",
                displayName: "Forester's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 200 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SAWMILL'],
                playerObject: playerObject
            }),
            new Project({
                id: "SHRINE",
                displayName: "Shrine",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 100 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "TEMPLE",
                displayName: "Temple",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 200 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SHRINE'],
                playerObject: playerObject
            }),
            new Project({
                id: "STABLES",
                displayName: "Stables",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 80 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SMITHY'],
                playerObject: playerObject
            }),
            new Project({
                id: "ANIMISTS_GUILD",
                displayName: "Animist's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 200 },
                upkeep: { gold: 5 },
                description: "",
                dependencies: ['TEMPLE', 'STABLES'],
                playerObject: playerObject
            }),
            new Project({
                id: "MINERS_GUILD",
                displayNamea: "Miner's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 300 },
                upkeep: { gold: 3 },
                description: "",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "LIBRARY",
                displayName: "Library",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 60 },
                upkeep: { gold: 5 }, // should be 1, but set high for testing
                description: "",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "SAGES_GUILD",
                displayName: "Sage's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 120 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['LIBRARY'],
                playerObject: playerObject
            }),
            new Project({
                id: "UNIVERSITY",
                displayName: "University",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 300 },
                upkeep: { gold: 3 },
                description: "",
                dependencies: ['SAGES_GUILD'],
                playerObject: playerObject
            }),
            new Project({
                id: "BANK",
                displayName: "Bank",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 250 },
                upkeep: { gold: 3 },
                description: "",
                dependencies: ['MARKETPLACE', 'UNIVERSITY'],
                playerObject: playerObject
            }),
            new Project({
                id: "SHIPWRIGHTS_GUILD",
                displayName: "Shipwright's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 100 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "SHIPYARD",
                displayName: "Shipyard",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 200 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SAWMILL', 'SHIPWRIGHTS_GUILD'],
                playerObject: playerObject
            }),
            new Project({
                id: "MERCHANTS_GUILD",
                displayName: "Merchant's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 600 },
                upkeep: { gold: 5 },
                dependencies: ['BANK', 'SHIPYARD'],
                playerObject: playerObject
            }),
            new Project({
                id: "MECHANICIANS_GUILD",
                displayName: "Mechanician's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 600 },
                upkeep: { gold: 5 },
                description: "",
                dependencies: ['MINERS_GUILD', 'UNIVERSITY'],
                playerObject: playerObject
            }),
            new Project({
                id: "EXPLORERS_GUILD",
                displayName: "Explorer's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 600 },
                upkeep: { gold: 3 },
                description: "Trains and dispatches explorers to find things of interest in the surrounding lands",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "ADVENTURERS_GUILD",
                displayName: "Adventurer's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                cost: { production: 2000 },
                upkeep: { gold: 5 },
                description: "Trains unique adventurers, heroes, to explore and conquer places of interest in the surrounding lands",
                dependencies: ['EXPLORERS_GUILD'],
                playerObject: playerObject
            })
                */
        ].forEach(function (project, _index) {
            definedProjects.set(project.id, project);
        })

        return definedProjects;
    }
}

