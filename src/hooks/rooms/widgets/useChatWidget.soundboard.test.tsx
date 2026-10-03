import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Soundboard room feedback', () => {
    it('stays out of room chat: plays are shown by the side feed instead', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/hooks/rooms/widgets/useChatWidget.ts'), 'utf8');

        expect(source).not.toContain('SoundboardRoomMessageEvent');
        expect(source).not.toContain('soundboard.room.played');
    });
});
