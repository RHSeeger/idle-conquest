// The main TypeScript entry point for the web app

import "../css/styles.css";

import Player from "./Player"
// TODO: Remove these if we don't actually need them
import Population from "./Population"
import Projects from "./Projects"
import Production from "./Production";
import Gold from "./Gold";
import Food from "./Food";

// Setup the player to the initial values
let playerObject = new Player();

const food = playerObject.food;
const population = playerObject.population;
const production = playerObject.production;
const gold = playerObject.gold;
const projects = playerObject.projects;
const military = playerObject.military;
const discoveries = playerObject.discoveries;

// So that they're accessible from the console, for debugging, and dirty cheaters ;)
(window as any).playerObject = playerObject;

function initializeDisplay() {
    console.log("Initializing display");

    // Add all projects
    const projectList = document.querySelector("#projects .project-items");
    for (let [projectId, project] of projects.definedProjects) {
        const li = document.createElement("li");
        li.setAttribute("data-project-id", projectId);
        li.classList.add("button")
        li.setAttribute("project-state", "locked")
        li.innerHTML = project.displayName;

        projectList?.appendChild(li);
    };

    // Add Discovery items
    const discoveryList = document.querySelector("#discoveries .discovery-items");
    for (let [discoveryId, discovery] of discoveries.definedDiscoveries) {
        const li = document.createElement("li");
        li.setAttribute("data-discovery-id", discoveryId);

        const label = document.createElement("span");
        label.classList.add("label");
        label.innerHTML = discovery.displayName;
        li.appendChild(label);

        const count = document.createElement("span");
        count.classList.add("count");
        count.innerHTML = "(0)";
        li.appendChild(count);

        discoveryList?.appendChild(li);
    };
}

function setupClicks() {
    // Fill Food button
    document.querySelector("#resources-section .food")?.addEventListener("click", function (e) {
        console.log("filling food");
        food.fillFoodStorage();
        updateDisplay();
    }, false);

    // Add Farmer (+) button
    document.querySelector("#farmer-add")?.addEventListener("click", function (e) {
        console.log("adding farmer");
        if (!population.canAddFarmer()) {
            // We can't assign any more farmers, because the entire population is already farming
            return;
        }

        population.numberOfFarmers = population.numberOfFarmers + 1;
        if ((population.numberOfFarmers + population.numberOfMilitary) > population.populationUnitCount) {
            // If population is over max, reduce military by one
            population.numberOfMilitary = population.numberOfMilitary - 1;
        }
        updateDisplay();
    }, false);

    // Remove Farmer (-) button
    document.querySelector("#farmer-remove")?.addEventListener("click", function (e) {
        console.log("removing farmer");
        if (!population.canRemoveFarmer) {
            // We can't remove any more farmers
            return;
        }

        population.numberOfFarmers = population.numberOfFarmers - 1;
        updateDisplay();
    }, false);

    // Add Soldier (+) button
    document.querySelector("#soldier-add")?.addEventListener("click", function (e) {
        console.log("adding soldier");
        if (population.canAddSoldier()) {
            population.numberOfMilitary += 1;
            if ((population.numberOfFarmers + population.numberOfMilitary) > population.populationUnitCount) {
                population.numberOfFarmers -= 1;
            }
            updateDisplay();
        }
    }, false);

    // Remove Soldier (-) button
    document.querySelector("#soldier-remove")?.addEventListener("click", function (e) {
        console.log("removing soldier");
        if (population.canRemoveSoldier()) {
            population.numberOfMilitary -= 1;
            updateDisplay();
        }
    }, false);

    // Project buttons
    document.querySelectorAll("#projects .project-items li[data-project-id]").forEach((projectElement) => {
        const projectId = projectElement.getAttribute("data-project-id");
        if (projectId === null) {
            console.log("Project elements missing")
            return;
        }
        const project = projects.definedProjects.get(projectId);
        if (project === undefined) {
            console.log("Project missing", projectId)
            return;
        }

        projectElement.addEventListener("click", function (e) {
            console.log("Purchasing project", projectId);
            if (project.isUnlocked && project.canAfford && !project.isOwned) {
                projects.purchase(project);
            }
        });
    });
}

function updateFood() {
    const currentFood = food.foodInStorage;
    const requiredFood = food.requiredFood;

    while ((currentFood + food.foodProducedPerTurn) < requiredFood) {
        console.log("Adjusting number of farmers because not enough food will be made");

        // Not enough food, some population needs to be switched to farmers
        if (population.numberOfFarmers >= population.populationUnitCount) {
            // Can't add any more farmers (this shouldn't be possible)
            throw new Error("Unable to add more farmers; no population available");
        }
        population.numberOfFarmers = population.numberOfFarmers + 1
    }

    // And then set the stored food to the new amount, after production and consumption
    food.foodInStorage = currentFood + food.foodProducedPerTurn - requiredFood;
}

/**
 * Set the textContent of an element in the DOM, identified by it's id
 * @param id 
 * @param value 
 * @returns 
 */
function setTextContentById(id: string, value: any) {
    const element = document.getElementById(id);
    if (element === null) {
        console.log("Unable to find element with id:", id);
        return;
    }
    element.textContent = value;
}

// Update display with current game state
function updateDisplay() {
    setTextContentById('total-population-value', population.populationUnitCount + " (" + population.populationCount + ")");
    setTextContentById('farmer-population-value', population.numberOfFarmers);
    setTextContentById('worker-population-value', population.numberOfWorkers);
    setTextContentById('military-population-value', population.numberOfMilitary);

    setTextContentById('food-value', food.foodInStorage);
    setTextContentById('food-max-value', food.maxFoodStorage);
    setTextContentById('gold-value', gold.goldInStorage);
    setTextContentById('gold-max-value', gold.maxGoldStorage);
    setTextContentById('production-value', production.productionInStorage);
    setTextContentById('production-max-value', production.maxProductionStorage);
    setTextContentById('military-power-value', military.militaryPowerInStorage);
    setTextContentById('military-power-max-value', military.militaryPowerMaxStorage);

    setTextContentById('food-required', food.requiredFood);
    setTextContentById('food-generated', food.foodProducedPerTurn);
    setTextContentById('work-generated', production.productionPerTurn);
    setTextContentById('population-increase', population.populationPerTurn);
    setTextContentById('gold-earned-per-turn', gold.goldEarnedPerTurn);
    setTextContentById('gold-spent-per-turn', gold.goldSpentPerTurn);
    setTextContentById('military-power-increase', military.militaryPowerEarnedPerTurn);

    // Disable buttons that can't be used right now

    // Farmer Add
    if (population.canAddFarmer()) {
        document.querySelector("#farmer-add")?.classList.remove("disabled");
    } else {
        document.querySelector("#farmer-add")?.classList.add("disabled");
    }

    // Farmer Remove
    if (population.canRemoveFarmer()) {
        document.querySelector("#farmer-remove")?.classList.remove("disabled");
    } else {
        document.querySelector("#farmer-remove")?.classList.add("disabled");
    }

    // Soldier Add / Remove / Hide
    if (projects.isOwned('BARRACKS')) {
        document.getElementById("military-population")?.classList.remove("hidden");
        // TODO: Also unhide military power storage and per turn
        if (population.canAddSoldier()) {
            document.querySelector("#soldier-add")?.classList.remove("disabled");
        } else {
            document.querySelector("#soldier-add")?.classList.add("disabled");
        }
        if (population.canRemoveSoldier()) {
            document.querySelector("#soldier-remove")?.classList.remove("disabled");
        } else {
            document.querySelector("#soldier-remove")?.classList.add("disabled");
        }
    } else {
        document.getElementById("military-population")?.classList.add("hidden");
        // TODO: Also hide military power storage and per turn
    }

    // Update Projects (show/hide, enable/disable)
    document.querySelectorAll("#projects .project-items li[data-project-id]").forEach((projectElement) => {
        const projectId = projectElement.getAttribute("data-project-id");
        if (projectId === null) {
            return;
        }
        const project = projects.definedProjects.get(projectId);
        if (project === undefined) {
            return;
        }

        // update hidden / unlocked
        if (project.isOwned) {
            projectElement.setAttribute("project-state", "owned")
        } else if (project.canAfford && project.isUnlocked) {
            projectElement.setAttribute("project-state", "canAfford")
        } else if (project.isUnlocked) {
            projectElement.setAttribute("project-state", "unlockedButCannotAfford")
        } else {
            projectElement.setAttribute("project-state", "locked")
        }
    });

    // Update Discoveries
    const discoveriesElement = document.getElementById("discoveries");
    if (projects.isOwned('EXPLORERS_GUILD')) {
        discoveriesElement?.classList.remove('hidden');
        discoveriesElement?.querySelectorAll(".discovery-items li[data-discovery-id]").forEach((discoveryElement) => {
            const discoveryId = discoveryElement.getAttribute("data-discovery-id");
            if (discoveryId === null) {
                return;
            }
            const discovery = discoveries.definedDiscoveries.get(discoveryId);
            if (discovery === undefined) {
                return;
            }
    
            // update hidden / unlocked
            if (discovery.isOwned) {
                const numberOwned = discovery.numberOwned;
                discoveryElement.setAttribute("discovery-state", "owned")
                const span = discoveryElement.querySelector(".count");
                if (span !== null) {
                    span.textContent = "(" + discovery.numberOwned + ")";
                }

            } else {
                discoveryElement.setAttribute("discovery-state", "unowned")
            }
        });

        
    } else {
        discoveriesElement?.classList.add('hidden');
    }

    // Debugging
    var seen: Array<any> = [];
    (document.querySelector("#playerData .player-object .data") as HTMLInputElement).innerText = JSON.stringify(
        playerObject.data,
        (_key: any, val: any) => {
            if (val != null && typeof val == "object") {
                if (seen.indexOf(val) >= 0) {
                    return;
                }
                seen.push(val);
            }
            return val;
        },
        2);
}

function updatePopulation() {
    const currentPopulation = population.populationCount;
    const addedPopulation = population.populationPerTurn;

    population.populationCount = currentPopulation + addedPopulation;
}

function updateProduction() {
    const currentProduction = production.productionInStorage;
    const productionGenerated = production.productionPerTurn;

    production.productionInStorage = Math.trunc(currentProduction + productionGenerated);
}

function updateGold() {
    gold.goldInStorage = gold.goldInStorage + gold.goldEarnedPerTurn - gold.goldSpentPerTurn;
}

function updateMilitary() {
    military.militaryPowerInStorage = military.militaryPowerInStorage + military.militaryPowerEarnedPerTurn;
}

function restrictToRange(value: number, min: number, max: number) {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
}

/**
 * Update the values to be between the min and max allowed values
 */
function restrictValues() {
    food.foodInStorage = restrictToRange(food.foodInStorage, 0, food.maxFoodStorage);
    production.productionInStorage = restrictToRange(production.productionInStorage, 0, production.maxProductionStorage);
    gold.goldInStorage = restrictToRange(gold.goldInStorage, 0, gold.maxGoldStorage);
    military.militaryPowerInStorage = restrictToRange(military.militaryPowerInStorage, 0, military.militaryPowerMaxStorage);
}

// Main game loop
function gameLoop() {
    updateFood();
    updateProduction();
    updateGold();
    updatePopulation();
    updateMilitary();
    discoveries.travel();

    restrictValues();

    updateDisplay();

    // Schedule next game loop
    setTimeout(gameLoop, 100); // TODO: Put it back at 1000 for 1 second per turn
}

function displayLoop() {
    updateDisplay();
    setTimeout(displayLoop, 100);
}

// Start the game loop
initializeDisplay();
setupClicks();
gameLoop();
displayLoop();

// TESTING
projects.addOwned('EXPLORERS_GUILD');
