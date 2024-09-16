
import Project from "./Project.js"

export default class Projects {

    constructor(player) {
        this.player = player;
        // The map of all projects defined in the system; [projectId -> project]
        this.definedProjects = this.createDefinedProjects(player);
    }

    get data() {
        if (!("data" in this.player)) {
            this.player.data = {}
        }
        if (!("projects" in this.player.data)) {
            this.player.data.projects = {}
        }

        // The projects the player has purchased, stored as a list of project ids
        // ex. [ BUILDERS_HALL, SMITHY ]
        if (!("builtProjects" in this.player.data.projects)) {
            this.player.data.projects.builtProjects = [];
        }

        return this.player.data.projects;
    }

    get builtProjects() {
        return this.data.builtProjects;
    }

    purchase(project) {
        if (project.isOwned || !project.isUnlocked || !project.canAfford) {
            return;
        }

        this.player.gold.goldInStorage -= project.getCost("gold");
        this.player.production.productionInStorage -= project.getCost("production");
        this.addOwned(project.id);
    }

    isOwned(key) {
        return this.data.builtProjects.includes(key);
    }

    addOwned(key) {
        if (!this.isOwned(playerObject, key)) {
            this.data.builtProjects.push(key);
        }
    }

    removeOwned(key) {
        const index = this.data.purchaseProjects.indexOf(key);
        if (index > -1) { // only splice array when item is found
            this.data.builtProjects = this.data.builtProjects.splice(index, 1); // 2nd parameter means remove one item only
        }
    }

    createDefinedProjects(playerObject) {
        var definedProjects = [];

        [
            new Project({
                id: "BUILDERS_HALL",
                displayName: "Builder's Hall",
                cost: { production: 60 },
                upkeep: { gold: 1 },
                description: "N/A",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "SMITHY",
                displayName: "Smithy",
                cost: { production: 40 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "GRANARY",
                displayName: "Granary",
                cost: { production: 40 },
                upkeep: { gold: 1 },
                description: "An important building for beginning town, adds both population growth and food output.",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "BARRACKS",
                displayName: "Barracks",
                cost: { production: 30 },
                upkeep: [],
                description: "A simple building used to train and house basic units. When combined with other buildings, allows the the training of more advanced units.",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "MARKETPLACE",
                displayName: "Marketplace",
                cost: { production: 100 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "FARMERS_MARKET",
                displayName: "Farmer's Market",
                cost: { production: 100 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['GRANARY', 'SMITHY', 'MARKETPLACE'],
                playerObject: playerObject
            }),
            new Project({
                id: "SAWMILL",
                displayName: "Sawmill",
                cost: { production: 100 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "FORESTERS_GUILD",
                displayName: "Forester's Guild",
                cost: { production: 200 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SAWMILL'],
                playerObject: playerObject
            }),
            new Project({
                id: "SHRINE",
                displayName: "Shrine",
                cost: { production: 100 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "TEMPLE",
                displayName: "Temple",
                cost: { production: 200 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SHRINE'],
                playerObject: playerObject
            }),
            new Project({
                id: "STABLES",
                displayName: "Stables",
                cost: { production: 80 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SMITHY'],
                playerObject: playerObject
            }),
            new Project({
                id: "ANIMISTS_GUILD",
                displayName: "Animist's Guild",
                cost: { production: 200 },
                upkeep: { gold: 5 },
                description: "",
                dependencies: ['TEMPLE', 'STABLES'],
                playerObject: playerObject
            }),
            new Project({
                id: "MINERS_GUILD",
                displayNamea: "Miner's Guild",
                cost: { production: 300 },
                upkeep: { gold: 3 },
                description: "",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "LIBRARY",
                displayName: "Library",
                cost: { production: 60 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: ['BUILDERS_HALL'],
                playerObject: playerObject
            }),
            new Project({
                id: "SAGES_GUILD",
                displayName: "Sage's Guild",
                cost: { production: 120 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['LIBRARY'],
                playerObject: playerObject
            }),
            new Project({
                id: "UNIVERSITY",
                displayName: "University",
                cost: { production: 300 },
                upkeep: { gold: 3 },
                description: "",
                dependencies: ['SAGES_GUILD'],
                playerObject: playerObject
            }),
            new Project({
                id: "BANK",
                displayName: "Bank",
                cost: { production: 250 },
                upkeep: { gold: 3 },
                description: "",
                dependencies: ['MARKETPLACE', 'UNIVERSITY'],
                playerObject: playerObject
            }),
            new Project({
                id: "SHIPWRIGHTS_GUILD",
                displayName: "Shipwright's Guild",
                cost: { production: 100 },
                upkeep: { gold: 1 },
                description: "",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "SHIPYARD",
                displayName: "Shipyard",
                cost: { production: 200 },
                upkeep: { gold: 2 },
                description: "",
                dependencies: ['SAWMILL', 'SHIPWRIGHTS_GUILD'],
                playerObject: playerObject
            }),
            new Project({
                id: "MERCHANTS_GUILD",
                displayName: "Merchant's Guild",
                cost: { production: 600 },
                upkeep: { gold: 5 },
                dependencies: ['BANK', 'SHIPYARD'],
                playerObject: playerObject
            }),
            new Project({
                id: "MECHANICIANS_GUILD",
                displayName: "Mechanician's Guild",
                cost: { production: 600 },
                upkeep: { gold: 5 },
                description: "",
                dependencies: ['MINERS_GUILD', 'UNIVERSITY'],
                playerObject: playerObject
            }),
            new Project({
                id: "EXPLORERS_GUILD",
                displayName: "Explorer's Guild",
                cost: { production: 600 },
                upkeep: { gold: 3 },
                description: "Trains and dispatches explorers to find things of interest in the surrounding lands",
                dependencies: [],
                playerObject: playerObject
            }),
            new Project({
                id: "ADVENTURERS_GUILD",
                displayName: "Adventurer's Guild",
                cost: { production: 2000 },
                upkeep: { gold: 5 },
                description: "Trains unique adventurers, heroes, to explore and conquer places of interest in the surrounding lands",
                dependencies: ['EXPLORERS_GUILD'],
                playerObject: playerObject
            })
        ].forEach(function (project, _index) {
            definedProjects[project.id] = project;
        })

        return definedProjects;
    }
}

