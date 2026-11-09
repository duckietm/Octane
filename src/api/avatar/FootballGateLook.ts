/**
 * The football gate (clothing change furni) editor, as AIR's FurnitureClothingChangeWidgetHandler:
 * it opens on the look the gate stored for the chosen gender (`furniture_clothing_boy` / `_girl`),
 * or on these looks when the gate has none, in the normal torso and legs tabs.
 */
export const DEFAULT_MALE_FOOTBALL_GATE_LOOK = 'hd-99999-99999.lg-270-62';
export const DEFAULT_FEMALE_FOOTBALL_GATE_LOOK = 'hd-99999-99999.ch-630-62.lg-695-62';

/** The look the gate editor opens on for `gender` ('M' or 'F'). */
export const getFootballGateLook = (gender: string, boyLook: string | null | undefined, girlLook: string | null | undefined): string => {
    if (gender === 'F') return girlLook || DEFAULT_FEMALE_FOOTBALL_GATE_LOOK;

    return boyLook || DEFAULT_MALE_FOOTBALL_GATE_LOOK;
};

/** Who may edit a gate: the room owner, an any-room controller, or anyone with rights in the room (controller level 1+). */
export const canEditFootballGate = (isRoomOwner: boolean, isAnyRoomController: boolean, controllerLevel: number): boolean =>
    !!isRoomOwner || !!isAnyRoomController || (controllerLevel ?? 0) >= 1;
