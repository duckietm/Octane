import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CatalogItemGridWidgetView scrollbar ownership', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/catalog/views/page/widgets/CatalogItemGridWidgetView.tsx'), 'utf8');

    it('uses one classic scroll owner in both normal and virtualized grids', () => {
        expect(source).toContain('<ClassicScrollAreaView');
        expect(source).toContain('classicScrollbar');
        expect(source).toContain('overflow="visible"');
        expect(source).toContain('elementRef.current.scrollLeft = 0');
        expect(source).not.toContain('innerRef={elementRef}');
    });
});
