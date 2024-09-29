/**
 * A enum for the ids of Discoveries
 * Prevents the issue where using a string means there can be a typo
 * 
 * String values are included to avoid the unfortunate way numeric enums interact with Object
 * See also: https://blog.logrocket.com/iterate-over-enums-typescript/
 */
export enum DiscoveryId {
    // Nodes - gold
    SILVER_MINE = "SILVER_MINE",
    GOLD_MINE = "GOLD_MINE",
    PLATINUM_MINE = "PLATINUM_MINE",

    TREASURE_STASH_GOLD = "TREASURE_STASH_GOLD",

    // Nodes - military power
    MYTHRIL_MINE = "MYTHRIL_MINE",
    ADAMANTUM_MINE = "ADAMANTUM_MINE",

    // Nodes - food
    BOUNTIFUL_FOREST = "BOUNTIFUL_FOREST",

    // Nodes - production
    OLD_MILL = "OLD_MILL",
    WANDERING_MASTER = "WANDERING_MASTER"
}

/**
 * By putting a namespace with the same name as the enum, it looks (to callers) that 
 * there's static methods on the enum
 * 
 * const did: DiscoveryId = DiscoveryId.fromFrom("OLD_MILL");
 */
export namespace DiscoveryId {
    // Function to convert a string to the enum value
    export function fromString(value: string): DiscoveryId {
        // Use a type assertion to check against enum values
        const enumValue = Object.values(DiscoveryId).find((enumValue) => enumValue === value);
        if (enumValue === undefined) {
            throw new Error("Unknown DiscoveryId: " + value);
        }
        return enumValue as DiscoveryId; // Assert that the result is of type DiscoveryId
    }
}