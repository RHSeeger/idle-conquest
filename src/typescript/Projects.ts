
import Project from "./Project"
import Player from "./Player"
import GameState from "./GameState"
import { Resource } from "./Resource"
import { ProjectId } from "./ProjectId"

export default class Projects {
    readonly player: Player;
    readonly data: GameState;
    readonly definedProjects: Map<ProjectId, Project>;

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

    isOwned(key: ProjectId) {
        return this.data.projectsBuilt.includes(ProjectId[key]);
    }

    addOwned(key: ProjectId) {
        if (!this.isOwned(key)) {
            this.data.projectsBuilt.push(ProjectId[key]);
        }
    }

    removeOwned(key: ProjectId) {
        const index = this.data.projectsBuilt.indexOf(ProjectId[key]);
        if (index > -1) { // only splice array when item is found
            this.data.projectsBuilt = this.data.projectsBuilt.splice(index, 1); // 2nd parameter means remove one item only
        }
    }

    /**
     * Given a string "key" (the string value of a ProjectId), returns the Project with that ProjectId
     * If the string is empty or no such project exists, throws an error
     */
    lookupOrError(key: string | null | undefined): Project {
        if (key === null || key === undefined) {
            throw new Error("key cannot be empty");
        }

        const projectId: ProjectId = (ProjectId.fromString(key));
        const project = this.definedProjects.get(projectId);
        if (project === undefined) {
            throw new Error("Unknown project: " + projectId);
        }

        return project;
    }

    static createDefinedProjects(playerObject: Player): Map<ProjectId, Project> {
        var definedProjects: Map<ProjectId, Project> = new Map();

        [
            new Project({
                id: ProjectId.BUILDERS_HALL,
                displayName: "Builder's Hall",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "The Builder's Hall provides no direct benefit of it's own, but is required for the construction of many other projects; such as a Granary",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.SMITHY,
                displayName: "Smithy",
                cost: new Map<Resource, number>([[Resource.Production, 40]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "The Smithy provides no direct benefit of it's own, but is required for the construction of many "
                    + "other projects; such as a Marketplace",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                // +20 population per turn
                // +2 maximum population
                // +2 food per turn (total, not per unit)
                id: ProjectId.GRANARY,
                displayName: "Granary",
                cost: new Map<Resource, number>([[Resource.Production, 40]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "An important building for beginning town, adds both population growth and food output.",
                dependencies: [ProjectId.BUILDERS_HALL],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.BARRACKS,
                displayName: "Barracks",
                cost: new Map<Resource, number>([[Resource.Production, 30]]),
                upkeep: new Map<Resource, number>(),
                description: "A simple building used to train and house basic units. Once build units can be assigned to as soldiers",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.MARKETPLACE,
                displayName: "Marketplace",
                cost: new Map<Resource, number>([[Resource.Production, 100]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "Increases the amount of gold gained from taxes and minerals/mining by 50%",
                dependencies: [ProjectId.SMITHY],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.FARMERS_MARKET,
                displayName: "Farmer's Market",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "",
                dependencies: [ProjectId.GRANARY, ProjectId.SMITHY, ProjectId.MARKETPLACE],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.SAWMILL,
                displayName: "Sawmill",
                cost: new Map<Resource, number>([[Resource.Production, 100]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.FORESTERS_GUILD,
                displayName: "Forester's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 200]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [ProjectId.SAWMILL],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.SHRINE,
                displayName: "Shrine",
                cost: new Map<Resource, number>([[Resource.Production, 100]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "",
                dependencies: [ProjectId.BUILDERS_HALL],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.TEMPLE,
                displayName: "Temple",
                cost: new Map<Resource, number>([[Resource.Production, 200]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [ProjectId.SHRINE],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.STABLES,
                displayName: "Stables",
                cost: new Map<Resource, number>([[Resource.Production, 80]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [ProjectId.SMITHY],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.ANIMISTS_GUILD,
                displayName: "Animist's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 200]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 5]]),
                description: "",
                dependencies: [ProjectId.TEMPLE, ProjectId.STABLES],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.MINERS_GUILD,
                displayName: "Miner's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 300]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 3]]),
                description: "",
                dependencies: [ProjectId.BUILDERS_HALL],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.LIBRARY,
                displayName: "Library",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "",
                dependencies: [ProjectId.BUILDERS_HALL],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.SAGES_GUILD,
                displayName: "Sage's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 120]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [ProjectId.LIBRARY],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.UNIVERSITY,
                displayName: "University",
                cost: new Map<Resource, number>([[Resource.Production, 300]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 3]]),
                description: "",
                dependencies: [ProjectId.SAGES_GUILD],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.BANK,
                displayName: "Bank",
                cost: new Map<Resource, number>([[Resource.Production, 250]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 3]]),
                description: "",
                dependencies: [ProjectId.MARKETPLACE, ProjectId.UNIVERSITY],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.SHIPWRIGHTS_GUILD,
                displayName: "Shipwright's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 100]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 1]]),
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.SHIPYARD,
                displayName: "Shipyard",
                cost: new Map<Resource, number>([[Resource.Production, 200]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 2]]),
                description: "",
                dependencies: [ProjectId.SAWMILL, ProjectId.SHIPWRIGHTS_GUILD],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.MERCHANTS_GUILD,
                displayName: "Merchant's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 600]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 5]]),
                description: "",
                dependencies: [ProjectId.BANK, ProjectId.SHIPYARD],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.MECHANICIANS_GUILD,
                displayName: "Mechanician's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 5]]),
                description: "",
                dependencies: [ProjectId.MINERS_GUILD, ProjectId.UNIVERSITY],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.EXPLORERS_GUILD,
                displayName: "Explorer's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 60]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 3]]),
                description: "Trains and dispatches explorers to find things of interest in the surrounding lands",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: ProjectId.ADVENTURERS_GUILD,
                displayName: "Adventurer's Guild",
                cost: new Map<Resource, number>([[Resource.Production, 2000]]),
                upkeep: new Map<Resource, number>([[Resource.Gold, 5]]),
                description: "Trains unique adventurers, heroes, to explore and conquer places of interest in the surrounding lands",
                dependencies: [ProjectId.EXPLORERS_GUILD],
                playerObject: playerObject
            })

        ].forEach(function (project, _index) {
            definedProjects.set(project.id, project);
        })

        return definedProjects;
    }
}

