import type { WiredVariablePickerTarget } from './WiredVariablePickerData';

/**
 * The variable ids of the official definition and save packets (`variableIds`), against the tokens the editors work
 * with (`custom:<box id>`, `internal:<key>`). An id is what the variable list names the variable by, as AIR sends back
 * the id it picked from that list: a box's variable is `user:<box id>` / `furni:<box id>` / `room:<box id>` /
 * `ctx:<box id>`, a built-in one has Habbo's fixed id (`-125`, `~133`), and a built-in Habbo does not have goes out
 * as `<target>:<key>` (`furni:@opacity`). An empty slot before a filled one is AIR's `n` (WiredVariable "none").
 *
 * Reading also takes the older forms (the tokens themselves and a bare box id). Self-contained, so editor tests that
 * stub the picker data still read and write ids.
 */
export const WIRED_VARIABLE_ID_NONE = 'n';

const CUSTOM_TOKEN_PREFIX = 'custom:';
const INTERNAL_TOKEN_PREFIX = 'internal:';

const TARGET_PREFIXES: Record<WiredVariablePickerTarget, string> = {
    user: 'user:',
    furni: 'furni:',
    global: 'room:',
    context: 'ctx:'
};

/** Habbo's ids of the built-in variables, per target and our key (server RoomWiredInternalVariables). */
const HABBO_INTERNAL_VARIABLE_IDS: Record<WiredVariablePickerTarget, Record<string, string>> = {
    furni: {
        '@id': '-100',
        '@class_id': '-101',
        '@height': '-102',
        '@state': '-110',
        '@position_x': '-120',
        '@position_y': '-121',
        '@rotation': '-122',
        '@altitude': '-123',
        '@is_invisible': '-124',
        '@position': '-125',
        '@occupation': '-126',
        '@type': '-129',
        '@is_stackable': '-130',
        '@can_stand_on': '-131',
        '@can_sit_on': '-132',
        '@can_lay_on': '-133',
        '@dimensions.x': '-140',
        '@dimensions.y': '-141',
        '@owner_id': '-180',
        '@wallitem_offset': '-190',
        '@can_move_freely': '-2000',
        '@projectile.animation.tiles_travelled': '-2100',
        '@projectile.animation.user_collisions': '-2101',
        '@projectile.animation.furni_collisions': '-2102',
        '@projectile.animation.position.x': '-2103',
        '@projectile.animation.position.y': '-2104',
        '@projectile.animation.position.altitude': '-2105',
        '@projectile.animation.is_travelling': '-2106',
        '~background_color.hue': '~100',
        '~background_color.saturation': '~101',
        '~background_color.lightness': '~102',
        '~teleport.target_id': '~103',
        '~walk_helper.is_multi_walk': '~104',
        '~area_hide.root_x': '~110',
        '~area_hide.root_y': '~111',
        '~area_hide.width': '~112',
        '~area_hide.length': '~113',
        '~area_hide.is_invisible_furni': '~114',
        '~area_hide.hiding_wallitems': '~115',
        '~area_hide.inverted': '~116',
        '~clock.state': '~120',
        '~clock.pulse_count': '~121',
        '~clock.is_game_aware': '~122',
        '~chest.available_amount': '~130',
        '~chest.locked': '~131',
        '~chest.is_auto_lock': '~132',
        '~chest.capacity': '~133',
        '~chest.is_open': '~134',
        '~chest.is_donatable': '~135',
        '~recolorable_furni.color.rgb.red': '~140',
        '~recolorable_furni.color.rgb.green': '~141',
        '~recolorable_furni.color.rgb.blue': '~142',
        '~recolorable_furni.color.rgb': '~146'
    },
    user: {
        '@index': '-200',
        '@type': '-205',
        '@gender': '-206',
        '@level': '-210',
        '@achievement_score': '-211',
        '@is_hc': '-220',
        '@has_rights': '-221',
        '@is_group_admin': '-222',
        '@is_owner': '-223',
        '@position_x': '-230',
        '@position_y': '-231',
        '@direction': '-232',
        '@altitude': '-233',
        '@position': '-234',
        '@team_score': '-237',
        '@team_color': '-238',
        '@team_type': '-239',
        '@handitem_id': '-240',
        '@effect_id': '-241',
        '@is_frozen': '-242',
        '@is_muted': '-243',
        '@is_trading': '-244',
        '@habbicon': '-245',
        '@favourite_group_id': '-250',
        '@dance': '-260',
        '@sign': '-261',
        '@is_idle': '-262',
        '@room_entry.method': '-266',
        '@room_entry.teleport_id': '-267',
        '@user_id': '-270',
        '@pet_id': '-271',
        '@bot_id': '-272',
        '@pet_owner_id': '-280',
        '@transaction.in_trade': '-281',
        '@transaction.start_time': '-282',
        '@transaction.contract_id': '-283',
        '@transaction.state': '-284',
        '@transaction.can_accept': '-285',
        '@transaction.current_multiplier': '-286',
        '~pet.level': '~400',
        '~pet.experience': '~401',
        '~pet.energy': '~402',
        '~pet.happiness': '~403',
        '~pet.max_level': '~410',
        '~pet.experience_required': '~411',
        '~pet.max_energy': '~412',
        '~pet.max_happiness': '~413',
        '~pet.scratches': '~420',
        '~pet.owner_id': '~430',
        '~pet.creation_time': '~431',
        '~horse.has_saddle': '~500',
        '~horse.is_riding': '~501',
        '~horse.controller_user_id': '~502',
        '~plant.rarity_level': '~600',
        '~plant.shape': '~601',
        '~plant.color': '~602',
        '~plant.can_breed': '~610',
        '~plant.can_harvest': '~611',
        '~plant.can_revive': '~612',
        '~plant.is_dead': '~613',
        '~plant.is_growing': '~614',
        '~plant.remaining_wellbeing_seconds': '~615',
        '~plant.remaining_growing_seconds': '~616',
        '~plant.max_wellbeing_seconds': '~617'
    },
    global: {
        '@furni_count': '-300',
        '@user_count': '-301',
        '@wired_timer': '-310',
        '@team_red_score': '-320',
        '@team_green_score': '-321',
        '@team_blue_score': '-322',
        '@team_yellow_score': '-323',
        '@team_red_size': '-330',
        '@team_green_size': '-331',
        '@team_blue_size': '-332',
        '@team_yellow_size': '-333',
        '@room_id': '-380',
        '@group_id': '-381',
        '@current_time': '-1000',
        '@current_time.milliseconds_of_seconds': '-1001',
        '@current_time.seconds_of_minute': '-1002',
        '@current_time.minute_of_hour': '-1003',
        '@current_time.hour_of_day': '-1004',
        '@current_time.day_of_week': '-1005',
        '@current_time.day_of_month': '-1006',
        '@current_time.day_of_year': '-1007',
        '@current_time.week_of_year': '-1008',
        '@current_time.month_of_year': '-1009',
        '@current_time.year': '-1010'
    },
    context: {
        '@selector_furni_count': '-400',
        '@selector_user_count': '-401',
        '@signal_furni_count': '-410',
        '@signal_user_count': '-411',
        '@antenna_id': '-420',
        '@chat_type': '-450',
        '@chat_style': '-451',
        '@event.habbicon': '-452',
        '@event.link.source_room_id': '-453',
        '@event.variable_update.box_id': '-459',
        '@event.variable_update.change_type': '-460',
        '@event.variable_update.old_value': '-461',
        '@event.variable_update.new_value': '-462',
        '@event.variable_update.difference': '-463',
        '@event.variable_update.change_origin': '-464',
        '@event.transaction_complete.multiplier': '-470',
        '@event.transaction_complete.deposit.furni_count': '-471',
        '@event.transaction_complete.deposit.coins_count': '-472',
        '@event.transaction_complete.withdrawal.furni_count': '-473',
        '@event.transaction_complete.withdrawal.coins_count': '-474',
        '@event.transaction_failed.reason': '-478'
    }
};

const HABBO_INTERNAL_VARIABLES_BY_ID: Record<string, { target: WiredVariablePickerTarget; key: string }> = (() => {
    const byId: Record<string, { target: WiredVariablePickerTarget; key: string }> = {};

    for (const target of Object.keys(HABBO_INTERNAL_VARIABLE_IDS) as WiredVariablePickerTarget[]) {
        for (const [key, id] of Object.entries(HABBO_INTERNAL_VARIABLE_IDS[target])) byId[id] = { target, key };
    }

    return byId;
})();

const parsePositive = (text: string) => (/^\d{1,10}$/.test(text) ? parseInt(text, 10) : 0);
const customToken = (itemId: number) => (itemId > 0 ? `${CUSTOM_TOKEN_PREFIX}${itemId}` : '');
const internalToken = (key: string) => (key?.trim() ? `${INTERNAL_TOKEN_PREFIX}${key.trim()}` : '');

/** The id of a token's variable on a target; empty for no variable. */
export const toWiredVariableId = (target: WiredVariablePickerTarget, token: string): string => {
    const prefix = TARGET_PREFIXES[target] ?? TARGET_PREFIXES.user;

    const text = (token ?? '').trim();

    if (text.startsWith(CUSTOM_TOKEN_PREFIX)) {
        const itemId = parsePositive(text.slice(CUSTOM_TOKEN_PREFIX.length));

        return itemId > 0 ? `${prefix}${itemId}` : '';
    }

    if (text.startsWith(INTERNAL_TOKEN_PREFIX)) {
        const key = text.slice(INTERNAL_TOKEN_PREFIX.length).trim();

        if (!key) return '';

        return HABBO_INTERNAL_VARIABLE_IDS[target]?.[key] ?? `${prefix}${key}`;
    }

    return '';
};

/** {@link toWiredVariableId} on an official target number (furni 0, user 1, global -10, context -20). */
export const toWiredVariableIdOnTarget = (officialTarget: number, token: string): string =>
    toWiredVariableId(officialTarget === 1 ? 'user' : officialTarget === -10 ? 'global' : officialTarget === -20 ? 'context' : 'furni', token);

/** The token of a variable id in any form the server or an older client wrote; empty when it names no variable. */
export const fromWiredVariableId = (id: string): string => {
    const text = (id ?? '').trim();

    if (!text || text === WIRED_VARIABLE_ID_NONE) return '';
    if (text.startsWith(CUSTOM_TOKEN_PREFIX)) return customToken(parsePositive(text.slice(CUSTOM_TOKEN_PREFIX.length)));
    if (text.startsWith(INTERNAL_TOKEN_PREFIX)) return internalToken(text.slice(INTERNAL_TOKEN_PREFIX.length));

    const builtIn = HABBO_INTERNAL_VARIABLES_BY_ID[text];

    if (builtIn) return internalToken(builtIn.key);

    for (const prefix of Object.values(TARGET_PREFIXES)) {
        if (!text.startsWith(prefix)) continue;

        const rest = text.slice(prefix.length).trim();

        if (rest.startsWith('@') || rest.startsWith('~')) return internalToken(rest);

        return customToken(parsePositive(rest));
    }

    return customToken(parsePositive(text));
};

/** The target a variable id names, or null when it does not say (a bare box id, an older token). */
export const wiredVariableIdTarget = (id: string): WiredVariablePickerTarget | null => {
    const text = (id ?? '').trim();
    const builtIn = HABBO_INTERNAL_VARIABLES_BY_ID[text];

    if (builtIn) return builtIn.target;

    for (const target of Object.keys(TARGET_PREFIXES) as WiredVariablePickerTarget[]) if (text.startsWith(TARGET_PREFIXES[target])) return target;

    return null;
};

/**
 * The token in one slot of a definition's variable ids, else the token an older server wrote into the string
 * (`legacy`, read with the editor's own rules).
 */
export const readWiredVariableToken = (variableIds: string[] | undefined, index: number, legacy = ''): string => {
    const token = fromWiredVariableId(variableIds?.[index] ?? '');

    return token || legacy || '';
};

/** A save's variable ids slot by slot: an empty slot before a filled one is `n`, empty slots at the end are left out. */
export const wiredVariableIdList = (...ids: string[]): string[] => {
    let length = ids.length;

    while (length > 0 && (!ids[length - 1] || ids[length - 1] === WIRED_VARIABLE_ID_NONE)) length--;

    return ids.slice(0, length).map((id) => id || WIRED_VARIABLE_ID_NONE);
};
