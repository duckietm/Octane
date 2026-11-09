import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AvatarInfoWidgetAvatarView chrome', () => {
    it('wears the same menu chrome as the user own menu', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/room/widgets/avatar-info/menu/AvatarInfoWidgetAvatarView.tsx'), 'utf8');

        expect(source).toContain("'octane-avatar-action-menu--own'");
        expect(source).toContain('showCaretIcon={false}');
        expect(source).toContain('className="air-avatar-menu-buttons"');
    });
});
