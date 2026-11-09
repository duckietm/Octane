import { IWiredVariableData, IWiredVariableDiffEntry } from '@octane/renderer';

/**
 * The room's wired variable catalogue as the official client keeps it (AIR WiredVariablesSynchronizer): every
 * variable the server lists, by variable id, with the hash the server gave it.
 */
export type WiredVariableCatalog = ReadonlyMap<string, IWiredVariableDiffEntry>;

/** Official variable types (`WiredVariable.variableType`). */
export const WIRED_VARIABLE_TYPE_CREATED = 0;
export const WIRED_VARIABLE_TYPE_INTERNAL = 1;

/** AIR WiredMenuOverviewTab: a text connector with more entries than this shows only its fallback. */
export const WIRED_VARIABLE_MAX_TEXT_CONNECTIONS = 400;

/** AIR availability ids of a variable that is saved (permanent, shared between rooms, and the furni kind). */
const PERSISTED_AVAILABILITY = new Set([ 10, 11, 20 ]);

/** A diff applied to the catalogue: the removed variables go first, then the added or updated ones replace theirs. */
export const applyWiredVariableCatalogDiff = (
    catalog: WiredVariableCatalog,
    removed: readonly string[],
    addedOrUpdated: readonly IWiredVariableDiffEntry[]
): Map<string, IWiredVariableDiffEntry> =>
{
    const next = new Map(catalog);

    for(const variableId of removed ?? []) next.delete(variableId);

    for(const entry of addedOrUpdated ?? [])
    {
        if(entry?.variable?.variableId === undefined) continue;

        next.set(entry.variable.variableId, entry);
    }

    return next;
};

/** The hashes the client holds, as WiredVariableHashesComposer sends them. */
export const wiredVariableCatalogHashes = (catalog: WiredVariableCatalog): { variableId: string; hash: number }[] =>
    [ ...catalog.values() ].map(entry => ({ variableId: entry.variable.variableId, hash: entry.hash }));

/** AIR Util.sortVariables: internal variables last, by numeric id from high to low; every other one by name. */
export const compareWiredVariables = (left: IWiredVariableData, right: IWiredVariableData): number =>
{
    const leftInternal = left.variableType === WIRED_VARIABLE_TYPE_INTERNAL;
    const rightInternal = right.variableType === WIRED_VARIABLE_TYPE_INTERNAL;

    if(leftInternal !== rightInternal) return leftInternal ? 1 : -1;

    if(leftInternal)
    {
        const leftId = Number(left.variableId);
        const rightId = Number(right.variableId);

        return (leftId === rightId) ? 0 : (leftId > rightId ? -1 : 1);
    }

    return left.variableName.localeCompare(right.variableName);
};

/** The picker of one variable target (official 0 furni, 1 user, -10 global, -20 context): visible rows in AIR order. */
export const wiredVariablePickerRows = (catalog: WiredVariableCatalog, variableTarget: number): IWiredVariableData[] =>
    [ ...catalog.values() ]
        .map(entry => entry.variable)
        .filter(variable => !variable.isInvisible && variable.variableTarget === variableTarget)
        .sort(compareWiredVariables);

/** The definition box id inside a variable id (`user:12`, `furni:3`, `room:5`, `ctx:9`), or null for a built-in. */
export const wiredVariableBoxId = (variableId: string): number | null =>
{
    const match = /^(user|furni|room|ctx):(\d+)$/.exec(variableId ?? '');

    if(!match) return null;

    const id = Number(match[2]);

    return id > 0 ? id : null;
};

/** AIR WiredVariable.isPersisted. */
export const isPersistedWiredVariable = (variable: { availabilityType?: number }): boolean =>
    PERSISTED_AVAILABILITY.has(variable?.availabilityType);

/**
 * AIR WiredMenuOverviewTab text table: the connector by numeric key (none past 400 entries), then the fallback
 * as "_"; nothing for a variable without a text connector.
 */
export const wiredVariableTextValues = (variable: Pick<IWiredVariableData, 'textConnector' | 'textConnectorFallback'>): { value: string; text: string }[] =>
{
    if(!variable?.textConnector) return [];

    const rows = (variable.textConnector.length <= WIRED_VARIABLE_MAX_TEXT_CONNECTIONS)
        ? [ ...variable.textConnector ].sort((left, right) => left.key - right.key).map(entry => ({ value: String(entry.key), text: entry.value }))
        : [];

    if(variable.textConnectorFallback !== null && variable.textConnectorFallback !== undefined) rows.push({ value: '_', text: variable.textConnectorFallback });

    return rows;
};
