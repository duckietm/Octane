import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/furni-editor/FurniEditorAirText.css');
const view = read('src/components/furni-editor/FurniEditorView.tsx');
const edit = read('src/components/furni-editor/views/FurniEditorEditView.tsx');

describe('furni editor text (AIR conventions)', () => {
    it('is regular Ubuntu with pure black body text and an 11 px floor', () => {
        expect(view).toContain("import '../../css/furni-editor/FurniEditorAirText.css';");
        expect(view).toContain('className="octane-furni-editor ');
        expect(css).toMatch(/\.octane-furni-editor \{[^}]*--octane-card-text: #000000;[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/:where\(\.text-\\\[8px\\\], \.text-\\\[9px\\\], \.text-\\\[10px\\\]\):not\(svg, svg \*, \.cursor-help\) \{[^}]*font-size: 11px !important/);
        expect(css).toMatch(/:where\(\.text-sm\):not\(svg, svg \*\) \{[^}]*font-size: 12px !important/);
    });

    it('draws section titles 14 px bold black', () => {
        expect(css).toMatch(/\.octane-furni-editor__section-title \{[^}]*font-size: 14px !important;[^}]*font-weight: 700 !important/);
        expect(edit.match(/octane-furni-editor__section-title text-\[14px\] font-bold text-black/g)).toHaveLength(2);
    });

    it('turns the green Save and the secondary buttons into the grey button_thick with black text', () => {
        expect(css).toMatch(/:where\(\.habbo-btn-primary, \.habbo-btn-secondary\) \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\) !important;[^}]*color: #000000 !important/);
        expect(css).toMatch(/:where\(\.habbo-btn-primary, \.habbo-btn-secondary, \.habbo-btn-danger\) \{[^}]*font-size: 12px !important;[^}]*font-weight: 700 !important/);
    });
});
