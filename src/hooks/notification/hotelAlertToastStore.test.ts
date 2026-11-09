import { describe, expect, it } from 'vitest';
import { useHotelAlertToastStore } from './hotelAlertToastStore';

describe('hotelAlertToastStore', () => {
    it('queues toasts in order with unique ids and dismisses by id', () => {
        const { pushToast, dismissToast } = useHotelAlertToastStore.getState();

        pushToast('first alert');
        pushToast('second alert', 'Staff alert');

        let toasts = useHotelAlertToastStore.getState().toasts;

        expect(toasts.map((toast) => toast.message)).toEqual(['first alert', 'second alert']);
        expect(toasts[0].id).not.toBe(toasts[1].id);
        expect(toasts[0].title).toBeUndefined();
        expect(toasts[1].title).toBe('Staff alert');

        dismissToast(toasts[0].id);

        toasts = useHotelAlertToastStore.getState().toasts;

        expect(toasts.map((toast) => toast.message)).toEqual(['second alert']);

        dismissToast(toasts[0].id);

        expect(useHotelAlertToastStore.getState().toasts).toEqual([]);
    });

    it('ignores dismissing an unknown id', () => {
        const { pushToast, dismissToast } = useHotelAlertToastStore.getState();

        pushToast('kept');

        const kept = useHotelAlertToastStore.getState().toasts[0];

        dismissToast(kept.id + 999);

        expect(useHotelAlertToastStore.getState().toasts).toHaveLength(1);

        dismissToast(kept.id);
    });
});
