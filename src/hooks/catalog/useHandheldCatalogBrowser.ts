import { useCallback, useEffect, useRef, useState } from 'react';
import { ICatalogNode } from '../../api/catalog/ICatalogNode';
import {
    catalogListOf,
    catalogListUpTarget,
    catalogRowOpensList,
    catalogTabOf,
    HandheldCatalogStep,
    resolveHandheldCatalogFollow,
    visibleCatalogChildren
} from '../../api/handheld/handheldCatalogBrowse';
import { useCatalogStore } from './catalogStore';

export interface HandheldCatalogBrowser {
    step: HandheldCatalogStep;
    /** The tab on screen (a top-level page); null without tabs. */
    tabNode: ICatalogNode | null;
    /** The folder whose pages the list shows: a tab or a folder under it; the root of the tree without tabs. */
    listNode: ICatalogNode | null;
    /** The folder one level up (where the list's back row goes), null at the top. */
    upNode: ICatalogNode | null;
    /** A tab was tapped: its list of pages comes on screen (its page, for a tab without sub pages). */
    openTab: (node: ICatalogNode) => void;
    /** A row was tapped: a folder opens its list, a page opens itself. */
    openRow: (node: ICatalogNode) => void;
    /** Opens the listed folder's own page. */
    openListPage: () => void;
    /** Back from the page to its list, or from a list one level up. */
    goBack: () => void;
    /** Shows the page that is open now (the search results after a search). */
    showPage: () => void;
}

/**
 * The state of the phone catalogue: which tab and which list of pages are shown and, upright, whether the list or
 * the page is on screen. It lives as long as the catalogue component, so closing and reopening the catalogue (for
 * example after placing an item from it) comes back to the same spot. A page opened from outside the catalogue (a
 * link, "buy more", a deep link while closed) is followed to; the first page the catalogue picks by itself is not,
 * so the catalogue starts at its list. `tabs` is off for the Builders Club warehouse, whose tree has no tab row.
 */
export const useHandheldCatalogBrowser = (rootNode: ICatalogNode | null, tabs = false): HandheldCatalogBrowser => {
    const isVisible = useCatalogStore((state) => state.isVisible);
    const activeNodes = useCatalogStore((state) => state.activeNodes);
    const searchResult = useCatalogStore((state) => state.searchResult);
    const [step, setStep] = useState<HandheldCatalogStep>('menu');
    const [listNode, setListNode] = useState<ICatalogNode | null>(null);
    const ownActivationRef = useRef(false);
    const ignoreAutomaticRef = useRef(false);
    const previousSearchRef = useRef(searchResult);
    const wasVisibleRef = useRef(false);

    // The first opening with nothing asked for: the store opens the first tab's first page by itself.
    useEffect(() => {
        if (isVisible && !wasVisibleRef.current) {
            const state = useCatalogStore.getState();

            ignoreAutomaticRef.current = state.pageId === -1 && !state.pendingRequest;
        }

        wasVisibleRef.current = isVisible;
    }, [isVisible]);

    // Another catalogue tree (normal / Builders Club, a new index) starts again at its top.
    useEffect(() => {
        setListNode(null);
        setStep('menu');
    }, [rootNode]);

    useEffect(() => {
        const searchJustEnded = !!previousSearchRef.current && !searchResult;

        previousSearchRef.current = searchResult;

        const leaf = activeNodes?.length ? activeNodes[activeNodes.length - 1] : null;
        const follow = resolveHandheldCatalogFollow({
            leaf,
            ownActivation: ownActivationRef.current,
            ignoreAutomatic: ignoreAutomaticRef.current,
            searchJustEnded
        });

        if (leaf) ownActivationRef.current = false;

        if (follow === 'consume-automatic') {
            ignoreAutomaticRef.current = false;
            return;
        }

        if (follow !== 'follow') return;

        ignoreAutomaticRef.current = false;
        setListNode(catalogListOf(leaf, rootNode, tabs));
        setStep('page');
    }, [activeNodes, searchResult, rootNode, tabs]);

    const activate = useCallback((node: ICatalogNode) => {
        ownActivationRef.current = true;
        ignoreAutomaticRef.current = false;
        useCatalogStore.getState().activateNode(node);
    }, []);

    const openTab = useCallback(
        (node: ICatalogNode) => {
            if (!node) return;

            const store = useCatalogStore.getState();

            // The tab ends the search and opens itself, not the page open before the search.
            if (store.searchResult) store.endCatalogSearch(false);

            // The tab's first page loads behind its list, so the page beside the list (on its side) is never another tab's.
            if (catalogTabOf(store.activeNodes?.[store.activeNodes.length - 1] ?? null, rootNode) !== node) activate(node);

            setListNode(node);
            setStep(catalogRowOpensList(node) ? 'menu' : 'page');
        },
        [activate, rootNode]
    );

    const openRow = useCallback(
        (node: ICatalogNode) => {
            if (!node) return;

            if (catalogRowOpensList(node) && node !== listNode) {
                setListNode(node);
                return;
            }

            activate(node);
            setListNode(catalogListOf(node, rootNode, tabs));
            setStep('page');
        },
        [activate, listNode, rootNode, tabs]
    );

    // Without a list chosen: the tab of the open page, or the first tab; the whole tree without tabs.
    const activeLeaf = activeNodes?.length ? activeNodes[activeNodes.length - 1] : null;
    const firstTab = tabs ? (catalogTabOf(activeLeaf, rootNode) ?? visibleCatalogChildren(rootNode)[0] ?? null) : null;
    const shownList = listNode ?? firstTab ?? rootNode;
    const tabNode = tabs ? catalogTabOf(shownList, rootNode) : null;

    const openListPage = useCallback(() => {
        if (!shownList || shownList === rootNode) return;

        activate(shownList);
        setStep('page');
    }, [activate, shownList, rootNode]);

    const upNode = catalogListUpTarget(shownList, rootNode, tabs);

    const goBack = useCallback(() => {
        if (step === 'page') {
            setStep('menu');
            return;
        }

        if (upNode) setListNode(upNode === rootNode ? null : upNode);
    }, [step, upNode, rootNode]);

    const showPage = useCallback(() => setStep('page'), []);

    return { step, tabNode, listNode: shownList, upNode, openTab, openRow, openListPage, goBack, showPage };
};
