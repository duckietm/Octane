/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveNewsLink } from '../utils/news';

describe('LoginWidgetSlot button link', () => {
    it('follows the link only once resolveNewsLink accepted it', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/login/components/LoginWidgetSlot.tsx'), 'utf8');

        expect(source).toContain('const target = resolveNewsLink(buttonLink);');
        expect(source).not.toContain('window.location.href = buttonLink');
    });

    it('turns a script or data link from the CMS into nothing', () => {
        expect(resolveNewsLink('javascript:alert(document.cookie)')).toBe('');
        expect(resolveNewsLink('data:text/html,<script>1</script>')).toBe('');
        expect(resolveNewsLink('https://hotel.example/news')).toBe('https://hotel.example/news');
    });
});
