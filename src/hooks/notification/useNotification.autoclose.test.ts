/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { NotificationAlertItem } from '../../api';
import { getAutoCloseSeconds, prependSingleAlert } from './useNotification';

describe('Notification auto close delay', () => {
    it('reads the delay the server sent with the notification', () => {
        expect(getAutoCloseSeconds(new Map([['timeout', '120']]))).toBe(120);
    });

    it('leaves notifications without a delay open until they are closed by hand', () => {
        expect(getAutoCloseSeconds(new Map())).toBeNull();
    });

    it('ignores a delay that is not a positive number of seconds', () => {
        expect(getAutoCloseSeconds(new Map([['timeout', 'soon']]))).toBeNull();
        expect(getAutoCloseSeconds(new Map([['timeout', '0']]))).toBeNull();
        expect(getAutoCloseSeconds(new Map([['timeout', '-30']]))).toBeNull();
    });
});

describe('Single alert groups', () => {
    const alert = (type: string) => new NotificationAlertItem(['message'], type);

    it('replaces the previous hotel event announcement instead of stacking', () => {
        const first = alert('hotel.event');
        const unrelated = alert('default');
        const second = alert('hotel.event');

        expect(prependSingleAlert([first, unrelated], second)).toEqual([second, unrelated]);
    });

    it('lets a closing announcement replace the event it closes', () => {
        const open = alert('hotel.event');
        const closed = alert('hotel.event.ended');

        expect(prependSingleAlert([open], closed)).toEqual([closed]);
    });

    it('leaves every other alert stacking as before', () => {
        const first = alert('default');
        const second = alert('default');

        expect(prependSingleAlert([first], second)).toEqual([second, first]);
    });
});
