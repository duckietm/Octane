import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The server (RoomWordFilterModifyEvent) cuts a word longer than 25 characters; the field allowed 255. */
describe('room word filter input', () => {
    it('accepts as many characters as the server keeps', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/room/widgets/room-filter-words/RoomFilterWordsWidgetView.tsx'), 'utf8');

        expect(source).toContain('export const MAX_WORD_LENGTH = 25;');
        expect(source).toContain('maxLength={MAX_WORD_LENGTH}');
        expect(source).not.toContain('maxLength={255}');
    });
});
