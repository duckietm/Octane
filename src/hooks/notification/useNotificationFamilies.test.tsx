import {
    GetCommunication,
    GetRoomEngine,
    HotelClosedAndOpensEvent,
    HotelClosesAndWillOpenAtEvent,
    PetLevelNotificationEvent,
    RecyclerFinishedMessageEvent,
    WiredRewardResultMessageEvent,
    WiredTransactionFailEvent
} from '@octane/renderer';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationAlertType, NotificationBubbleType } from '../../api';
import { useHotelStatusNotifications } from './useHotelStatusNotifications';
import { usePetNotifications } from './usePetNotifications';
import { useRecyclerNotifications } from './useRecyclerNotifications';
import { useWiredTransactionNotifications } from './useWiredTransactionNotifications';

vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

const listen = () => {
    const registerMessageEvent = vi.fn();

    vi.mocked(GetCommunication).mockReturnValue({ registerMessageEvent, removeMessageEvent: vi.fn() } as never);

    return (type: new (...args: never[]) => unknown, parser: unknown) => {
        const event = registerMessageEvent.mock.calls.map((call) => call[0]).find((registered) => registered instanceof type);

        event.callBack({ getParser: () => parser });
    };
};

describe('the notification families split out of useNotification', () => {
    afterEach(() => {
        vi.mocked(GetCommunication).mockReset();
        vi.mocked(GetRoomEngine).mockReset();
    });

    it('alerts that the hotel is closed and when it opens, with the opening time', () => {
        const emit = listen();
        const simpleAlert = vi.fn();

        renderHook(() => useHotelStatusNotifications(simpleAlert));
        emit(HotelClosedAndOpensEvent, { openHour: 7, openMinute: 5 });

        expect(simpleAlert).toHaveBeenCalledWith('opening.hours.disconnected', NotificationAlertType.DEFAULT, null, null, 'opening.hours.title');
    });

    it('tells apart a hotel that throws players out when it closes from one that does not', () => {
        const emit = listen();
        const simpleAlert = vi.fn();

        renderHook(() => useHotelStatusNotifications(simpleAlert));
        emit(HotelClosesAndWillOpenAtEvent, { userThrowOutAtClose: true, openHour: 9, openMinute: 30 });
        emit(HotelClosesAndWillOpenAtEvent, { userThrowOutAtClose: false, openHour: 9, openMinute: 30 });

        expect(simpleAlert.mock.calls.map((call) => call[0])).toEqual(['opening.hours.disconnected', 'opening.hours.closed']);
    });

    it('shows a recycler bubble for a finished recycle, and none for a failed one', () => {
        const emit = listen();
        const showSingleBubble = vi.fn();

        renderHook(() => useRecyclerNotifications(showSingleBubble));
        emit(RecyclerFinishedMessageEvent, { recyclerFinishedStatus: RecyclerFinishedMessageEvent.FINISHED_FAIL });
        emit(RecyclerFinishedMessageEvent, { recyclerFinishedStatus: RecyclerFinishedMessageEvent.FINISHED_OK });

        expect(showSingleBubble).toHaveBeenCalledTimes(1);
        expect(showSingleBubble.mock.calls[0][1]).toBe(NotificationBubbleType.RECYCLEROK);
    });

    it('shows a failed wired transaction as an info bubble and a reward refusal as an alert', () => {
        const emit = listen();
        const simpleAlert = vi.fn();
        const showSingleBubble = vi.fn();

        renderHook(() => useWiredTransactionNotifications(simpleAlert, showSingleBubble));
        emit(WiredTransactionFailEvent, { failureReason: 3 });
        emit(WiredRewardResultMessageEvent, { reason: 1 });

        expect(showSingleBubble).toHaveBeenCalledWith('wired_transactions.notification.fail', NotificationBubbleType.INFO);
        expect(simpleAlert).toHaveBeenCalledTimes(1);
        expect(simpleAlert.mock.calls[0][1]).toBe(NotificationAlertType.DEFAULT);
    });

    it('shows a pet level up as a bubble, with no image when the engine has none', async () => {
        const emit = listen();
        const showSingleBubble = vi.fn();

        vi.mocked(GetRoomEngine).mockReturnValue({ getRoomObjectPetImage: () => null } as never);
        renderHook(() => usePetNotifications(vi.fn(), showSingleBubble));
        emit(PetLevelNotificationEvent, { figureData: { typeId: 1, paletteId: 2, color: 'ff0000' }, petName: 'Rex', level: 4 });
        await Promise.resolve();

        expect(showSingleBubble).toHaveBeenCalledWith('notifications.text.petlevel', NotificationBubbleType.PETLEVEL, null);
    });
});
