import { createOctaneStore } from '@/state/createOctaneStore';

export type HotelAlertToastVariant = 'broadcast' | 'staff';

export interface HotelAlertToast {
    id: number;
    message: string;
    title?: string;
    variant?: HotelAlertToastVariant;
}

interface HotelAlertToastState {
    toasts: HotelAlertToast[];
    pushToast: (message: string, title?: string, variant?: HotelAlertToastVariant) => void;
    dismissToast: (id: number) => void;
}

let nextToastId = 0;

export const useHotelAlertToastStore = createOctaneStore<HotelAlertToastState>()((set) => ({
    toasts: [],
    pushToast: (message, title, variant) => set((state) => ({ toasts: [...state.toasts, { id: ++nextToastId, message, title, variant }] })),
    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));
