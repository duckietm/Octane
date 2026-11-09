/**
 * The official AIR variable leaderboard addon (wf_xtra_var_leaderboard, code 1005): its storage
 * format, the editor's rules and the panel's cell formatting, mirrored from the AIR client so a box
 * saved here reads back the same in AIR and on the server.
 *
 * The definition and the save carry the 17 text fields as the string param ("" for a box nobody
 * configured yet) and the 12 variable ids as the packet's variable ids, under the variable list's ids
 * like every other box: `user:<box id>` for the filter and the display names, `room:<box id>` for the
 * compared global, "0" for an empty slot. Older servers sent bare box ids, and the ids after the text
 * fields (29 TAB fields); both still read, as the same variables.
 */
export const WIRED_LEADERBOARD_CODE = 1005;

export const LeaderboardColumnType = {
    USERNAME: 0,
    VALUE: 1,
    LAST_UPDATE: 2,
    CREATION: 3,
    LEVEL: 4,
    TEXT_CONNECTION: 5
} as const;

export const LEADERBOARD_COLUMN_KEYS = [ 'username', 'value', 'last_update', 'creation', 'level', 'text_connection' ];
export const LEADERBOARD_COLUMN_DEFAULT_LABELS = [ 'Username', 'Value', 'Last update', 'Creation', 'Level', 'Text' ];
export const LEADERBOARD_COLUMN_DEFAULT_WIDTHS = [ 3, 0, 1, 1, 0, 2 ];
/** Column width ids 0..3 in pixels at scale 1. */
export const LEADERBOARD_COLUMN_PIXELS = [ 70, 90, 120, 170 ];
export const LEADERBOARD_WIDTH_KEYS = [ 'small', 'medium', 'large', 'xl' ];
/** The order the editor offers types for columns 1..3. */
export const LEADERBOARD_COLUMN_MENU = [ 1, 5, 2, 3, 4 ];

export const LEADERBOARD_SORT_KEYS = [ 'highest_value', 'lowest_value', 'oldest_creation', 'latest_creation', 'oldest_update', 'latest_update' ];
export const LEADERBOARD_PAGE_SIZES = [ 10, 15, 20 ];
export const LEADERBOARD_CHUNK_SIZE = 50;
export const LEADERBOARD_MAX_COLUMNS = 4;
export const LEADERBOARD_MAX_CHOICES = 10;
export const LEADERBOARD_RANK_GUTTER = 38;
export const LEADERBOARD_MIN_WIDTH = 250;
export const LEADERBOARD_MIN_OFFSET_X = -32;
export const LEADERBOARD_MAX_OFFSET_X = 32;
export const LEADERBOARD_TITLE_MAX = 50;
export const LEADERBOARD_DESCRIPTION_MAX = 80;
export const LEADERBOARD_LABEL_MIN = 2;
export const LEADERBOARD_LABEL_MAX = 12;
export const LEADERBOARD_OVERRIDE_MAX = 22;
export const LEADERBOARD_NULL_VARIABLE_ID = '0';

export const OPERAND_LITERAL = 0;
export const OPERAND_GLOBAL_VARIABLE = 1;

const INT_PARAM_COUNT = 19;
const VARIABLE_ID_COUNT = 12;
const STRING_FIELD_COUNT = 17;
const SEPARATOR = '\t';

export interface ILeaderboardColumn
{
    type: number;
    label: string;
    width: number;
}

export interface ILeaderboardConfig
{
    title: string;
    description: string;
    sortMode: number;
    pageSizeOption: number;
    columns: ILeaderboardColumn[];
    filterEnabled: boolean;
    compareEnabled: boolean;
    operandKind: number;
    filterVariableId: string;
    operandVariableId: string;
    comparisonLiteral: string;
    /** Display names by variable id. */
    displayOverrides: Record<string, string>;
    tileX: number;
    tileY: number;
    offsetX: number;
    altitude: number;
}

export const defaultLeaderboardColumn = (type: number): ILeaderboardColumn => ({
    type,
    label: LEADERBOARD_COLUMN_DEFAULT_LABELS[type] ?? '',
    width: LEADERBOARD_COLUMN_DEFAULT_WIDTHS[type] ?? 0
});

/** A box nobody configured: Username + Value, highest value first, 10 per page, at the box's tile. */
export const defaultLeaderboardConfig = (tileX: number, tileY: number): ILeaderboardConfig => ({
    title: '',
    description: '',
    sortMode: 0,
    pageSizeOption: 0,
    columns: [ defaultLeaderboardColumn(LeaderboardColumnType.USERNAME), defaultLeaderboardColumn(LeaderboardColumnType.VALUE) ],
    filterEnabled: false,
    compareEnabled: false,
    operandKind: OPERAND_LITERAL,
    filterVariableId: LEADERBOARD_NULL_VARIABLE_ID,
    operandVariableId: LEADERBOARD_NULL_VARIABLE_ID,
    comparisonLiteral: '',
    displayOverrides: {},
    tileX,
    tileY,
    offsetX: 0,
    altitude: 0
});

const canonicalId = (id: string): string => ((!id || id === 'n') ? LEADERBOARD_NULL_VARIABLE_ID : id);

const BOX_VARIABLE_ID = /^(custom:|user:|furni:|room:|ctx:)?(\d{1,10})$/;

/** A box id, bare or as a token, takes the slot's prefix; an id of another target or a built-in stays as it is. */
const listVariableId = (prefix: 'user:' | 'room:', id: string): string =>
{
    const text = canonicalId((id ?? '').trim());
    const match = BOX_VARIABLE_ID.exec(text);

    if(text === LEADERBOARD_NULL_VARIABLE_ID || !match) return text;
    if(match[1] && match[1] !== 'custom:' && match[1] !== prefix) return text;

    const itemId = parseInt(match[2], 10);

    return (itemId > 0) ? `${ prefix }${ itemId }` : LEADERBOARD_NULL_VARIABLE_ID;
};

/** The variable list's id of a user variable (filter, display names) from any form a server sent: `12` -> `user:12`. */
export const leaderboardUserVariableId = (id: string): string => listVariableId('user:', id);

/** The variable list's id of the compared global variable: `5` -> `room:5`. */
export const leaderboardGlobalVariableId = (id: string): string => listVariableId('room:', id);

/**
 * Reads a box from the editor packet; the defaults when it was never configured or does not read.
 * The official definition carries the string fields alone and the variable ids as its own list.
 */
export const decodeLeaderboardConfig = (intParams: number[], stringParam: string, tileX: number, tileY: number, variableIds: string[] = []): ILeaderboardConfig =>
{
    const fallback = defaultLeaderboardConfig(tileX, tileY);

    if(!stringParam) return fallback;

    let fields = stringParam.split(SEPARATOR);

    if(fields.length === STRING_FIELD_COUNT && variableIds && variableIds.length <= VARIABLE_ID_COUNT)
    {
        fields = [ ...fields, ...Array.from({ length: VARIABLE_ID_COUNT }, (_, index) => canonicalId(variableIds[index])) ];
    }

    if(fields.length !== (STRING_FIELD_COUNT + VARIABLE_ID_COUNT) || !intParams || intParams.length < 14) return fallback;

    const strings = fields.slice(0, STRING_FIELD_COUNT);
    const ids = fields.slice(STRING_FIELD_COUNT).map((id, index) => ((index === 1) ? leaderboardGlobalVariableId(id) : leaderboardUserVariableId(id)));
    const columnCount = Math.max(1, Math.min(LEADERBOARD_MAX_COLUMNS, intParams[1]));
    const columns: ILeaderboardColumn[] = [];

    for(let i = 0; i < columnCount; i++)
    {
        const type = intParams[2 + i];

        if(type < 0 || type > 5) return fallback;

        const width = intParams[14 + i];

        columns.push({ type, label: strings[2 + i], width: (width >= 0 && width <= 3) ? width : LEADERBOARD_COLUMN_DEFAULT_WIDTHS[type] });
    }

    const displayOverrides: Record<string, string> = {};
    const overrideCount = Math.max(0, Math.min(LEADERBOARD_MAX_CHOICES, intParams[9]));

    for(let i = 0; i < overrideCount; i++)
    {
        if(ids[2 + i] !== LEADERBOARD_NULL_VARIABLE_ID) displayOverrides[ids[2 + i]] = strings[7 + i];
    }

    return {
        title: strings[0],
        description: strings[1],
        sortMode: intParams[0],
        pageSizeOption: intParams[18] ?? 0,
        columns,
        filterEnabled: intParams[6] === 1,
        compareEnabled: intParams[7] === 1,
        operandKind: intParams[8] === OPERAND_GLOBAL_VARIABLE ? OPERAND_GLOBAL_VARIABLE : OPERAND_LITERAL,
        filterVariableId: ids[0],
        operandVariableId: ids[1],
        comparisonLiteral: strings[6],
        displayOverrides,
        tileX: intParams[10],
        tileY: intParams[11],
        offsetX: intParams[12],
        altitude: intParams[13]
    };
};

/**
 * The save packet for a config, in the canonical form the codec stores: fields a disabled option
 * does not use are cleared, overrides are sorted by plain string order, and the 12 variable ids go
 * out as the list's ids apart from the text fields, as AIR sends them.
 */
export const encodeLeaderboardConfig = (config: ILeaderboardConfig): { intParams: number[], stringParam: string, variableIds: string[] } =>
{
    const ints = new Array<number>(INT_PARAM_COUNT).fill(0);
    const ids = new Array<string>(VARIABLE_ID_COUNT).fill(LEADERBOARD_NULL_VARIABLE_ID);
    const strings = new Array<string>(STRING_FIELD_COUNT).fill('');
    const filter = config.filterEnabled;
    const compare = filter && config.compareEnabled;
    const operandKind = compare ? config.operandKind : OPERAND_LITERAL;
    const overrides: Record<string, string> = {};

    for(const [ id, name ] of Object.entries(config.displayOverrides)) overrides[leaderboardUserVariableId(id)] = name;

    const overrideIds = Object.keys(overrides).filter((id) => id !== LEADERBOARD_NULL_VARIABLE_ID).sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0))).slice(0, LEADERBOARD_MAX_CHOICES);

    ints[0] = config.sortMode;
    ints[1] = config.columns.length;

    for(let i = 0; i < LEADERBOARD_MAX_COLUMNS; i++)
    {
        const column = config.columns[i];

        ints[2 + i] = column ? column.type : -1;
        ints[14 + i] = column ? column.width : 0;
        strings[2 + i] = column ? column.label : '';
    }

    ints[6] = filter ? 1 : 0;
    ints[7] = compare ? 1 : 0;
    ints[8] = operandKind;
    ints[9] = overrideIds.length;
    ints[10] = config.tileX;
    ints[11] = config.tileY;
    ints[12] = config.offsetX;
    ints[13] = config.altitude;
    ints[18] = config.pageSizeOption;

    ids[0] = filter ? leaderboardUserVariableId(config.filterVariableId) : LEADERBOARD_NULL_VARIABLE_ID;
    ids[1] = (compare && operandKind === OPERAND_GLOBAL_VARIABLE) ? leaderboardGlobalVariableId(config.operandVariableId) : LEADERBOARD_NULL_VARIABLE_ID;
    overrideIds.forEach((id, index) =>
    {
        ids[2 + index] = id;
        strings[7 + index] = overrides[id];
    });

    strings[0] = config.title;
    strings[1] = config.description;
    strings[6] = (compare && operandKind === OPERAND_LITERAL) ? config.comparisonLiteral.trim() : '';

    return { intParams: ints, stringParam: strings.join(SEPARATOR), variableIds: ids };
};

/** A signed 64-bit decimal without leading zeros or "-0". */
export const isCanonicalLeaderboardLiteral = (text: string): boolean =>
{
    if(!/^-?(0|[1-9][0-9]*)$/.test(text) || text === '-0') return false;

    try
    {
        const value = BigInt(text);

        return value >= -9223372036854775808n && value <= 9223372036854775807n;
    }
    catch
    {
        return false;
    }
};

/**
 * The official editor's checks, in its order; the `wiredfurni.error.variable_leaderboard.*` key of
 * the first that fails, or null.
 */
export const validateLeaderboardConfig = (config: ILeaderboardConfig): string =>
{
    const fail = (key: string) => `wiredfurni.error.variable_leaderboard.${ key }`;
    const hasTab = (text: string) => text.includes(SEPARATOR);

    if(!config.title.trim().length) return fail('title_required');
    if(config.title.length > LEADERBOARD_TITLE_MAX || config.description.length > LEADERBOARD_DESCRIPTION_MAX) return fail('invalid_configuration');
    if(hasTab(config.title) || hasTab(config.description)) return fail('invalid_configuration');
    if(!config.columns.length || config.columns.length > LEADERBOARD_MAX_COLUMNS || config.columns[0].type !== LeaderboardColumnType.USERNAME) return fail('invalid_configuration');

    const seen = new Set<number>();

    for(const column of config.columns)
    {
        if(seen.has(column.type)) return fail('invalid_configuration');

        seen.add(column.type);

        if(column.label.length < LEADERBOARD_LABEL_MIN || column.label.length > LEADERBOARD_LABEL_MAX || hasTab(column.label)) return fail('column_name_length');
    }

    if(config.filterEnabled)
    {
        if(canonicalId(config.filterVariableId) === LEADERBOARD_NULL_VARIABLE_ID) return fail('filter_required');

        if(config.compareEnabled)
        {
            if(config.operandKind === OPERAND_GLOBAL_VARIABLE)
            {
                if(canonicalId(config.operandVariableId) === LEADERBOARD_NULL_VARIABLE_ID) return fail('global_operand_required');
            }
            else if(!isCanonicalLeaderboardLiteral(config.comparisonLiteral.trim())) return fail('invalid_configuration');
        }
    }

    for(const name of Object.values(config.displayOverrides))
    {
        if(!name.length || name.length > LEADERBOARD_OVERRIDE_MAX || hasTab(name)) return fail('invalid_configuration');
    }

    if(config.offsetX < LEADERBOARD_MIN_OFFSET_X || config.offsetX > LEADERBOARD_MAX_OFFSET_X) return fail('invalid_configuration');

    return null;
};

/** The client's VariableLeaderboardDisplayNameFormatter.suggest: "coins_won" -> "Coins Won". */
export const suggestLeaderboardName = (technicalName: string): string =>
{
    if(!technicalName) return 'Variable';

    const words = technicalName.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(word => word.length);

    if(!words.length) return 'Variable';

    return words.map(word => word.toLowerCase()).map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
};

/** "-1234567" -> "-1,234,567"; anything that is not a plain integer stays as it is. */
export const formatLeaderboardValue = (value: string): string =>
{
    if(!value || !/^[+-]?[0-9]+$/.test(value)) return value ?? '';

    const sign = /^[+-]/.test(value) ? value.charAt(0) : '';
    const digits = sign ? value.substring(1) : value;

    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * The official relative time: "-" for none, "<n>m ago" within the hour, "HH:MM" today, else the
 * month and day, and the year when it is not this year.
 */
export const formatLeaderboardTime = (time: number, now: number, minutesAgo: (minutes: number) => string, monthName: (month: number) => string): string =>
{
    if(!time || time <= 0) return '-';

    const diff = now - time;

    if(diff >= 0 && diff < 3600000) return minutesAgo(Math.max(1, Math.floor(diff / 60000)));

    const date = new Date(time);
    const today = new Date(now);

    if(date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate())
    {
        return `${ String(date.getHours()).padStart(2, '0') }:${ String(date.getMinutes()).padStart(2, '0') }`;
    }

    const month = monthName(date.getMonth() + 1).replace(/\.$/, '');
    const text = `${ month } ${ date.getDate() }`;

    return (date.getFullYear() === today.getFullYear()) ? text : `${ text }, ${ date.getFullYear() }`;
};

/** Panel width at scale 1: the rank gutter plus the columns, never below 250. */
export const leaderboardPanelWidth = (columns: { width: number }[]): number =>
{
    const content = columns.reduce((sum, column) => sum + (LEADERBOARD_COLUMN_PIXELS[column.width] ?? LEADERBOARD_COLUMN_PIXELS[0]), 0);

    return Math.max(LEADERBOARD_MIN_WIDTH, LEADERBOARD_RANK_GUTTER + content + 16);
};

/**
 * The chunks a page needs (official desiredChunkIndices): the chunk of its first row, the next one
 * when the page straddles two, else the next one when paging forward gets close to it.
 */
export const leaderboardDesiredChunks = (firstRow: number, entriesPerPage: number, total: number | null, movingForward: boolean): number[] =>
{
    const current = Math.floor(firstRow / LEADERBOARD_CHUNK_SIZE);
    const lastRow = (total === null) ? firstRow + entriesPerPage - 1 : Math.max(firstRow, Math.min(firstRow + entriesPerPage, total) - 1);
    const last = Math.floor(lastRow / LEADERBOARD_CHUNK_SIZE);
    const chunkCount = (total !== null && total > 0) ? Math.ceil(total / LEADERBOARD_CHUNK_SIZE) : 1;

    if(last > current && (total === null || last < chunkCount)) return [ current, last ];

    if(total !== null && movingForward && (firstRow + (3 * entriesPerPage)) > ((current + 1) * LEADERBOARD_CHUNK_SIZE) && current < chunkCount - 1) return [ current, current + 1 ];

    return [ current ];
};
