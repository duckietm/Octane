import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/chat/ChatHistoryView.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('chat history text (AIR ChatHistoryEntryBitmapBubble / ChatHistoryRoomChangeEntry)', () => {
    it('draws the timestamp in regular Ubuntu 12 italic grey', () => {
        const time = rule('.octane-chat-history-time');

        expect(time).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(time).toContain('font-size: 12px');
        expect(time).toContain('font-style: italic');
        expect(time).toContain('color: #a0a0a0');
        expect(time).not.toContain('text-shadow');
    });

    it('draws the room change line in regular Ubuntu 12', () => {
        const roomInfo = rule('.octane-chat-history-room-info');

        expect(roomInfo).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(roomInfo).toContain('font-size: 12px');
        expect(roomInfo).toContain('color: #222222');
    });

    it('never falls back to the condensed Ubuntu cut', () => {
        expect(css).not.toMatch(/font-family:\s*Ubuntu\b/);
    });
});
