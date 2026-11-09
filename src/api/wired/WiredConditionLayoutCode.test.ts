import { describe, expect, it } from 'vitest';
import { WiredConditionlayout } from './WiredConditionLayoutCode';

// The official AIR client's ConditionCodes (build WIN63-202610131318), under our names.
const OFFICIAL: Record<string, number> = {
    STATES_MATCH: 0, FURNIS_HAVE_AVATARS: 1, ACTOR_IS_ON_FURNI: 2, TIME_ELAPSED_MORE: 3, TIME_ELAPSED_LESS: 4,
    USER_COUNT_IN: 5, ACTOR_IS_IN_TEAM: 6, HAS_STACKED_FURNIS: 7, STUFF_TYPE_MATCHES: 8, ACTOR_IS_GROUP_MEMBER: 10,
    ACTOR_IS_WEARING_BADGE: 11, ACTOR_IS_WEARING_EFFECT: 12, NOT_STATES_MATCH: 13, FURNI_NOT_HAVE_HABBO: 14,
    NOT_ACTOR_ON_FURNI: 15, NOT_USER_COUNT_IN: 16, NOT_ACTOR_IN_TEAM: 17, NOT_HAS_STACKED_FURNIS: 18,
    NOT_FURNI_IS_OF_TYPE: 19, NOT_ACTOR_IN_GROUP: 21, NOT_ACTOR_WEARS_BADGE: 22, NOT_ACTOR_WEARING_EFFECT: 23,
    DATE_RANGE_ACTIVE: 24, ACTOR_HAS_HANDITEM: 25, TRIGGERER_MATCH: 26, NOT_TRIGGERER_MATCH: 27, MATCH_TIME: 28,
    MATCH_DATE: 29, NOT_ACTOR_HAS_HANDITEM: 30, TEAM_HAS_RANK: 31, USER_PERFORMS_ACTION: 32,
    NOT_USER_PERFORMS_ACTION: 33, TEAM_HAS_SCORE: 34, COUNTER_TIME_MATCHES: 35, HAS_ALTITUDE: 36, ACTOR_DIR: 37,
    SLC_QUANTITY: 38, MOVEMENT_VALIDATION: 39, HAS_VAR: 40, NEG_HAS_VAR: 41, VAR_VAL_MATCH: 42, VAR_AGE_MATCH: 43,
    USER_LEVEL: 44, CHEST_HAS_ITEMS: 45, CHEST_HAS_ITEM_TYPE: 46
};

describe('wired condition codes', () =>
{
    it('match the official client', () =>
    {
        for(const [ name, code ] of Object.entries(OFFICIAL)) expect([ name, (WiredConditionlayout as any)[name] ]).toEqual([ name, code ]);
    });

    it('keep conditions the official client does not have at 1000 and up', () =>
    {
        const official = new Set(Object.keys(OFFICIAL));

        for(const [ name, code ] of Object.entries(WiredConditionlayout).filter(([ name ]) => !official.has(name)))
        {
            expect([ name, (code as number) >= 1000 ]).toEqual([ name, true ]);
        }
    });
});
