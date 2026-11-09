import { createOctaneStore } from './createOctaneStore';

/** The user's own chat preferences, saved on the server (UserSettings / SetChatPreferences). */
interface UserChatPreferencesState {
    chatMode: number;
    bubbleWidth: number;
    scrollSpeed: number;
    setPreferences: (preferences: Partial<Pick<UserChatPreferencesState, 'chatMode' | 'bubbleWidth' | 'scrollSpeed'>>) => void;
}

export const useUserChatPreferencesStore = createOctaneStore<UserChatPreferencesState>()((set) => ({
    chatMode: 0,
    bubbleWidth: 1,
    scrollSpeed: 1,
    setPreferences: (preferences) => set(preferences)
}));
