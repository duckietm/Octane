import { createOctaneStore } from '../../state/createOctaneStore';

export interface ModAlert {
    id: number;
    title: string;
    message: string;
}

interface ModAlertState {
    alerts: ModAlert[];
    show: (message: string, title?: string) => void;
    close: (id: number) => void;
}

let nextAlertId = 1;

// Classic v75 windowManager.alert(title, message): a window of its own that stays until its button is pressed.
export const useModAlertStore = createOctaneStore<ModAlertState>()((set) => ({
    alerts: [],
    show: (message, title = 'Alert') => set((state) => ({ alerts: [...state.alerts, { id: nextAlertId++, title, message }] })),
    close: (id) => set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) }))
}));

export const showModAlert = (message: string, title = 'Alert') => useModAlertStore.getState().show(message, title);
