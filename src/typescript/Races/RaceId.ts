/**
 * A enum for the ids of Races
 * Prevents the issue where using a string means there can be a typo
 * 
 * String values are included to avoid the unfortunate way numeric enums interact with Object
 * See also: https://blog.logrocket.com/iterate-over-enums-typescript/
 */
export enum RaceId {
    // Starting race
    HUMAN = "HUMAN",
    // Other races
    ELF = "ELF",
    DWARF = "DWARF",
    HALFLING = "HALFLING",
    ORC = "ORC",
    BEASTMAN = "BEASTMAN",
    // Magic dimension races
    DARK_ELF = "DARK_ELF",
    DRACONIAN = "DRACONIAN",
    TROLL = "TROLL",
}

/**
 * By putting a namespace with the same name as the enum, it looks (to callers) that 
 * there's static methods on the enum
 * 
 * const did: RaceId = RaceId.fromFrom("ELF");
 */
export namespace RaceId {
    // Function to convert a string to the enum value
    export function fromString(value: string): RaceId {
        // Use a type assertion to check against enum values
        const enumValue = Object.values(RaceId).find((enumValue) => enumValue === value);
        if (enumValue === undefined) {
            throw new Error("Unknown RaceId: " + value);
        }
        return enumValue as RaceId; // Assert that the result is of type RaceId
    }
}


