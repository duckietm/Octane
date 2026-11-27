/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

import { HandheldCatalogView } from './HandheldCatalogView';

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
const front = node(1, 'front', root);
const furni = node(2, 'furni', root);
const chairs = node(20, 'chairs', furni);
const tables = node(21, 'tables', furni);
const modern = node(210, 'modern', tables);
node(3, 'hidden', root, false);

const onClose = vi.fn();

const Shop = ({ useTabs = true, layoutCode = 'frontpage4' }) => {
    const activeNodes = useCatalogStore((state) => state.activeNodes);
    const searchResult = useCatalogStore((state) => state.searchResult);
    const leaf = activeNodes[activeNodes.length - 1] ?? null;

    return (
        <HandheldCatalogView
            activeNodes={activeNodes}
            currentPage={leaf ? ({ pageId: leaf.pageId, layoutCode, offers: [] } as any) : null}
            isBusy={false}
            renderPage={() => <div data-testid="page">page of {leaf?.pageName}</div>}
            rootNode={root}
            searchResult={searchResult}
            title="Shop"
            useTabs={useTabs}
            onClose={onClose}
        />
    );
};

const rows = () => within(screen.getByRole('list')).queryAllByRole('listitem').map((item) => item.textContent);
const panes = () => document.querySelector('.octane-handheld-shop__panes') as HTMLElement;
const tab = (name: string) => screen.getByRole('tab', { name });

beforeEach(() => {
    onClose.mockClear();
    useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE, isVisible: true });
});
afterEach(cleanup);

describe('HandheldCatalogView', () => {
    it('shows the top pages as tabs and starts on the list of the first one', () => {
        render(<Shop />);

        expect(screen.getAllByRole('tab').map((item) => item.textContent)).toEqual(['front', 'furni']);
        expect(tab('front')).toHaveAttribute('aria-selected', 'true');
        expect(panes()).toHaveAttribute('data-step', 'menu');
        // A tab without sub pages lists its own page.
        expect(rows()).toEqual(['front']);
    });

    it('walks tab, list, folder, page and back again', () => {
        render(<Shop />);

        fireEvent.click(tab('furni'));

        expect(tab('furni')).toHaveAttribute('aria-selected', 'true');
        expect(panes()).toHaveAttribute('data-step', 'menu');
        expect(rows()).toEqual(['chairs', 'tables']);

        // A folder opens its own list, with a row back up and its own page first.
        fireEvent.click(screen.getByRole('button', { name: 'tables' }));

        expect(rows()).toEqual(['furni', 'All of tables', 'modern']);
        expect(panes()).toHaveAttribute('data-step', 'menu');

        fireEvent.click(screen.getByRole('button', { name: 'modern' }));

        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(modern);
        expect(panes()).toHaveAttribute('data-step', 'page');
        expect(screen.getByTestId('page')).toHaveTextContent('page of modern');
        expect(screen.getByRole('heading')).toHaveTextContent('modern');
        expect(tab('furni')).toHaveAttribute('aria-selected', 'true');

        // "Back" in the page's strip returns to the list the page is in.
        fireEvent.click(screen.getByRole('button', { name: 'Back to tables' }));

        expect(panes()).toHaveAttribute('data-step', 'menu');
        expect(rows()).toEqual(['furni', 'All of tables', 'modern']);

        fireEvent.click(screen.getByRole('button', { name: 'Back to furni' }));

        expect(rows()).toEqual(['chairs', 'tables']);
    });

    it('opens a tab without sub pages straight on its page, and the active tab again on its list', () => {
        render(<Shop />);

        fireEvent.click(tab('furni'));
        fireEvent.click(screen.getByRole('button', { name: 'chairs' }));

        expect(panes()).toHaveAttribute('data-step', 'page');

        fireEvent.click(tab('furni'));

        expect(panes()).toHaveAttribute('data-step', 'menu');
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(chairs);

        fireEvent.click(tab('front'));

        expect(panes()).toHaveAttribute('data-step', 'page');
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(front);
    });

    it('keeps the list beside the page in the markup, so a phone on its side shows both', () => {
        render(<Shop />);

        fireEvent.click(tab('furni'));
        fireEvent.click(screen.getByRole('button', { name: 'chairs' }));

        expect(panes().querySelector('.octane-handheld-shop__menu')).not.toBeNull();
        expect(panes().querySelector('.octane-handheld-shop__page')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'chairs' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('textbox', { name: 'search' })).toBeInTheDocument();
    });

    it('wraps a layout that is not the default grid in the AIR catalogue and gives it the strip', () => {
        render(<Shop />);

        fireEvent.click(tab('furni'));
        fireEvent.click(screen.getByRole('button', { name: 'chairs' }));

        expect(screen.getByTestId('page').closest('.octane-catalog-window.octane-handheld-shop__air')).not.toBeNull();
        expect(document.querySelectorAll('.octane-handheld-shop__strip')).toHaveLength(1);
    });

    it('leaves the strip to the default page, which carries it in its product panel', () => {
        render(<Shop layoutCode="default_3x3" />);

        fireEvent.click(tab('furni'));
        fireEvent.click(screen.getByRole('button', { name: 'chairs' }));

        expect(screen.getByTestId('page').closest('.octane-catalog-window')).toBeNull();
        expect(document.querySelector('.octane-handheld-shop__strip')).toBeNull();
    });

    it('does not jump to the page the catalogue opens by itself, but follows one opened from elsewhere', () => {
        render(<Shop />);

        // The store's first page on opening (resolvePendingRequest).
        act(() => useCatalogStore.getState().activateNode(chairs));

        expect(panes()).toHaveAttribute('data-step', 'menu');
        expect(tab('furni')).toHaveAttribute('aria-selected', 'true');

        // A link or "buy more" opening a page while the catalogue is open.
        act(() => useCatalogStore.getState().activateNode(modern));

        expect(panes()).toHaveAttribute('data-step', 'page');
        expect(screen.getByRole('button', { name: 'Back to tables' })).toBeInTheDocument();
    });

    it('lists the whole tree without tabs for the Builders Club warehouse, and closes with the header button', () => {
        render(<Shop useTabs={false} />);

        expect(screen.queryAllByRole('tab')).toHaveLength(0);
        expect(rows()).toEqual(['front', 'furni']);

        fireEvent.click(screen.getByRole('button', { name: 'furni' }));

        expect(rows()).toEqual(['Shop', 'chairs', 'tables']);

        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close') as HTMLElement);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
