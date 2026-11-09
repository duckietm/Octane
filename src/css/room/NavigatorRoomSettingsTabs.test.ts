import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/room/NavigatorRoomSettings.css'), 'utf8');

describe('the tabs of the room settings', () => {
    it('are narrow enough for five of them in the 341 px window', () => {
        expect(css).toContain('.octane-room-settings .octane-card-tabs .octane-card-tab-item');
        expect(css).toContain('padding: 5px 9px 0 !important;');
        expect(css).toContain('font-size: 11px;');
    });
});
