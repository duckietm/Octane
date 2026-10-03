/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHousekeepingAlertRecipient, HOUSEKEEPING_ALERT_SCOPES } from '../../../../api/housekeeping/HousekeepingHotelTools';
import { HousekeepingHotelAlertView } from './HousekeepingHotelAlertView';

const sendHotelAlert = vi.fn(() => Promise.resolve({ ok: true, actionId: null, message: '' }));
const confirm = vi.fn((_message: string, onConfirm: () => void) => onConfirm());

vi.mock('../../../../hooks', () => ({
    useHousekeeping: () => ({ isActionPending: false, sendHotelAlert }),
    useHousekeepingConfirm: () => confirm
}));

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    buildHousekeepingAlertRecipient,
    HOUSEKEEPING_ALERT_SCOPES
}));

describe('HousekeepingHotelAlertView', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('sends to the whole hotel without a recipient', () => {
        render(<HousekeepingHotelAlertView />);

        fireEvent.change(screen.getByPlaceholderText('housekeeping.hotel.alert.placeholder'), { target: { value: 'Hello' } });
        fireEvent.click(screen.getByText('housekeeping.hotel.alert.send.hotel'));

        expect(sendHotelAlert).toHaveBeenCalledWith('Hello', undefined);
    });

    it('needs a username for one user and sends it as the recipient', () => {
        render(<HousekeepingHotelAlertView />);

        fireEvent.click(screen.getByText('housekeeping.hotel.alert.scope.user'));
        fireEvent.change(screen.getByPlaceholderText('housekeeping.hotel.alert.placeholder'), { target: { value: 'Hi' } });

        const send = screen.getByText('housekeeping.hotel.alert.send.user').closest('button');

        expect(send?.disabled).toBe(true);

        fireEvent.change(screen.getByPlaceholderText('housekeeping.hotel.alert.target.user'), { target: { value: 'Frank' } });
        fireEvent.click(screen.getByText('housekeeping.hotel.alert.send.user'));

        expect(sendHotelAlert).toHaveBeenCalledWith('Hi', 'user:Frank');
    });
});
