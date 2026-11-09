import { describe, expect, it } from 'vitest';
import { WiredAddonLayoutCode } from './WiredAddonLayoutCode';
import { WiredVariableLayoutCode } from './WiredVariableLayoutCode';

// The official AIR client's AddonCodes and VariableCodes (build WIN63-202610131318), for the ones we have.
const OFFICIAL_ADDONS: Record<string, number> = {
    CONDITION_EVALUATION: 0, RANDOM: 1, UNSEEN: 2, EXECUTION_LIMIT: 5, NO_MOVE_ANIMATION: 6, MOVE_PHYSICS: 7, CARRY_USERS: 8,
    ANIMATION_TIME: 9, FURNI_SELECTOR_FILTER: 10, USER_SELECTOR_FILTER: 11, FURNI_VARIABLE_FILTER: 12, USER_VARIABLE_FILTER: 13,
    USERNAME_PLACEHOLDER: 14, VARIABLE_PLACEHOLDER: 15, VARIABLE_CAPTURER: 16, EXECUTE_IN_ORDER: 17, CHEST_ITEM_TYPE_SCANNER: 18, FURNI_NAME_PLACEHOLDER: 19,
    CUSTOM_CONTRACT: 20, PROJECTILE: 21, MOVEMENT_CURVE: 22, VARIABLE_TEXT_CONVERTER: 1000, VARIABLE_LEVEL_UP: 1001, VARIABLE_TIME_UTIL: 1002,
    VARIABLE_ADDON_SHARE: 1003, VARIABLE_ADDON_IMPORT: 1004, VARIABLE_LEADERBOARD: 1005, VARIABLE_FX_HEALTH_POINTS: 1200, VARIABLE_FX_PROGRESS_BAR: 1201, VARIABLE_FX_LEVELLING_PROGRESS: 1202,
    VARIABLE_FX_STATUS_BAR: 1203, VARIABLE_FX_BOSS_BAR: 1204, VARIABLE_FX_NUMBER_DISPLAY: 1205, GLOBAL_PLACEHOLDER: 2000,
    ACHIEVEMENT_ENABLER: 2001, VARIABLES_WEB_API: 2002, LINK_SPEAKER: 2003
};
const OFFICIAL_VARIABLES: Record<string, number> = {
    FURNI_VARIABLE: 0, USER_VARIABLE: 1, GLOBAL_VARIABLE: 2, CONTEXT_VARIABLE: 3, REFERENCE_VARIABLE: 4, QUEST_VARIABLE: 5,
    QUEST_CHAIN_VARIABLE: 6, ECHO_VARIABLE: 7, DAILY_TASK_VARIABLE: 8, POINTER_VARIABLE: 9
};
const values = (table: unknown) => Object.values(table as Record<string, number>);

describe('WiredAddonLayoutCode / WiredVariableLayoutCode', () =>
{
    it('use the official codes', () =>
    {
        for(const [ name, code ] of Object.entries(OFFICIAL_ADDONS)) expect((WiredAddonLayoutCode as unknown as Record<string, number>)[name], name).toBe(code);
        for(const [ name, code ] of Object.entries(OFFICIAL_VARIABLES)) expect((WiredVariableLayoutCode as unknown as Record<string, number>)[name], name).toBe(code);
    });

    it('keep our own addons at 3000 and up, every code once', () =>
    {
        const codes = values(WiredAddonLayoutCode);

        expect(codes.filter(code => !values(OFFICIAL_ADDONS).includes(code)).every(code => code >= 3000)).toBe(true);
        expect(new Set(codes).size).toBe(codes.length);
        expect(new Set(values(WiredVariableLayoutCode)).size).toBe(values(WiredVariableLayoutCode).length);
    });
});
