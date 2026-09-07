import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogNavigationItemView } from './CatalogNavigationItemView';

const activateNode = vi.fn();

vi.mock('../catalog-icon/CatalogIconView', () => ({
    CatalogIconView: () => <span aria-hidden="true" />
}));

const makeNode = (overrides: Record<string, unknown> = {}) =>
    ({
        pageId: 7,
        parent: { pageId: -1 },
        localization: 'Sedie',
        iconId: 1,
        children: [{}],
        isActive: false,
        isBranch: true,
        isOpen: false,
        ...overrides
    }) as any;

describe('catalog navigation item accessibility', () => {
    it('exposes branch state and supports keyboard activation', () => {
        const node = makeNode();

        render(
            <CatalogNavigationItemView
                node={node}
                runtime={{
                    activateNode,
                    adminMode: false,
                    createSubpage: vi.fn(),
                    deletePage: vi.fn(),
                    reorderPage: vi.fn()
                }}
            />
        );

        const item = screen.getByRole('treeitem', { name: 'Sedie' });

        expect(item).toHaveAttribute('aria-expanded', 'false');
        expect(item).toHaveAttribute('tabindex', '0');

        fireEvent.keyDown(item, { key: 'Enter' });
        expect(activateNode).toHaveBeenCalledWith(node);
    });

    it('keeps the normal and Builders Club standard selection palettes', () => {
        const css = readFileSync(resolve(process.cwd(), 'src/css/catalog/CatalogView.css'), 'utf8');

        expect(css).toMatch(/--catalog-standard-select:\s*#63c5e9/);
        expect(css).toMatch(/--catalog-standard-select-outer:\s*#82d1ed/);
        expect(css).toMatch(/octane-catalog-navigation-list\.is-builders-club[\s\S]*--catalog-standard-select:\s*var\(--catalog-standard-bc\)/);
    });
});
