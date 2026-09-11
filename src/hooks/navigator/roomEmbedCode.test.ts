import { describe, expect, it } from 'vitest';
import { buildRoomEmbedCode, getRoomThumbnailUrl } from './roomEmbedCode';

describe('roomEmbedCode', () => {
    it('wraps the thumbnail in a link to the room', () => {
        expect(buildRoomEmbedCode({ roomLink: 'https://hotel/room/5', thumbnailUrl: 'https://img/5.png', roomName: 'Lobby' })).toBe(
            '<a href="https://hotel/room/5"><img src="https://img/5.png" alt="Lobby" /></a>'
        );
    });

    it('falls back to the room name without a thumbnail and escapes it', () => {
        expect(buildRoomEmbedCode({ roomLink: 'https://hotel/room/5', thumbnailUrl: '', roomName: 'Tom & "Jerry" <3' })).toBe(
            '<a href="https://hotel/room/5">Tom &amp; &quot;Jerry&quot; &lt;3</a>'
        );
    });

    it('returns nothing without a link', () => {
        expect(buildRoomEmbedCode({ roomLink: '', thumbnailUrl: 'x', roomName: 'y' })).toBe('');
    });

    it('prefers the official picture and otherwise uses the hotel thumbnail', () => {
        expect(getRoomThumbnailUrl({ roomId: 5, officialRoomPicRef: 'pics/a.png', imageLibraryUrl: 'https://lib/', thumbnailsUrl: 'https://t/%thumbnail%.png' })).toBe(
            'https://lib/pics/a.png'
        );
        expect(getRoomThumbnailUrl({ roomId: 5, officialRoomPicRef: '', imageLibraryUrl: 'https://lib/', thumbnailsUrl: 'https://t/%thumbnail%.png' })).toBe(
            'https://t/5.png'
        );
        expect(getRoomThumbnailUrl({ roomId: 0, officialRoomPicRef: '', imageLibraryUrl: '', thumbnailsUrl: 'https://t/%thumbnail%.png' })).toBe('');
    });
});
