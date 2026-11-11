// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { roomLinkConfirmationMessage } from './useFurnitureRoomLinkWidget';

describe('room link confirmation', () => {
    it('fills in the room and its owner and turns the pack line breaks into real ones', () => {
        expect(roomLinkConfirmationMessage('Go?\\n\\nRoom: %%room_name%%\\nOwner: %%room_owner%%', 'Lobby', 'Frank')).toBe('Go?\n\nRoom: Lobby\nOwner: Frank');
    });

    it('survives a text without placeholders and missing room data', () => {
        expect(roomLinkConfirmationMessage('Go there?', 'Lobby', 'Frank')).toBe('Go there?');
        expect(roomLinkConfirmationMessage('%%room_name%% by %%room_owner%%', null, undefined)).toBe(' by ');
        expect(roomLinkConfirmationMessage(null, 'Lobby', 'Frank')).toBe('');
    });
});
