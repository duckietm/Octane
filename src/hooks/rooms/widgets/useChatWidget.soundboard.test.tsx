import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Soundboard room feedback', () => {
    it('adds a plain room-info history entry without an emoji prefix', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/hooks/rooms/widgets/useChatWidget.ts'), 'utf8');
        const start = source.indexOf('useUiEvent<SoundboardRoomMessageEvent>');
        const end = source.indexOf('useOctaneEvent<RoomDragEvent>', start);
        const handler = source.slice(start, end);

        expect(handler).toContain('addChatEntry({');
        expect(handler).toContain('ChatEntryType.TYPE_ROOM_INFO');
        expect(handler).not.toContain('prefixText');
        expect(handler).not.toContain('1F50A');
    });
});
