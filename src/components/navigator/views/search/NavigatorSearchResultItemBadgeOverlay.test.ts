import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const searchViewPath = 'src/components/navigator/views/search';

describe('navigator room group badge overlay', () => {
    it('places the search-result tile badge at the AIR top-left slot', () => {
        const source = readFileSync(join(process.cwd(), searchViewPath, 'NavigatorSearchResultItemView.tsx'), 'utf8');

        expect(source).toContain('octane-navigator-air__tile-badge');
        expect(source).not.toContain('absolute! bottom-0 left-1/2');
    });

    it('places the room-info bubble badge at the AIR top-left 48x48 slot', () => {
        const source = readFileSync(join(process.cwd(), searchViewPath, 'NavigatorRoomInfoPopupView.tsx'), 'utf8');

        expect(source).toContain('octane-navigator-air__room-badge');
        expect(source).not.toContain('absolute! bottom-0 left-1/2');
    });
});
