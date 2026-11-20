import { useDoorbellActions } from './useDoorbellActions';
import { useDoorbellState } from './useDoorbellState';

/**
 * @deprecated Use `useDoorbellState` and `useDoorbellActions` directly.
 * This shim preserves the old `{ users, answer }` shape so existing
 * imports keep working.
 * @public
 */
export const useDoorbellWidget = () => {
    const users = useDoorbellState();
    const { answer } = useDoorbellActions();

    return { users, answer };
};
