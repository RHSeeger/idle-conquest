/**
 * Tests for the Idle Conquest Javascript code base
 * 
 * For each test, it runs the code and adds a result to the html #test-results element
 */
import Player from "./Player.js"

function runTests(testCases) {
    const resultsList = document.querySelector("ul#test-results");

    //for (const testCase in testCases) {
    testCases.forEach(function(testCase) {
        try {
            const message = testCase();
            const li = document.createElement("li");
            li.classList.add("success");
            li.innerText = "PASS : " + testCase.name;
            resultsList.appendChild(li);

        } catch (err) {
            console.log(err);
            const li = document.createElement("li");
            li.classList.add("failure")
            li.innerText = "FAIL : " + testCase.name + " : " + err.message;
            resultsList.appendChild(li);
        }
    });
}

function assertEquals(actual, expected, failureMessage) {
    if (actual !== expected) {
        throw new Error(failureMessage);
    }
}

const testCases = [
    function project_isUnlocked_projectDependency_single_has() {
        // GIVEN - a player with lots of gold and production
        const player = new Player();
        player.gold.goldInStorage = 100;
        player.production.productionInStorage = 100;

        // WHEN - that player has the the dependency for a project with only one project dependency
        //        GRANARY requires BUILDERS_HALL
        player.projects.addOwned('BUILDERS_HALL')

        // THEN - the player has unlocked the granary
        assertEquals(player.projects.definedProjects['GRANARY'].isUnlocked, true, "granary unlocked by builders hall");
    },

    function project_isUnlocked_projectDependency_single_doesNotHave() {
        // GIVEN - a player with lots of gold and production
        const player = new Player();
        player.gold.goldInStorage = 100;
        player.production.productionInStorage = 100;

        // WHEN - that player does _not_ the the dependency for a project with only one project dependency
        //        GRANARY requires BUILDERS_HALL
        player.projects.addOwned('SMITHY')

        // THEN - the player has unlocked the granary
        assertEquals(player.projects.definedProjects['GRANARY'].isUnlocked, false, "granary not by smithy");
    },


]

runTests(testCases);