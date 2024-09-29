/**
 * A enum for the ids of Discoveries
 * Prevents the issue where using a string means there can be a typo
 * 
 * String values are included to avoid the unfortunate way numeric enums interact with Object
 * See also: https://blog.logrocket.com/iterate-over-enums-typescript/
 */
export enum ProjectId {
    BUILDERS_HALL = "BUILDERS_HALL",
    SMITHY = "SMITHY",
    GRANARY = "GRANARY",
    BARRACKS = "BARRACKS",
    MARKETPLACE = "MARKETPLACE",
    FARMERS_MARKET = "FARMERS_MARKET",
    SAWMILL = "SAWMILL",
    FORESTERS_GUILD = "FORESTERS_GUILD",
    SHRINE = "SHRINE",
    TEMPLE = "TEMPLE",
    STABLES = "STABLES",
    ANIMISTS_GUILD = "ANIMISTS_GUILD",
    MINERS_GUILD = "MINERS_GUILD",
    LIBRARY = "LIBRARY",
    SAGES_GUILD = "SAGES_GUILD",
    UNIVERSITY = "UNIVERSITY",
    BANK = "BANK",
    SHIPWRIGHTS_GUILD = "SHIPWRIGHTS_GUILD",
    SHIPYARD = "SHIPYARD",
    MERCHANTS_GUILD = "MERCHANTS_GUILD",
    MECHANICIANS_GUILD = "MECHANICIANS_GUILD",
    EXPLORERS_GUILD = "EXPLORERS_GUILD",
    ADVENTURERS_GUILD = "ADVENTURERS_GUILD",
}

/**
 * By putting a namespace with the same name as the enum, it looks (to callers) that 
 * there's static methods on the enum
 * 
 * const did: ProjectId = ProjectId.fromFrom("EXPLORERS_GUILD");
 */
export namespace ProjectId {
    // Function to convert a string to the enum value
    export function fromString(value: string): ProjectId {
        // Use a type assertion to check against enum values
        const enumValue = Object.values(ProjectId).find((enumValue) => enumValue === value);
        if (enumValue === undefined) {
            throw new Error("Unknown ProjectId: " + value);
        }
        return enumValue as ProjectId; // Assert that the result is of type ProjectId
    }
}


