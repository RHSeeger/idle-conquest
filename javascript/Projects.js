
import Project from "./Project.js"

const BUILDERS_HALL = new Project({
    displayName: "Builder's Hall",
    cost: {production: 60},
    upkeep: {gold: 1},
    description: "N/A",
    dependencies: []
});

const SMITHY = new Project({
    displayName: "Smithy",
    cost: {production: 40},
    upkeep: {gold: 1},
    description: "",
    dependencies: []
});

const GRANARY = new Project({
    displayName: "Granary",
    cost: {production: 40},
    upkeep: {gold: 1},
    description: "An important building for beginning town, adds both population growth and food output.",
    dependencies: [BUILDERS_HALL]
});

const BARRACKS = new Project({
    displayName: "Barracks",
    cost: {production: 30},
    upkeep: [ ],
    description: "A simple building used to train and house basic units. When combined with other buildings, allows the the training of more advanced units.",
    dependencies: []
});

const MARKETPLACE = new Project({
    displayName: "Marketplace",
    cost: {production: 100},
    upkeep: {gold: 1},
    description: "",
    dependencies: [ ]
});

const FARMERS_MARKET = new Project({
    displayName: "Farmer's Market",
    cost: {production: 100},
    upkeep: {gold: 2},
    description: "",
    dependencies: [GRANARY, SMITHY, MARKETPLACE]
});

const SAWMILL = new Project({
    displayName: "Sawmill",
    cost: {production: 100},
    upkeep: {gold: 2},
    description: "",
    dependencies: []
});

const FORESTERS_GUILD = new Project({
    displayName: "Forester's Guild",
    cost: {production: 200},
    upkeep: {gold: 2},
    description: "",
    dependencies: [SAWMILL]
});

const SHRINE = new Project({
    displayName: "Shrine",
    cost: {production: 100},
    upkeep: {gold: 1},
    description: "",
    dependencies: [BUILDERS_HALL]
});

const TEMPLE = new Project({
    displayName: "Temple",
    cost: {production: 200},
    upkeep: {gold: 2},
    description: "",
    dependencies: [SHRINE]
});

const STABLES = new Project({
    displayName: "Stables",
    cost: {production: 80},
    upkeep: {gold: 2},
    description: "",
    dependencies: [SMITHY]
});

const ANIMISTS_GUILD = new Project({
    displayName: "Animist's Guild",
    cost: {production: 200},
    upkeep: {gold: 5},
    description: "",
    dependencies: [TEMPLE, STABLES]
});

const MINERS_GUILD = new Project({
    displayName: "Miner's Guild",
    cost: {production: 300},
    upkeep: {gold: 3},
    description: "",
    dependencies: [BUILDERS_HALL]
});

const LIBRARY = new Project({
    displayName: "Library",
    cost: {production: 60},
    upkeep: {gold: 1},
    description: "",
    dependencies: [BUILDERS_HALL]
});

const SAGES_GUILD = new Project({
    displayName: "Sage's Guild",
    cost: {production: 120},
    upkeep: {gold: 2},
    description: "",
    dependencies: [LIBRARY]
});

const UNIVERSITY = new Project({
    displayName: "University",
    cost: {production: 300},
    upkeep: {gold: 3},
    description: "",
    dependencies: [SAGES_GUILD]
});

const BANK = new Project({
    displayName: "Bank",
    cost: {production: 250},
    upkeep: {gold: 3},
    description: "",
    dependencies: [MARKETPLACE, UNIVERSITY]
});

const SHIPWRIGHTS_GUILD = new Project({
    displayName: "Shipwright's Guild",
    cost: {production: 100},
    upkeep: {gold: 1},
    description: "",
    dependencies: []
});

const SHIPYARD = new Project({
    displayName: "Shipyard",
    cost: {production: 200},
    upkeep: {gold: 2},
    description: "",
    dependencies: [SAWMILL, SHIPWRIGHTS_GUILD]
});

const MERCHANTS_GUILD = new Project({
    displayName: "Merchant's Guild",
    cost: {production: 600},
    upkeep: {gold: 5},
    dependencies: [BANK, SHIPYARD]
});

const MECHANICIANS_GUILD = new Project({
    displayName: "Mechanician's Guild",
    cost: {production: 600},
    upkeep: {gold: 5},
    description: "",
    dependencies: [MINERS_GUILD, UNIVERSITY]
});

const EXPLORERS_GUILD = new Project({
    displayName: "Explorer's Guild",
    cost: {production: 600},
    upkeep: {gold: 3},
    description: "Trains and dispatches explorers to find things of interest in the surrounding lands",
    dependencies: []
});

const ADVENTURERS_GUILD = new Project({
    displayName: "Adventurer's Guild",
    cost: {production: 2000},
    upkeep: {gold: 5},
    description: "Trains unique adventurers, heroes, to explore and conquer places of interest in the surrounding lands",
    dependencies: [EXPLORERS_GUILD]
});

// Need to redo this so there's a Projects object with methods, etc
// and a separate list of actual Project instances
const Projects = {
    BUILDERS_HALL: BUILDERS_HALL,
    SMITHY, SMITHY,
    GRANARY: GRANARY,
    BARRACKS: BARRACKS,
    FARMERS_MARKET: FARMERS_MARKET,
    FORESTERS_GUILD: FORESTERS_GUILD,
    ANIMISTS_GUILD: ANIMISTS_GUILD,
    MINERS_GUILD: MINERS_GUILD,
    MARKETPLACE: MARKETPLACE,
    BANK: BANK,
    MERCHANTS_GUILD: MERCHANTS_GUILD,
    SAWMILL: SAWMILL,
    MECHANICIANS_GUILD: MECHANICIANS_GUILD,
    SHRINE: SHRINE,
    TEMPLE: TEMPLE,
    STABLES: STABLES,
    LIBRARY: LIBRARY,
    SAGES_GUILD: SAGES_GUILD,
    UNIVERSITY: UNIVERSITY,
    SHIPWRIGHTS_GUILD: SHIPWRIGHTS_GUILD,
    SHIPYARD: SHIPYARD,
    EXPLORERS_GUILD: EXPLORERS_GUILD,
    ADVENTURERS_GUILD, ADVENTURERS_GUILD
};
const keys = Object.keys(Projects);

Projects.getKeys = function() {
    return keys;
}

Projects.getValues = function() {
    return keys.map(project => Projects[project]);
}

Projects.isOwned(playerObject, key) {
    return playerObject.purchaseProjects.includes(key);
}

Projects.addOwned(playerOjbect, key) {
    if (!isOwned(playerObject, key)) {
        playerObject.purchaseProjects.add(key);
    }
}
Projects.removeOwned(playerOjbect, key) {
    const index = playerObject.purchaseProjects.indexOf(key);
    if (index > -1) { // only splice array when item is found
        playerObject.purchaseProjects = playerObject.purchaseProjects.splice(index, 1); // 2nd parameter means remove one item only
    }
}

export default Projects;
