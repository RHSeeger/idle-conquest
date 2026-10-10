/**
 * City defensive traits. Each multiplies the siege power of troop roles while
 * attacking that city — so the army mix you need depends on what you face.
 */
export type Role = "melee" | "pike" | "ranged" | "cavalry" | "siege";

export const ROLES: Role[] = ["melee", "pike", "ranged", "cavalry", "siege"];

export const ROLE_NAMES: Record<Role, string> = {
    melee: "Melee",
    pike: "Pike",
    ranged: "Ranged",
    cavalry: "Cavalry",
    siege: "Siege",
};

export type TraitId =
    | "walls"
    | "archers"
    | "cavalryScreen"
    | "shieldWall"
    // monster traits (lairs)
    | "undead"
    | "flying"
    | "regenerating"
    | "swarm"
    // rival wizards' domains
    | "wards";

export interface TraitDef {
    id: TraitId;
    name: string;
    description: string;
    roleMults: Partial<Record<Role, number>>;
}

export const TRAITS: Record<TraitId, TraitDef> = {
    // City traits are sharp on purpose (DESIGN.md §15.4): the army's mix against them is Layer 1's puzzle
    walls: {
        id: "walls",
        name: "City Walls",
        description: "Melee, pike and cavalry ×0.25; siege ×3",
        roleMults: { melee: 0.25, pike: 0.25, cavalry: 0.25, siege: 3 },
    },
    archers: {
        id: "archers",
        name: "Archer Garrison",
        description: "Ranged ×0.5; cavalry ×2 (they ride the archers down)",
        roleMults: { ranged: 0.5, cavalry: 2 },
    },
    cavalryScreen: {
        id: "cavalryScreen",
        name: "Cavalry Screen",
        description: "Cavalry ×0.25; pike ×3",
        roleMults: { cavalry: 0.25, pike: 3 },
    },
    shieldWall: {
        id: "shieldWall",
        name: "Shield Wall",
        description: "Melee ×0.4; ranged ×2",
        roleMults: { melee: 0.4, ranged: 2 },
    },
    undead: {
        id: "undead",
        name: "Undead",
        description: "Arrows pass through bone: ranged ×0.5; cavalry ×0.75; melee ×1.25",
        roleMults: { ranged: 0.5, cavalry: 0.75, melee: 1.25 },
    },
    flying: {
        id: "flying",
        name: "Flying",
        description: "Out of reach: melee and pike ×0.5; ranged ×1.5",
        roleMults: { melee: 0.5, pike: 0.5, ranged: 1.5 },
    },
    regenerating: {
        id: "regenerating",
        name: "Regenerating",
        description: "Wounds close: everything ×0.75 except siege ×1.5",
        roleMults: { melee: 0.75, pike: 0.75, ranged: 0.75, cavalry: 0.75, siege: 1.5 },
    },
    wards: {
        id: "wards",
        name: "Wizard's Wards",
        description: "A rival wizard's protection: everything ×0.01. Dispel Magic breaks it.",
        roleMults: { melee: 0.01, pike: 0.01, ranged: 0.01, cavalry: 0.01, siege: 0.01 },
    },
    swarm: {
        id: "swarm",
        name: "Swarm",
        description: "Too many to besiege: siege ×0.5; cavalry and pike ×1.5",
        roleMults: { siege: 0.5, cavalry: 1.5, pike: 1.5 },
    },
};

export function traitRoleMult(traits: readonly TraitId[], role: Role): number {
    let mult = 1;
    for (const t of traits) {
        mult *= TRAITS[t].roleMults[role] ?? 1;
    }
    return mult;
}
