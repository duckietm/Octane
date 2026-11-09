import { useSharedHook } from '@/state/useSharedHook';
import { useWiredToolsStore } from './useWiredToolsStore';

/**
 * Read-only slice of the Wired tools store: account preferences,
 * room-settings flags, variable definitions / assignments, plus the
 * two derived 'should show X button' booleans.
 *
 * Components that only need to render Wired state subscribe through
 * this hook so it's easy to grep for read-only consumers vs. the
 * imperative ones (which use useWiredToolsActions).
 */
export const useWiredToolsState = () => {
    const {
        accountPreferences,
        roomSettings,
        showInspectButton,
        showToolbarButton,
        userVariableDefinitions,
        userVariableAssignments,
        furniVariableDefinitions,
        furniVariableAssignments,
        roomVariableDefinitions,
        roomVariableAssignments,
        contextVariableDefinitions,
        areUserVariablesLoaded
    } = useSharedHook(useWiredToolsStore);

    return {
        accountPreferences,
        roomSettings,
        showInspectButton,
        showToolbarButton,
        userVariableDefinitions,
        userVariableAssignments,
        furniVariableDefinitions,
        furniVariableAssignments,
        roomVariableDefinitions,
        roomVariableAssignments,
        contextVariableDefinitions,
        areUserVariablesLoaded
    };
};
