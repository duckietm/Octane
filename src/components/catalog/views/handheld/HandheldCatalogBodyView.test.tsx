/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogNode, ICatalogNode } from '../../../../api';
import { INITIAL_CATALOG_UI_STATE, useCatalogStore } from '../../../../hooks/catalog/catalogStore';

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string) => key
}));
vi.mock('../../../../hooks/purse/usePurse', () => ({ usePurse: () => ({ purse: null }) }));
vi.mock('../catalog-icon/CatalogIconView', () => ({ CatalogIconView: () => <i /> }));
vi.mock('../page/common/CatalogSearchView', () => ({ CatalogSearchView: () => <input aria-label="search" /> }));

import { HandheldCatalogBodyView } from './HandheldCatalogBodyView';

const node = (pageId: number, pageName: string, parent: ICatalogNode | null, visible = true) => {
    const created = new CatalogNode(
        { visible, icon: 0, pageId, parentId: parent?.pageId ?? -1, pageName, localization: pageName, children: [], offerIds: [] } as any,
        parent ? parent.depth + 1 : 0,
        parent
    );

    if (parent) parent.addChild(created);

    return created;
};

const root = node(-1, 'root', null);
const furni = node(1, 'furni', root);
const chairs = node(2, 'chairs', furni);
const tables = node(3, 'tables', furni);
node(4, 'hidden', root, false);

const Body = () => {
    const activeNodes = useCatalogStore((state) => state.activeNodes);
    const searchResult = useCatalogStore((state) => state.searchResult);

    return (
        <HandheldCatalogBodyView
            activeNodes={activeNodes}
            currentPage={null}
            isBusy={false}
            renderPage={() => <div data-testid="page">page of {activeNodes[activeNodes.length - 1]?.pageName}</div>}
            rootNode={root}
            rootTitle="Catalogue"
            searchResult={searchResult}
        />
    );
};

const rows = () => screen.queryAllByRole('listitem').map((item) => item.textContent);

beforeEach(() => useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE, isVisible: true }));
afterEach(cleanup);

describe('HandheldCatalogBodyView', () => {
    it('starts at the list of top pages and walks down and back up with the back bar', () => {
        render(<Body />);

        expect(screen.getByRole('heading')).toHaveTextContent('Catalogue');
        expect(rows()).toEqual(['furni']);
        expect(screen.queryByRole('button', { name: /octane.handheld.catalog.back|Back to/ })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'furni' }));

        expect(screen.getByRole('heading')).toHaveTextContent('furni');
        expect(rows()).toEqual(['chairs', 'tables']);

        fireEvent.click(screen.getByRole('button', { name: 'chairs' }));

        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(chairs);
        expect(screen.getByTestId('page')).toHaveTextContent('page of chairs');
        expect(screen.getByRole('heading')).toHaveTextContent('chairs');

        fireEvent.click(screen.getByRole('button', { name: 'Back to furni' }));

        expect(screen.queryByTestId('page')).toBeNull();
        expect(rows()).toEqual(['chairs', 'tables']);

        fireEvent.click(screen.getByRole('button', { name: 'Back to Catalogue' }));

        expect(rows()).toEqual(['furni']);
    });

    it('does not jump to the page the catalogue opens by itself, but follows one opened from elsewhere', () => {
        render(<Body />);

        // The store's first page on opening (resolvePendingRequest).
        act(() => useCatalogStore.getState().activateNode(chairs));

        expect(screen.queryByTestId('page')).toBeNull();

        // A link or "buy more" opening a page while the catalogue is open.
        act(() => useCatalogStore.getState().activateNode(tables));

        expect(screen.getByTestId('page')).toHaveTextContent('page of tables');
        expect(screen.getByRole('button', { name: 'Back to furni' })).toBeInTheDocument();
    });

    it('follows a page asked for while the catalogue was closed', () => {
        useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE, isVisible: true, pendingRequest: { kind: 'id', id: 3 } });
        render(<Body />);

        act(() => useCatalogStore.getState().activateNode(tables));

        expect(screen.getByTestId('page')).toHaveTextContent('page of tables');
    });
});
