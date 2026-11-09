import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogView.css'), 'utf8');
const block = (query: string) => {
    const start = css.indexOf(`@media ${query} {`);

    return start < 0 ? '' : css.slice(start, css.indexOf('\n}\n', start));
};

describe('catalogue on phones and tablets', () => {
    it('goes full screen on a phone, above the generic window centring and card limits', () => {
        const phone = block('(max-width: 640px), (orientation: landscape) and (max-height: 520px)');

        expect(phone).toContain('body .draggable-window:has(> .octane-catalog-window)');
        expect(phone).toContain('transform: none !important');
        expect(phone).toContain('body .octane-card-shell.octane-catalog-window');
        expect(phone).toContain('height: 100dvh !important');
    });

    it('keeps the two AIR columns on a phone on its side and shrinks the window on short screens', () => {
        expect(block('(orientation: landscape) and (max-height: 520px)')).toContain('grid-template-columns: 184px 360px');
        expect(block('(max-height: 659px) and (min-width: 641px) and (min-height: 521px)')).toContain('height: calc(100dvh - 16px) !important');
    });
});
