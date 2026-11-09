import { describe, expect, it } from 'vitest';
import { NotificationAlertItem } from '../../../../api';
import { getEventDetails } from './NotificationEventAlertView';

const eventItem = (data: Map<string, string>, alertType = 'hotel.event') =>
    new NotificationAlertItem(['fallback paragraph'], alertType, 'navigator/goto/47', 'link', 'Evento', null, 120, data);

describe('Hotel event card details', () => {
    it('lays out the placeholders the notification carries', () => {
        const details = getEventDetails(
            eventItem(
                new Map([
                    ['LOOK', 'hd-180-1.ch-255-66'],
                    ['USERNAME', 'tester'],
                    ['ROOMNAME', 'Piazza'],
                    ['TIME', '18:22'],
                    ['MESSAGE', 'festa in piscina']
                ])
            )
        );

        expect(details).toMatchObject({
            closed: false,
            look: 'hd-180-1.ch-255-66',
            username: 'tester',
            roomName: 'Piazza',
            time: '18:22',
            message: 'festa in piscina'
        });
    });

    it('falls back to the rendered paragraph when no placeholders came through', () => {
        expect(getEventDetails(eventItem(null)).message).toBe('fallback paragraph');
        expect(getEventDetails(eventItem(new Map())).message).toBe('fallback paragraph');
    });

    it('leaves the message empty when the event was announced without one', () => {
        const details = getEventDetails(
            eventItem(
                new Map([
                    ['ROOMNAME', 'Piazza'],
                    ['USERNAME', 'tester'],
                    ['MESSAGE', '']
                ])
            )
        );

        expect(details.message).toBe('');
        expect(details.roomName).toBe('Piazza');
    });

    it('knows a closing announcement from an opening one', () => {
        expect(getEventDetails(eventItem(new Map(), 'hotel.event.ended')).closed).toBe(true);
    });
});
