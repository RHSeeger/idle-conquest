
import Population from "./Population.js"
import Player from "./Player.js"
import Projects from "./Projects.js"

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
        li.classList.add("disabled"); // all projects are disabled until enabled (user has resources to buy and maintain it)
        li.classList.add("hidden"); // all projects are hidden until shown (pre-reqs are met)
        li.classList.add("button")
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

}

function updateFood() {
    const currentFood = food.foodInStorage;
    const requiredFood = food.requiredFood;
    const foodPerFarmers = food.foodPerFarmer;

    var currentFarmers = population.numberOfFarmers;
    var producedFood = currentFarmers * foodPerFarmers;

    if ((currentFood + producedFood) < requiredFood) {
        console.log("Adjusting number of farmers because not enough food will be made");
        // Not enough food, some population needs to be switched to farmers
        const numberOfFarmersNeeded = Math.ceil(requiredFood / foodPerFarmers);
        population.numberOfFarmers = numberOfFarmersNeeded;

        currentFarmers = population.numberOfFarmers;
        producedFood = currentFarmers * foodPerFarmers;
    }

    // And then set the stored food to the new amount, after production and consumption
    food.foodInStorage = currentFood + producedFood - requiredFood;
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
    document.getElementById('food-generated').textContent = population.numberOfFarmers * food.foodPerFarmer;
    document.getElementById('work-generated').textContent = population.numberOfWorkers * production.productionPerWorker;

    // Disable buttons that can't be used right now
    if (population.numberOfFarmers >= population.populationUnitCount) {
        document.querySelector("#farmer-add").classList.add("disabled");
    } else {
        document.querySelector("#farmer-add").classList.remove("disabled");
    }

    const requiredFood = food.requiredFood;
    const producedFood = population.numberOfFarmers * food.foodPerFarmer;
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
        
        if (projects.definedProjects[projectId].isUnlocked) {
            projectElement.classList.remove("hidden");
        } else if (projects.definedProjects[projectId].isOwned) {
            projectElement.classList.remove("hidden");
        } else {
            projectElement.classList.add("hidden");
        }

        // update disabled / can affod
        if (projects.definedProjects[projectId].canAfford) {
            projectElement.classList.remove("disabled");
        } else {
            projectElement.classList.add("disabled");
        }
    });
}

function updatePopulation(player) {
    const populationUnitCount = population.populationUnitCount;
    const addedPopulation = 20; // TODO: Calculate this
    const newPopulation = population.populationCount + addedPopulation;
    population.populationCount = newPopulation;
}

function updateProduction(player) {
    const prodPerWorker = production.productionPerWorker;
    const currentProduction = production.productionInStorage;
    const currentWorkers = population.numberOfWorkers;

    const newProctionInStorage = Math.trunc(currentProduction + (currentWorkers * prodPerWorker));
    production.productionInStorage = newProctionInStorage;
}

function updateGold(player) {
    const goldPerPopulation = gold.goldPerPopulation;
    const currentGold = gold.goldInStorage;
    const currentPopulation = population.populationUnitCount;
    gold.goldInStorage = currentGold + Math.trunc(currentPopulation * goldPerPopulation);
}

/**
 * Update the values to be between the min and max allowed values
 */
function restrictValues(player) {
    food.foodInStorage = Math.min(Math.max(food.foodInStorage, 0), food.maxFoodStorage);
    production.productionInStorage = Math.min(Math.max(production.productionInStorage, 0), production.maxProductionStorage);
    player.goldInStorage = Math.min(Math.max(gold.goldInStorage, 0), gold.maxGoldStorage);
}

// Main game loop
function gameLoop() {
    updateFood(player);
    updateProduction(player);
    updateGold(player);

    updatePopulation(player);

    restrictValues(player);

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
