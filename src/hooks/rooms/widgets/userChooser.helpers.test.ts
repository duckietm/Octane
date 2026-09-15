import { describe, expect, it, vi } from 'vitest';
import { filterUserChooserItems, getUserChooserType, USER_CHOOSER_TYPE_OPTIONS } from './userChooser.helpers';

vi.mock('@octane/renderer', () => ({
    RoomObjectType: { USER: 1, PET: 2, BOT: 3, RENTABLE_BOT: 4 }
}));

const items = [
    { name: 'Alice', type: 'user' },
    { name: 'Bobba', type: 'bot' },
    { name: 'Rex', type: 'pet' },
    { name: 'Alfred', type: 'bot' }
];

describe('userChooser.helpers', () => {
    it('maps room unit types to chooser types and drops unknown ones', () => {
        expect(getUserChooserType(1)).toBe('user');
        expect(getUserChooserType(2)).toBe('pet');
        expect(getUserChooserType(3)).toBe('bot');
        expect(getUserChooserType(4)).toBe('bot');
        expect(getUserChooserType(9)).toBeNull();
    });

    it('filters by type', () => {
        expect(filterUserChooserItems(items, '', 'bot').map((item) => item.name)).toEqual(['Bobba', 'Alfred']);
        expect(filterUserChooserItems(items, '', 'all')).toHaveLength(4);
    });

    it('filters by name and type together, ignoring case', () => {
        expect(filterUserChooserItems(items, 'al', 'all').map((item) => item.name)).toEqual(['Alice', 'Alfred']);
        expect(filterUserChooserItems(items, 'AL', 'bot').map((item) => item.name)).toEqual(['Alfred']);
    });

    it('offers all, users, pets and bots in the official order', () => {
        expect(USER_CHOOSER_TYPE_OPTIONS.map((option) => option.value)).toEqual(['all', 'user', 'pet', 'bot']);
    });
});
