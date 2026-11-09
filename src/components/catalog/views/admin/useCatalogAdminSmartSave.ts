import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
    catalogAdminSmartSaveReducer,
    createCatalogAdminSmartSaveState,
    isCatalogAdminFormDirty,
    mergeCatalogAdminCommittedForm
} from './CatalogAdminSmartSaveState';

export interface CatalogAdminSaveAcknowledgement
{
    operationId: string;
    success: boolean;
    code: string;
    message: string;
    entity: unknown;
    fieldErrors: Record<string, string>;
    acknowledgedAt: number;
}

interface UseCatalogAdminSmartSaveOptions<T extends object>
{
    initial: T;
    acknowledgement: CatalogAdminSaveAcknowledgement | null;
    submit: (draft: T) => string | null;
    canSubmit?: (draft: T) => boolean;
    toCommitted: (acknowledgement: CatalogAdminSaveAcknowledgement) => T | null;
    onClose?: () => void;
    confirmClose?: () => boolean;
}

export const useCatalogAdminSmartSave = <T extends object>({
    initial,
    acknowledgement,
    submit,
    canSubmit = () => true,
    toCommitted,
    onClose,
    confirmClose = () => window.confirm('Discard unsaved changes?')
}: UseCatalogAdminSmartSaveOptions<T>) =>
{
    const [state, dispatch] = useReducer(catalogAdminSmartSaveReducer<T>, initial, createCatalogAdminSmartSaveState<T>);
    const stateRef = useRef(state);
    const submitRef = useRef(submit);
    const canSubmitRef = useRef(canSubmit);
    const closeRef = useRef(onClose);
    const toCommittedRef = useRef(toCommitted);
    stateRef.current = state;
    submitRef.current = submit;
    canSubmitRef.current = canSubmit;
    closeRef.current = onClose;
    toCommittedRef.current = toCommitted;

    const patch = useCallback((value: Partial<T>) => dispatch({ type: 'patch', patch: value }), []);
    const hydrate = useCallback((value: T) => dispatch({ type: 'hydrate', value }), []);
    const reset = useCallback(() => dispatch({ type: 'reset' }), []);

    const save = useCallback((closeAfter = false) =>
    {
        const current = stateRef.current;
        if(current.inFlight)
        {
            dispatch({ type: 'queue', closeAfter });
            return current.inFlight.operationId;
        }
        if(!isCatalogAdminFormDirty(current.baseline, current.draft))
        {
            if(closeAfter) closeRef.current?.();
            return null;
        }
        if(!canSubmitRef.current(current.draft)) return null;

        const operationId = submitRef.current(current.draft);
        if(!operationId) return null;
        dispatch({ type: 'submit', operationId, submitted: current.draft, closeAfter });
        return operationId;
    }, []);

    const requestClose = useCallback(() =>
    {
        const current = stateRef.current;
        if((current.inFlight || isCatalogAdminFormDirty(current.baseline, current.draft)) && !confirmClose()) return;
        closeRef.current?.();
    }, [confirmClose]);

    useEffect(() =>
    {
        if(!acknowledgement) return;
        const current = stateRef.current;
        const inFlight = current.inFlight;
        if(!inFlight || inFlight.operationId !== acknowledgement.operationId) return;

        if(!acknowledgement.success)
        {
            if(acknowledgement.code === 'STALE_REVISION')
                dispatch({ type: 'conflict', operationId: acknowledgement.operationId, message: acknowledgement.message });
            else
                dispatch({
                    type: 'failure',
                    operationId: acknowledgement.operationId,
                    message: acknowledgement.message,
                    fieldErrors: acknowledgement.fieldErrors
                });
            return;
        }

        const committed = toCommittedRef.current(acknowledgement);
        if(!committed)
        {
            dispatch({
                type: 'failure', operationId: acknowledgement.operationId,
                message: acknowledgement.message || 'The server returned an incomplete save result.', fieldErrors: {}
            });
            return;
        }

        const merged = mergeCatalogAdminCommittedForm(inFlight.submitted, current.draft, committed);
        const shouldClose = inFlight.closeAfter && !current.queued && !isCatalogAdminFormDirty(committed, merged);
        dispatch({
            type: 'success', operationId: acknowledgement.operationId, committed,
            savedAt: acknowledgement.acknowledgedAt, message: acknowledgement.message
        });
        if(shouldClose) closeRef.current?.();
    }, [acknowledgement]);

    useEffect(() =>
    {
        if(state.inFlight || !state.queued) return;
        if(!isCatalogAdminFormDirty(state.baseline, state.draft))
        {
            const closeAfter = state.queued.closeAfter;
            dispatch({ type: 'reset' });
            if(closeAfter) closeRef.current?.();
            return;
        }

        if(!canSubmitRef.current(state.draft)) return;
        const operationId = submitRef.current(state.draft);
        if(!operationId) return;
        dispatch({ type: 'submit', operationId, submitted: state.draft, closeAfter: state.queued.closeAfter });
    }, [state.baseline, state.draft, state.inFlight, state.queued]);

    useEffect(() =>
    {
        const handleKeyboardSave = (event: KeyboardEvent) =>
        {
            if(!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
            event.preventDefault();
            save(false);
        };
        window.addEventListener('keydown', handleKeyboardSave);
        return () => window.removeEventListener('keydown', handleKeyboardSave);
    }, [save]);

    return {
        ...state,
        draft: state.draft,
        isDirty: isCatalogAdminFormDirty(state.baseline, state.draft),
        patch,
        hydrate,
        reset,
        save,
        requestClose
    };
};
