/**
 * The dataframe storage of the official send and receive link boxes (AIR LinkDataframeCodec, LinkDataframeSendPreset,
 * LinkDataframeReceivePreset): the string param is a JSON array of [key, text] rows, one per row in use; the int params
 * hold the row count and each row's settings; there are always 12 variable ids.
 */
export const LINK_DATAFRAME_MAX_ROWS = 12;
export const LINK_DATAFRAME_MAX_KEY_LENGTH = 40;
export const LINK_DATAFRAME_MAX_MESSAGE_BYTES = 200;
export const LINK_DATAFRAME_MAX_TEXT_BYTES = 3000;
export const LINK_MESSAGE_MAX_BYTES = 1000;

/** Send row modes. */
export const LINK_SEND_NUMBER = 0;
export const LINK_SEND_VARIABLE_VALUE = 1;
export const LINK_SEND_VARIABLE_TEXT = 2;
export const LINK_SEND_MESSAGE = 3;

/** Receive row kinds. */
export const LINK_RECEIVE_PLACEHOLDER = 0;
export const LINK_RECEIVE_VARIABLE = 1;

/** The official variable targets. */
export const LINK_TARGET_FURNI = 0;
export const LINK_TARGET_USER = 1;
export const LINK_TARGET_GLOBAL = -10;
export const LINK_TARGET_CONTEXT = -20;

export interface ILinkSendRow
{
    key: string;
    mode: number;
    literal: number;
    target: number;
    text: string;
    variableId: string;
}

export interface ILinkReceiveRow
{
    key: string;
    kind: number;
    placeholder: string;
    variableId: string;
}

export const emptySendRow = (): ILinkSendRow => ({ key: '', mode: LINK_SEND_NUMBER, literal: 0, target: LINK_TARGET_USER, text: '', variableId: '' });

export const emptyReceiveRow = (): ILinkReceiveRow => ({ key: '', kind: LINK_RECEIVE_PLACEHOLDER, placeholder: '', variableId: '' });

export const utf8Length = (text: string): number => new TextEncoder().encode(text ?? '').length;

/** AIR normalizeKey: underscores and spaces are the same, outer blanks go, keys are lower case. */
export const normalizeLinkKey = (key: string): string =>
    (key ?? '').replace(/_/g, ' ').replace(/^[\x00- ]+|[\x00- ]+$/g, '').replace(/ /g, '_').toLowerCase();

export const linkKeyError = (key: string): string | null =>
{
    const normalized = normalizeLinkKey(key);

    if(!normalized.length || (normalized.length > LINK_DATAFRAME_MAX_KEY_LENGTH)) return 'wiredfurni.error.link.key_length';
    if(!/^\w+$/.test(normalized)) return 'wiredfurni.error.variables.name_syntax';

    return null;
};

export const linkPlaceholderError = (name: string): string | null =>
{
    if(!name.length || (name.length > LINK_DATAFRAME_MAX_KEY_LENGTH)) return 'wiredfurni.error.placeholder.name_length';
    if(!/^\w+$/.test(name)) return 'wiredfurni.error.placeholder.name_syntax';
    if(name.toLowerCase() === 'trigger_text') return 'wiredfurni.error.placeholder.reserved';

    return null;
};

/** The rows of the string param, or null when it does not hold exactly `count` rows. */
export const decodeLinkRows = (json: string, count: number): [ string, string ][] | null =>
{
    if((count < 0) || (count > LINK_DATAFRAME_MAX_ROWS)) return null;
    if(!json && (count === 0)) return [];

    try
    {
        const rows = JSON.parse(json);

        if(!Array.isArray(rows) || (rows.length !== count)) return null;

        for(const row of rows)
        {
            if(!Array.isArray(row) || (row.length !== 2) || (typeof row[0] !== 'string') || (typeof row[1] !== 'string')) return null;
        }

        return rows as [ string, string ][];
    }
    catch
    {
        return null;
    }
};

const padIds = (ids: string[]): string[] =>
{
    const padded: string[] = [];

    for(let i = 0; i < LINK_DATAFRAME_MAX_ROWS; i++) padded.push(ids?.[i] ?? '');

    return padded;
};

/** The send editor's rows, or null when the stored configuration is not a valid dataframe. */
export const readLinkSend = (intParams: number[], stringParam: string, variableIds: string[]): ILinkSendRow[] | null =>
{
    if(!intParams || (intParams.length === 0)) return [];
    if(intParams.length !== (1 + (3 * LINK_DATAFRAME_MAX_ROWS))) return null;

    const count = intParams[0];
    const decoded = decodeLinkRows(stringParam, count);

    if(!decoded) return null;

    const ids = padIds(variableIds);

    return decoded.map(([ key, text ], index) => ({
        key,
        mode: intParams[1 + (index * 3)],
        literal: intParams[2 + (index * 3)],
        target: intParams[3 + (index * 3)],
        text,
        variableId: ids[index]
    }));
};

export const writeLinkSend = (rows: ILinkSendRow[]): { intParams: number[]; stringParam: string; variableIds: string[] } =>
{
    const intParams = [ rows.length ];
    const variableIds: string[] = [];

    for(let i = 0; i < LINK_DATAFRAME_MAX_ROWS; i++)
    {
        const row = rows[i] ?? emptySendRow();

        intParams.push(row.mode, row.literal, row.target);
        variableIds.push(((row.mode === LINK_SEND_VARIABLE_VALUE) || (row.mode === LINK_SEND_VARIABLE_TEXT)) ? row.variableId : '');
    }

    return {
        intParams,
        stringParam: JSON.stringify(rows.map(row => [ normalizeLinkKey(row.key), (row.mode === LINK_SEND_MESSAGE) ? row.text : '' ])),
        variableIds
    };
};

export const readLinkReceive = (intParams: number[], stringParam: string, variableIds: string[]): ILinkReceiveRow[] | null =>
{
    if(!intParams || (intParams.length === 0)) return [];
    if(intParams.length !== (1 + LINK_DATAFRAME_MAX_ROWS)) return null;

    const count = intParams[0];
    const decoded = decodeLinkRows(stringParam, count);

    if(!decoded) return null;

    const ids = padIds(variableIds);

    return decoded.map(([ key, placeholder ], index) => ({ key, kind: intParams[1 + index], placeholder, variableId: ids[index] }));
};

export const writeLinkReceive = (rows: ILinkReceiveRow[]): { intParams: number[]; stringParam: string; variableIds: string[] } =>
{
    const intParams = [ rows.length ];
    const variableIds: string[] = [];

    for(let i = 0; i < LINK_DATAFRAME_MAX_ROWS; i++)
    {
        const row = rows[i] ?? emptyReceiveRow();

        intParams.push(row.kind);
        variableIds.push((row.kind === LINK_RECEIVE_VARIABLE) ? row.variableId : '');
    }

    return {
        intParams,
        stringParam: JSON.stringify(rows.map(row => [ normalizeLinkKey(row.key), (row.kind === LINK_RECEIVE_PLACEHOLDER) ? row.placeholder.toLowerCase() : '' ])),
        variableIds
    };
};

/** The first problem of the send rows as a localization key (with the row number), or null. */
export const linkSendError = (rows: ILinkSendRow[]): { key: string; row: number } | null =>
{
    const keys = new Set<string>();

    for(let i = 0; i < rows.length; i++)
    {
        const row = rows[i];
        const keyError = linkKeyError(row.key);

        if(keyError) return { key: keyError, row: i + 1 };
        if((row.mode === LINK_SEND_MESSAGE) && (utf8Length(row.text) > LINK_DATAFRAME_MAX_MESSAGE_BYTES)) return { key: 'wiredfurni.error.too_much_text', row: i + 1 };
        if((row.mode === LINK_SEND_VARIABLE_VALUE) && !row.variableId) return { key: 'wiredfurni.params.link.select_source_variable', row: i + 1 };

        const key = normalizeLinkKey(row.key);

        if(keys.has(key)) return { key: 'wiredfurni.error.variables.name_uniq', row: 0 };

        keys.add(key);
    }

    return null;
};

export const linkReceiveError = (rows: ILinkReceiveRow[]): { key: string; row: number } | null =>
{
    const keys = new Set<string>();
    const destinations = new Set<string>();

    for(let i = 0; i < rows.length; i++)
    {
        const row = rows[i];
        const keyError = linkKeyError(row.key);

        if(keyError) return { key: keyError, row: i + 1 };

        if(row.kind === LINK_RECEIVE_PLACEHOLDER)
        {
            const placeholderError = linkPlaceholderError(row.placeholder.toLowerCase());

            if(placeholderError) return { key: placeholderError, row: i + 1 };
        }
        else if(!row.variableId) return { key: 'wiredfurni.error.link.invalid_capture_variable', row: i + 1 };

        const key = normalizeLinkKey(row.key);

        if(keys.has(key)) return { key: 'wiredfurni.error.variables.name_uniq', row: 0 };

        keys.add(key);

        const destination = (row.kind === LINK_RECEIVE_PLACEHOLDER) ? `text:${ row.placeholder.toLowerCase() }` : `variable:${ row.variableId }`;

        if(destinations.has(destination)) return { key: 'wiredfurni.error.link.destination_conflict', row: 0 };

        destinations.add(destination);
    }

    return null;
};
