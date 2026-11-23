export interface MonsterPlantMenuInput {
    dead: boolean;
    energy: number;
    maximumEnergy: number;
    level: number;
    maximumLevel: number;
    breedable: boolean;
}

export interface MonsterPlantMenu {
    revive: boolean;
    compost: boolean;
    /** Listed for every living plant. */
    treat: boolean;
    /** A plant at 98 % energy or more cannot be treated. */
    treatEnabled: boolean;
    breeding: boolean;
}

/**
 * AIR OwnPetMenuView, mode 3. A dead plant can be revived, and composted by the room owner where composting is on;
 * a living one lists Treat (off when nearly full) and, fully grown and breedable, the breeding entries.
 */
export const monsterPlantMenu = (plant: MonsterPlantMenuInput, isRoomOwner: boolean, compostingEnabled: boolean): MonsterPlantMenu => {
    if (plant.dead) return { revive: true, compost: compostingEnabled && isRoomOwner, treat: false, treatEnabled: false, breeding: false };

    return {
        revive: false,
        compost: false,
        treat: true,
        treatEnabled: plant.energy / plant.maximumEnergy < 0.98,
        breeding: plant.level === plant.maximumLevel && plant.breedable
    };
};
