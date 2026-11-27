import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { countRoomPeople, HandheldRoomChipView } from './HandheldRoomChipView';

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

const PERSON = { type: 1 };
const PET = { type: 2 };
const BOT = { type: 4 };

const heart = () => document.querySelector('.octane-handheld-room-chip__heart').getAttribute('data-like');

describe('countRoomPeople', () => {
    it('counts the people of the live list, not the pets and bots', () => {
        expect(countRoomPeople([PERSON, PET, PERSON, BOT], 9)).toBe(2);
    });

    it('falls back to the room data until the list arrives', () => {
        expect(countRoomPeople([], 5)).toBe(5);
        expect(countRoomPeople([], -1)).toBe(0);
    });
});

describe('HandheldRoomChipView (phone room chip)', () => {
    it('shows the house, the room name, the people in the room and the heart', () => {
        render(<HandheldRoomChipView roomName="Welcome" users={[PERSON]} fallbackUserCount={0} canLike={false} liked={false} />);

        expect(document.querySelector('.octane-handheld-room-chip__house.icon-house')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-room-chip__name').textContent).toBe('Welcome');
        expect(document.querySelector('.octane-handheld-room-chip__count').textContent).toBe('1');
        expect(document.querySelector('.octane-handheld-room-chip__arrow')).not.toBeNull();
        expect(heart()).toBe('none');
    });

    it('follows the room as people come and go', () => {
        const { rerender } = render(<HandheldRoomChipView roomName="Welcome" users={[PERSON]} fallbackUserCount={0} canLike={false} liked={false} />);

        rerender(<HandheldRoomChipView roomName="Welcome" users={[PERSON, PERSON, PERSON]} fallbackUserCount={0} canLike={false} liked={false} />);

        expect(document.querySelector('.octane-handheld-room-chip__count').textContent).toBe('3');
    });

    it('draws the heart hollow while the room can be liked and red once liked', () => {
        const { rerender } = render(<HandheldRoomChipView roomName="Welcome" users={[PERSON]} fallbackUserCount={0} canLike={true} liked={false} />);

        expect(heart()).toBe('open');

        rerender(<HandheldRoomChipView roomName="Welcome" users={[PERSON]} fallbackUserCount={0} canLike={false} liked={true} />);

        expect(heart()).toBe('liked');
        expect(document.querySelector('.octane-handheld-room-chip__heart').classList.contains('is-liked')).toBe(true);
    });
});
