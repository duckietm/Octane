import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/room/InfoStand.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/room/widgets/avatar-info/AvatarInfoWidgetView.tsx'), 'utf8');

describe('infostand text (AIR userview, furni_view, bot_view, pet_view)', () => {
    it('is Volter 9 px, also over the important Tailwind sizes of its buttons', () => {
        expect(view).toContain('octane-infostand-area');
        expect(css).toMatch(/\.octane-infostand-area \{[^}]*font-family: Volter[^}]*font-size: 9px/);
        expect(css).toMatch(/@layer base \{\s*\.octane-infostand-area :where\(\*\):not\(svg, svg \*\) \{[^}]*font-size: 9px !important/);
    });
});
