
import Population from "../src/typescript/Population.js"
import Player from "../src/typescript/Player.js"
import Projects from "../src/typescript/Projects.js"

// Initialize game variables
const initialValues = {
    // population/roles
    population: 1.0,
    farmers: 1,
    military: 0,
    // storage
    foodInStorage: 0,
    productionInStorage: 0,
    goldInStorage: 0,
    purchasedProjects: []
}

// Setup the player to the initial values
let player = Object.fromEntries(Object.entries(initialValues));

let playerObject = new Player();
const food = playerObject.food;
const population = playerObject.population;
const production = playerObject.production;
const gold = playerObject.gold;
const projects = playerObject.projects;

// So that they're accessible from the console, for debugging, and dirty cheaters ;)
window.player = player;
window.playerObject = playerObject;

function initializeDisplay() {
    console.log("Initializing display");

    // Add all projects
    const projectList = document.querySelector("#projects .project-items");
    for (let [projectId, project] of Object.entries(projects.definedProjects)) {
        const li = document.createElement("li");
        li.setAttribute("data-project-id", projectId);
        li.classList.add("button")
        li.setAttribute("project-state", "locked")
        li.innerHTML = project.displayName;

        projectList.appendChild(li);
    };
}

function setupClicks() {
    // Fill Food button
    document.querySelector("#resources-section .food").addEventListener("click", function (e) {
        console.log("filling food");
        food.fillFoodStorage();
        updateDisplay();
    }, false);

    // Add Farmer (+) button
    document.querySelector("#farmer-add").addEventListener("click", function (e) {
        console.log("adding farmer");
        if (population.numberOfFarmers >= population.populationUnitCount) {
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
    document.querySelector("#farmer-remove").addEventListener("click", function (e) {
        console.log("removing farmer");
        if (population.numberOfFarmers <= 0) {
            // We can't remove any more farmers
            return;
        }

        population.numberOfFarmers = population.numberOfFarmers - 1;
        updateDisplay();
    }, false);

    // Project buttons
    document.querySelectorAll("#projects .project-items li[data-project-id]").forEach((projectElement) => {
        const projectId = projectElement.getAttribute("data-project-id");
        const project = projects.definedProjects[projectId];

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

// Update display with current game state
function updateDisplay() {
    document.getElementById('total-population-value').textContent = population.populationUnitCount + " (" + population.populationCount + ")";
    document.getElementById('farmer-population-value').textContent = population.numberOfFarmers;
    document.getElementById('worker-population-value').textContent = population.numberOfWorkers;
    document.getElementById('military-population-value').textContent = population.numberOfMilitary;

    document.getElementById('food-value').textContent = food.foodInStorage;
    document.getElementById('food-max-value').textContent = food.maxFoodStorage;
    document.getElementById('gold-value').textContent = gold.goldInStorage;
    document.getElementById('gold-max-value').textContent = gold.maxGoldStorage;
    document.getElementById('production-value').textContent = production.productionInStorage;
    document.getElementById('production-max-value').textContent = production.maxProductionStorage;

    document.getElementById('food-required').textContent = food.requiredFood;
    document.getElementById('food-generated').textContent = food.foodProducedPerTurn;
    document.getElementById('work-generated').textContent = population.numberOfWorkers * production.productionPerWorker;
    document.getElementById('population-increase').textContent = population.populationPerTurn;
    document.getElementById('gold-earned-per-turn').textContent = gold.goldEarnedPerTurn;
    document.getElementById('gold-spent-per-turn').textContent = gold.goldSpentPerTurn;

    // Disable buttons that can't be used right now
    if (population.numberOfFarmers >= population.populationUnitCount) {
        document.querySelector("#farmer-add").classList.add("disabled");
    } else {
        document.querySelector("#farmer-add").classList.remove("disabled");
    }

    const requiredFood = food.requiredFood;
    const producedFood = food.foodProducedPerTurn;
    if (population.numberOfFarmers <= 0 || (food.foodInStorage === 0 && producedFood <= requiredFood)) {
        document.querySelector("#farmer-remove").classList.add("disabled");
    } else {
        document.querySelector("#farmer-remove").classList.remove("disabled");
    }

    // Update Projects (show/hide, enable/disable)
    document.querySelectorAll("#projects .project-items li[data-project-id]").forEach((projectElement) => {
        const projectId = projectElement.getAttribute("data-project-id");
        const project = projects.definedProjects[projectId];

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

    // Debugging
    var seen = [];
    const replacer = function (key, val) {
        if (val != null && typeof val == "object") {
            if (seen.indexOf(val) >= 0) {
                return;
            }
            seen.push(val);
        }
        return val;
    }
    document.querySelector("#playerData .player .data").innerText = JSON.stringify(window.player, replacer, 2);
    document.querySelector("#playerData .player-object .data").innerText = JSON.stringify(window.playerObject, replacer, 2);
}

function updatePopulation() {
    const addedPopulation = population.populationPerTurn;
    const newPopulation = population.populationCount + addedPopulation;
    population.populationCount = newPopulation;
}

function updateProduction() {
    const prodPerWorker = production.productionPerWorker;
    const currentProduction = production.productionInStorage;
    const currentWorkers = population.numberOfWorkers;

    const newProctionInStorage = Math.trunc(currentProduction + (currentWorkers * prodPerWorker));
    production.productionInStorage = newProctionInStorage;
}

function updateGold() {
    /* const goldPerPopulation = gold.goldPerPopulation;
    const currentGold = gold.goldInStorage;
    const currentPopulation = population.populationUnitCount; */
    gold.goldInStorage = gold.goldInStorage + gold.goldEarnedPerTurn - gold.goldSpentPerTurn;
}

/**
 * Update the values to be between the min and max allowed values
 */
function restrictValues() {
    food.foodInStorage = Math.min(Math.max(food.foodInStorage, 0), food.maxFoodStorage);
    production.productionInStorage = Math.min(Math.max(production.productionInStorage, 0), production.maxProductionStorage);
    gold.goldInStorage = Math.min(Math.max(gold.goldInStorage, 0), gold.maxGoldStorage);
}

// Main game loop
function gameLoop() {
    updateFood();
    updateProduction();
    updateGold();
    updatePopulation();

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
