import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A tag click goes through the navigator/tag link only: the navigator store then runs the one search. A second,
// direct NavigatorSearchComposer with another filter raced it and the results of either could win.
describe('tag clicks', () => {
    const files = [
        join(__dirname, 'NavigatorRoomInfoView.tsx'),
        join(__dirname, '../../room/widgets/avatar-info/infostand/InfoStandWidgetUserTagsView.tsx')
    ];

    it.each(files)('%s opens the tag link and sends no search of its own', (file) => {
        const source = readFileSync(file, 'utf8');

        expect(source).toContain('CreateLinkEvent(`navigator/tag/');
        expect(source).not.toContain('NavigatorSearchComposer');
        expect(source).not.toContain('navigator/search/');
    });
});
