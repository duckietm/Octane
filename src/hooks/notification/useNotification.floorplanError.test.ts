import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('floor plan error notification', () => {
    it('cleans the message without throwing when the server sent none', () => {
        const source = readFileSync(join(process.cwd(), 'src/hooks/notification/useNotification.ts'), 'utf8');

        expect(source).toContain("(options.get('message') ?? '').replace(/[^a-zA-Z._ ]/g, '')");
        expect(source).not.toContain("options.get('message').replace(");
    });
});
