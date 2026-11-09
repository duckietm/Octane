export type CatalogAdminSaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

export interface CatalogAdminSmartSaveState<T>
{
    baseline: T;
    draft: T;
    inFlight: { operationId: string; submitted: T; closeAfter: boolean } | null;
    queued: { closeAfter: boolean } | null;
    status: CatalogAdminSaveStatus;
    lastSavedAt: number | null;
    message: string | null;
    fieldErrors: Record<string, string>;
}

export type CatalogAdminSmartSaveAction<T> =
    | { type: 'hydrate'; value: T }
    | { type: 'patch'; patch: Partial<T> }
    | { type: 'submit'; operationId: string; submitted: T; closeAfter: boolean }
    | { type: 'queue'; closeAfter: boolean }
    | { type: 'success'; operationId: string; committed: T; savedAt: number; message?: string | null }
    | { type: 'failure'; operationId: string; message: string; fieldErrors: Record<string, string> }
    | { type: 'conflict'; operationId: string; message: string }
    | { type: 'reset' };

export const isCatalogAdminFormDirty = <T extends object>(baseline: T, draft: T): boolean =>
{
    const baselineKeys = Object.keys(baseline).sort();
    const draftKeys = Object.keys(draft).sort();
    if(baselineKeys.length !== draftKeys.length) return true;
    for(let index = 0; index < baselineKeys.length; index++)
    {
        if(baselineKeys[index] !== draftKeys[index]) return true;
        const key = baselineKeys[index] as keyof T;
        if(!Object.is(baseline[key], draft[key])) return true;
    }
    return false;
};

export const mergeCatalogAdminCommittedForm = <T extends object>(submitted: T, current: T, committed: T): T =>
{
    const merged = { ...current };
    for(const key of Object.keys(committed) as (keyof T)[])
    {
        if(Object.is(current[key], submitted[key])) merged[key] = committed[key];
    }
    return merged;
};

export const createCatalogAdminSmartSaveState = <T extends object>(initial: T): CatalogAdminSmartSaveState<T> => ({
    baseline: { ...initial },
    draft: { ...initial },
    inFlight: null,
    queued: null,
    status: 'saved',
    lastSavedAt: null,
    message: null,
    fieldErrors: {}
});

export const catalogAdminSmartSaveReducer = <T extends object>(
    state: CatalogAdminSmartSaveState<T>,
    action: CatalogAdminSmartSaveAction<T>): CatalogAdminSmartSaveState<T> =>
{
    switch(action.type)
    {
        case 'hydrate':
            return createCatalogAdminSmartSaveState(action.value);
        case 'patch':
        {
            const draft = { ...state.draft, ...action.patch };
            return {
                ...state,
                draft,
                status: state.inFlight ? 'saving' : (isCatalogAdminFormDirty(state.baseline, draft) ? 'dirty' : 'saved'),
                message: null,
                fieldErrors: {}
            };
        }
        case 'submit':
            return {
                ...state,
                inFlight: {
                    operationId: action.operationId,
                    submitted: { ...action.submitted },
                    closeAfter: action.closeAfter
                },
                queued: null,
                status: 'saving',
                message: null,
                fieldErrors: {}
            };
        case 'queue':
            return state.inFlight ? { ...state, queued: { closeAfter: action.closeAfter } } : state;
        case 'success':
        {
            if(state.inFlight?.operationId !== action.operationId) return state;
            const draft = mergeCatalogAdminCommittedForm(state.inFlight.submitted, state.draft, action.committed);
            return {
                ...state,
                baseline: { ...action.committed },
                draft,
                inFlight: null,
                status: isCatalogAdminFormDirty(action.committed, draft) ? 'dirty' : 'saved',
                lastSavedAt: action.savedAt,
                message: action.message ?? null,
                fieldErrors: {}
            };
        }
        case 'failure':
            if(state.inFlight?.operationId !== action.operationId) return state;
            return {
                ...state,
                inFlight: null,
                queued: null,
                status: 'error',
                message: action.message,
                fieldErrors: { ...action.fieldErrors }
            };
        case 'conflict':
            if(state.inFlight?.operationId !== action.operationId) return state;
            return {
                ...state,
                inFlight: null,
                queued: null,
                status: 'conflict',
                message: action.message,
                fieldErrors: {}
            };
        case 'reset':
            return {
                ...state,
                draft: { ...state.baseline },
                queued: null,
                status: 'saved',
                message: null,
                fieldErrors: {}
            };
    }
};
