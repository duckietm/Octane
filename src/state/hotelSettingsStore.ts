import { createOctaneStore } from './createOctaneStore';

/** The hotel settings the server sends with the login state (HotelSettingsEvent). A length of 0 means none was sent. */
export interface HotelSettings {
    cameraUrl: string;
    chatMaxLength: number;
    mottoMaxLength: number;
    botNameMaxLength: number;
    petNameMaxLength: number;
    mentionAliases: { everyone: string[]; friends: string[]; room: string[] };
}

interface HotelSettingsState {
    /** Null until the server has sent them: every reader then keeps the hotel's own configuration. */
    settings: HotelSettings | null;
    setSettings: (settings: HotelSettings) => void;
}

export const useHotelSettingsStore = createOctaneStore<HotelSettingsState>()((set) => ({
    settings: null,
    setSettings: (settings: HotelSettings) => set({ settings })
}));
