import { useWiredToolsActions } from './useWiredToolsActions';
import { useWiredToolsState } from './useWiredToolsState';

/**
 * @deprecated Prefer `useWiredToolsState` (read-only) and
 * `useWiredToolsActions` (imperative) directly. This shim composes
 * both into the historical `useWiredTools()` shape so the ~20
 * existing consumers keep working unchanged.
 */
export const useWiredTools = () => {
    const state = useWiredToolsState();
    const actions = useWiredToolsActions();

    return { ...state, ...actions };
};
