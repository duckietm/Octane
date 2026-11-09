import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/floorplan-editor/FloorplanEditorView.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/floorplan-editor/FloorplanEditorView.tsx'), 'utf8');

const rule = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return start < 0 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('floor plan editor (floor_plan_editor_bc)', () => {
    it('is the 662x600 AIR window with the subtitle strip, two 0xbdbdb5 panels and 120x35 buttons', () => {
        expect(view).toContain('w-[662px] h-[600px]');
        expect(view).toContain('className="fp-banner"');
        expect(view).toContain('data-testid="floorplan-cancel"');
        expect(rule('.fp-panels')).toContain('grid-template-columns: 344px 289px');
        expect(rule('.fp-panel')).toContain('background: var(--fp-panel)');
        expect(css).toContain('--fp-panel: #bdbdb5;');
        expect(rule('.fp-btn')).toMatch(/min-width: 120px;[\s\S]*height: 35px;[\s\S]*font-size: 12px;[\s\S]*font-weight: 700/);
        expect(rule('.fp-tool')).toMatch(/width: 51px;[\s\S]*height: 42px/);
    });

    it('sets the texts in regular Ubuntu 12 px with a 10 px white subtitle', () => {
        expect(rule('.octane-floorplan-window')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(rule('.fp-group-label')).toContain('font-size: 12px');
        expect(rule('.fp-panel-title')).toContain('font-size: 12px');
        expect(rule('.octane-floorplan-window .fp-banner-text')).toMatch(/color: #ffffff !important;[\s\S]*font-size: 10px/);
        expect(rule('.octane-floorplan-window .octane-card-title')).toContain('font-size: 12px !important');
        expect(css).toMatch(/\.octane-floorplan-window :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
    });

    it('keeps the enter-direction avatar inside its own 45x72 box', () => {
        expect(rule('.fp-orientation-avatar')).toMatch(/position: relative;[\s\S]*width: 45px;[\s\S]*height: 72px/);
    });

    it('centres the enter-direction avatar between the arrows', () => {
        expect(rule('.fp-orientation-avatar img')).toMatch(/object-position: center;/);
    });
});
