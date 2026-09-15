/**
 * Bridge between the legacy navigator link vocabulary and the search codes the
 * new navigator sends (AIR 13 `FakeMainViewCtrl.getSearchCodeByLegacySearchType`
 * and `HabboNewNavigator.getSearchCodeForTabLink`).
 *
 * Other components still open the navigator with `navigator/search/<x>[/<filter>]`
 * where `<x>` is a legacy numeric search type, a legacy search code (`groups`,
 * `favorites`, ...), a top-level tab code (`hotel_view`, ...) or plain text.
 */

export interface NavigatorSearchContext {
    code: string;
    filter: string;
}

/** `FakeMainViewCtrl.as:71-124` - legacy integer search type to search code. */
export const LEGACY_SEARCH_TYPE_CODES: Readonly<Record<number, string>> = {
    1: 'popular',
    2: 'highest_score',
    3: 'friends_rooms',
    4: 'with_friends',
    5: 'my',
    6: 'favorites',
    7: 'history',
    8: 'query',
    9: 'query',
    10: 'query',
    11: 'official',
    12: 'new_ads',
    13: 'groups',
    14: 'groups',
    15: 'competition',
    16: 'top_promotions',
    17: 'new_ads',
    18: 'with_rights',
    19: 'my_groups',
    20: 'query',
    21: 'all_categories',
    22: 'recommended',
    23: 'history_freq'
};

export const getSearchCodeByLegacySearchType = (searchType: number): string => LEGACY_SEARCH_TYPE_CODES[searchType] ?? 'query';

/**
 * Search codes the emulator answers with the same code
 * (`NavigatorManager.getRoomsForCategory`).
 */
export const EMULATOR_CATEGORY_CODES: readonly string[] = [
    'my',
    'favorites',
    'history_freq',
    'my_groups',
    'with_rights',
    'popular',
    'with_friends',
    'highest_score'
];

/**
 * Legacy codes the emulator does not know, mapped to the closest code it answers.
 * `query` and `groups` are what the emulator itself rewrites to `hotel_view`
 * (`RequestNewNavigatorRoomsEvent`); `groups` keeps the guild intent through the
 * `group:` filter field.
 */
const LEGACY_CODE_ALIASES: Readonly<Record<string, NavigatorSearchContext>> = {
    query: { code: 'hotel_view', filter: '' },
    groups: { code: 'hotel_view', filter: 'group:' },
    friends_rooms: { code: 'with_friends', filter: '' },
    history: { code: 'history_freq', filter: '' },
    official: { code: 'official_view', filter: '' },
    new_ads: { code: 'roomads_view', filter: '' },
    top_promotions: { code: 'roomads_view', filter: '' },
    competition: { code: 'hotel_view', filter: '' },
    all_categories: { code: 'hotel_view', filter: '' },
    recommended: { code: 'popular', filter: '' }
};

const DEFAULT_TOP_LEVEL_CODES: readonly string[] = ['official_view', 'hotel_view', 'roomads_view', 'myworld_view'];

const isLegacySearchType = (value: string) => /^\d+$/.test(value);

const normalizeSearchCode = (code: string, filter: string): NavigatorSearchContext => {
    const alias = LEGACY_CODE_ALIASES[code];

    if (!alias) return { code, filter };

    return { code: alias.code, filter: alias.filter ? alias.filter + filter : filter };
};

/**
 * Resolve the parts of a `navigator/search/...` link into the search to perform.
 *
 * - `navigator/search/<legacy int>[/<filter>]` - legacy search type (`startSearch`).
 * - `navigator/search/<code>[/<filter>]` - a top-level tab code, an emulator
 *   category code or a legacy code (`groups`, `favorites`, ...).
 * - `navigator/search/<text>` - free text searched in `hotel_view`
 *   (official `performSearch("hotel_view", parts[2])`).
 */
export const resolveNavigatorSearchLink = (parts: string[], topLevelCodes: readonly string[] = DEFAULT_TOP_LEVEL_CODES): NavigatorSearchContext | null => {
    if (parts.length < 3 || !parts[2]) return null;

    const head = parts[2];
    const rest = parts.slice(3).join('/');

    if (isLegacySearchType(head)) return normalizeSearchCode(getSearchCodeByLegacySearchType(Number.parseInt(head, 10)), rest);

    const knownCodes = [...DEFAULT_TOP_LEVEL_CODES, ...topLevelCodes, ...EMULATOR_CATEGORY_CODES];

    if (knownCodes.includes(head) || LEGACY_CODE_ALIASES[head]) return normalizeSearchCode(head, rest);

    return { code: 'hotel_view', filter: parts.slice(2).join('/') };
};

/** `HabboNewNavigator.getSearchCodeForTabLink` - `navigator/tab/me` opens the "me" view. */
export const resolveNavigatorTabCode = (code: string): string => (code === 'me' ? 'myworld_view' : code);
