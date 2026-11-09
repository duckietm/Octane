import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/room/NavigatorRoomInfo.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/navigator/views/NavigatorRoomInfoView.tsx'), 'utf8');

const rule = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return start < 0 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('room info text (roominfo)', () => {
    it('is regular Ubuntu at u_regular 12 px', () => {
        expect(rule('.octane-room-info__content')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(rule('.octane-room-info__content')).toContain('font-size: 12px');
        expect(css).toMatch(/\.octane-room-info :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(rule('.octane-room-info__meta')).toContain('font-size: 12px');
        expect(rule('.octane-room-info__description')).toContain('font-size: 12px');
        expect(rule('.octane-room-info__room-link')).toContain('font-size: 12px');
    });

    it('has a u_bold name, #777777 bold captions and 12 px regular buttons', () => {
        expect(rule('.octane-room-info__name')).toContain('font-weight: 700');
        expect(rule('.octane-room-info__caption')).toContain('color: #777777');
        expect(rule('.octane-room-info__action')).toContain('font-size: 12px');
        expect(rule('.octane-room-info__action')).toContain('font-weight: 400');
        expect(view).not.toContain('<Text small');
    });

    it('draws the room info buttons in the grey shiny skin with black text', () => {
        expect(css).toMatch(/@layer base \{\s*\.octane-room-info__action\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny\) !important;\s*color: #000000 !important;/);
    });
});
