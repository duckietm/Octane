import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/camera/CameraWidget.css'), 'utf8');

describe('camera windows text (camera_interface, camera_editor, photo_purchase_confirmation)', () => {
    it('uses regular AIR Ubuntu instead of the condensed Ubuntu face', () => {
        expect(css).not.toMatch(/font-family: Ubuntu, sans-serif/);
        expect(css).toMatch(/\.octane-camera-capture \{[^}]*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif/);
        expect(css).toMatch(/\.octane-camera-checkout :where\(\*\):not\(svg, svg \*\)[^{]*\{[^}]*HabboAirUbuntu[^}]*!important/);
        expect(css).toMatch(/\.octane-camera-editor :where\(\*\):not\(svg, svg \*\)/);
    });

    it('labels the room thumbnail camera buttons like button_thick: 12 px bold black', () => {
        expect(css).toMatch(/\.octane-room-thumbnail-camera__buttons button \{[^}]*color: #000000;[^}]*font-size: 12px;[^}]*font-weight: 700/);
    });
});
