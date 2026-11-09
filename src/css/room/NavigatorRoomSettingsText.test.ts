import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/room/NavigatorRoomSettings.css'), 'utf8');

describe('room settings text (ros_room_settings)', () => {
    it('sets the content in regular Ubuntu 12 px with 14 px captions and the AIR delete colour', () => {
        expect(css).toMatch(/\.octane-room-settings \.octane-card-content-shell \{[^}]*font-family: HabboAirUbuntu[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-room-settings-caption \{[^}]*font-size: 14px !important/);
        expect(css).toMatch(/\.octane-room-settings-delete \{[^}]*color: #bb2200 !important/);
    });

    it('skins unban / FAQ as the grey button and clear rights as the grey button_thick', () => {
        const rights = readFileSync(join(process.cwd(), 'src/components/navigator/views/room-settings/NavigatorRoomSettingsRightsTabView.tsx'), 'utf8');

        expect(css).toMatch(/\.octane-room-settings \.octane-card-content-shell \.habbo-btn-secondary \{[^}]*var\(--habbo-skin-shiny\) !important;[^}]*font-size: 12px !important;\s*font-weight: 400 !important/);
        expect(css).toMatch(/\.habbo-btn-secondary\.octane-room-settings-clear-rights \{[^}]*var\(--habbo-skin-shiny-thick\) !important;\s*font-weight: 700 !important/);
        expect(rights).not.toContain('variant="danger"');
    });
});
