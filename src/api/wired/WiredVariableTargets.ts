/**
 * The official variable targets on the wire (furni 0, user 1, global -10, context -20) against the
 * kinds the variable condition editors use (user 0, furni 1, context 2, global 3), and the official
 * comparison numbers against value match's own order.
 */
export const WIRED_OFFICIAL_TARGET_FURNI = 0;
export const WIRED_OFFICIAL_TARGET_USER = 1;
export const WIRED_OFFICIAL_TARGET_GLOBAL = -10;
export const WIRED_OFFICIAL_TARGET_CONTEXT = -20;

export const toOfficialVariableTarget = (ours: number): number =>
{
    switch(ours)
    {
        case 1: return WIRED_OFFICIAL_TARGET_FURNI;
        case 2: return WIRED_OFFICIAL_TARGET_CONTEXT;
        case 3: return WIRED_OFFICIAL_TARGET_GLOBAL;
        default: return WIRED_OFFICIAL_TARGET_USER;
    }
};

export const fromOfficialVariableTarget = (official: number): number =>
{
    switch(official)
    {
        case WIRED_OFFICIAL_TARGET_FURNI: return 1;
        case WIRED_OFFICIAL_TARGET_CONTEXT: return 2;
        case WIRED_OFFICIAL_TARGET_GLOBAL: return 3;
        default: return 0;
    }
};

// Value match's comparisons (0 >, 1 >=, 2 =, 3 <=, 4 <, 5 !=) as the official numbers
// (0 <, 1 =, 2 >, 3 <=, 4 !=, 5 >=), and back.
const OFFICIAL_COMPARISON = [ 2, 5, 1, 3, 0, 4 ];
const OUR_COMPARISON = [ 4, 2, 0, 3, 5, 1 ];

export const toOfficialComparison = (ours: number): number => OFFICIAL_COMPARISON[ours] ?? 1;

export const fromOfficialComparison = (official: number): number => OUR_COMPARISON[official] ?? 2;
