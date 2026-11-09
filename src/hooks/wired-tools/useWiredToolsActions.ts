import { useSharedHook } from '@/state/useSharedHook';
import { useWiredToolsStore } from './useWiredToolsStore';

/**
 * Imperative slice of the Wired tools store: state-mutating actions
 * (assignXxx / removeXxx / updateXxx) plus the link-event openers
 * (openMonitor / openInspectionForFurni / openInspectionForUser) and
 * the persistence helpers (saveRoomSettings, updateAccountPreferences,
 * requestUserVariables).
 *
 * Stays separate from useWiredToolsState so components that only need
 * to trigger Wired actions don't have to pull in the full state shape.
 */
export const useWiredToolsActions = () => {
    const {
        updateAccountPreferences,
        setPlayTestMode,
        togglePlayTestMode,
        updateWiredWhisperDisabled,
        saveRoomSettings,
        saveRoomTimezone,
        reloadRoomWired,
        rollbackRoomWired,
        requestUserVariables,
        assignUserVariable,
        removeUserVariable,
        updateUserVariableValue,
        assignFurniVariable,
        removeFurniVariable,
        clearVariableForAllHolders,
        updateFurniVariableValue,
        updateRoomVariableValue,
        openMonitor,
        openInspectionForFurni,
        openInspectionForUser
    } = useSharedHook(useWiredToolsStore);

    return {
        updateAccountPreferences,
        setPlayTestMode,
        togglePlayTestMode,
        updateWiredWhisperDisabled,
        saveRoomSettings,
        saveRoomTimezone,
        reloadRoomWired,
        rollbackRoomWired,
        requestUserVariables,
        assignUserVariable,
        removeUserVariable,
        updateUserVariableValue,
        assignFurniVariable,
        removeFurniVariable,
        clearVariableForAllHolders,
        updateFurniVariableValue,
        updateRoomVariableValue,
        openMonitor,
        openInspectionForFurni,
        openInspectionForUser
    };
};
