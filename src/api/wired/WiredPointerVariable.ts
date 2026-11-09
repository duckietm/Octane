/**
 * The official pointer variable (AIR `PointerVariable`, variable code 9): another variable in disguise. While a stack
 * runs, its accessor context variable holds the furni id of the WIRED box of the variable it stands for.
 *
 * Editor layout as in AIR: ints `[headerSourceType]` (official variable target: 0 furni, 1 user, -10 global,
 * -20 context; furni by default), the string is the pointer's name and the variable ids `[accessor]`.
 */
export const POINTER_SOURCE_FURNI = 0;
export const POINTER_SOURCE_USER = 1;
export const POINTER_SOURCE_GLOBAL = -10;
export const POINTER_SOURCE_CONTEXT = -20;

/** The header source type selector's choices, in AIR's order. */
export const POINTER_SOURCE_TYPES = [ POINTER_SOURCE_FURNI, POINTER_SOURCE_USER, POINTER_SOURCE_GLOBAL, POINTER_SOURCE_CONTEXT ] as const;

export const normalizePointerSourceType = (value: number): number =>
    (POINTER_SOURCE_TYPES as readonly number[]).includes(value) ? value : POINTER_SOURCE_FURNI;

export interface IPointerAccessorCandidate
{
    itemId: number;
    hasValue: boolean;
    requiresExecutionContext?: boolean;
    valueShape?: 'single' | 'array';
    unavailable?: boolean;
}

/**
 * AIR's accessor filter over the room's context variables: a user-made one with a value that needs no running stack
 * (so no pointer, and no array either, which holds no single box id).
 */
export const isPointerAccessorCandidate = (definition: IPointerAccessorCandidate): boolean =>
    !!definition && definition.itemId > 0 && !!definition.hasValue && !definition.requiresExecutionContext && definition.valueShape !== 'array' && !definition.unavailable;

export interface IPointerEditorState
{
    sourceType: number;
    name: string;
    accessorId: number;
}

/** The editor state from a definition's ints, string and variable ids. */
export const readPointerEditor = (intData: number[], stringData: string, variableIds: string[]): IPointerEditorState =>
{
    const accessor = parseInt((variableIds?.[0] ?? '').replace(/^custom:/, ''), 10);

    return {
        sourceType: normalizePointerSourceType(intData?.[0] ?? POINTER_SOURCE_FURNI),
        name: stringData ?? '',
        accessorId: Number.isFinite(accessor) && accessor > 0 ? accessor : 0
    };
};

/** What the editor saves: AIR's readIntParamsFromForm, readStringParamFromForm and readVariableIdsFromForm. */
export const writePointerEditor = (state: IPointerEditorState) => ({
    intParams: [ normalizePointerSourceType(state.sourceType) ],
    stringParam: state.name ?? '',
    variableIds: state.accessorId > 0 ? [ String(state.accessorId) ] : []
});
