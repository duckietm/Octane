import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('SnowWar chat', () => {
    it('uses the room chat bar (AIR RoomChatInputView) and AIR team chat bubbles', () => {
        const arena = readSource('src/components/game-center/views/snowwar/SnowWarArenaView.tsx');
        const css = readSource('src/css/game-center/GameCenterView.css');

        expect(arena).toContain('octane-chat-input-container swf-chat-input');
        expect(arena).toContain('swf-chat-input-field');
        expect(arena).toContain("avatar.teamId === 1 ? 'blue' : 'red'");
        expect(arena).toContain('<b>{avatar.name}: </b>{message.message}');
        expect(arena).not.toContain('snowwar-chat__log');
        expect(arena).not.toContain('snowwar-avatar__chat');
        expect(css).toContain('top: calc(100% - 104px);');
        expect(css).toContain('width: 471px;');
        expect(css).toContain('border-image-slice: 29 18 5 34 fill;');
        expect(css).toContain('.snowwar-chat-bubble--blue');
        expect(css).toContain('.snowwar-chat-bubble__face');
    });
});
