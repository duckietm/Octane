export interface PetButtonInput {
    isOwner: boolean;
    canRemovePet: boolean;
    isMonsterplant: boolean;
}

export interface PetButtons {
    pickUp: boolean;
    kick: boolean;
    move: boolean;
    rotate: boolean;
}

/**
 * Mirrors InfoStandPetView.as: the owner picks the pet up, a room
 * controller who is not the owner kicks it (same server message, the
 * pet returns to its owner's inventory). Moving needs the same rights;
 * rotating is only meaningful for monsterplants, the only pet the
 * renderer rotates through the furniture flow.
 */
export const getPetButtons = (input: PetButtonInput): PetButtons => {
    const pickUp = input.isMonsterplant ? input.canRemovePet : input.isOwner;

    return {
        pickUp,
        kick: input.canRemovePet && !input.isOwner && !input.isMonsterplant,
        move: input.canRemovePet,
        rotate: input.canRemovePet && input.isMonsterplant
    };
};
