import { CatalogPagesListEvent, MarkCatalogNewAdditionsPageOpenedComposer } from '@octane/renderer';
import { useEffect } from 'react';
import { CatalogType, GetConfigurationValue, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { CATALOG_PAGE_NEW_ADDITIONS, resolveNewAdditionsOnOpen, useCatalogNewAdditionsStore } from './catalogNewAdditionsStore';
import { useCatalogStore } from './catalogStore';
import { normalizeCatalogType } from './useCatalog.helpers';

/** AIR `HabboCatalog.isNewItemsNotificationEnabled`. */
export const isNewAdditionsNotificationEnabled = (): boolean => GetConfigurationValue<boolean>('toolbar.new_additions.notification.enabled', true);

/**
 * AIR `HabboCatalog` new additions: the normal catalogue index carries `newAdditionsAvailable`; while it is set the
 * toolbar shows the "new" label on the catalogue icon, and the next time the catalogue opens it goes to the
 * new_additions page (when it has no page of its own to open) and sends MarkCatalogNewAdditionsPageOpened.
 *
 * Octane prefetches the index at login, so the flag is known before the first open: the label lights at once and the
 * first open both opens the page and marks it, which AIR splits over the index arrival and the next open.
 *
 * Call it before the effect that resolves the default first page, so the new_additions page wins over the front page.
 */
export const useCatalogNewAdditions = (isVisible: boolean, currentType: string, indexReady: boolean): void => {
    useMessageEvent<CatalogPagesListEvent>(CatalogPagesListEvent, (event) => {
        const parser = event.getParser();

        if (!parser || normalizeCatalogType(parser.catalogType) !== CatalogType.NORMAL) return;

        useCatalogNewAdditionsStore.getState().setAvailable(!!parser.newAdditionsAvailable);
    });

    useEffect(() => {
        if (!isVisible || !indexReady || normalizeCatalogType(currentType) !== CatalogType.NORMAL) return;

        const { available, setAvailable } = useCatalogNewAdditionsStore.getState();
        const catalog = useCatalogStore.getState();
        const result = resolveNewAdditionsOnOpen({
            available,
            hasTarget: !!catalog.pendingRequest || catalog.pageId > -1 || !!catalog.pageOverride,
            notificationEnabled: isNewAdditionsNotificationEnabled(),
            openDisabled: GetConfigurationValue<boolean>('catalog.new.additions.page.open.disabled', false)
        });

        if (!result.mark) return;

        setAvailable(false);
        SendMessageComposer(new MarkCatalogNewAdditionsPageOpenedComposer());

        if (result.openNewAdditions) catalog.openPageByName(CATALOG_PAGE_NEW_ADDITIONS);
    }, [isVisible, currentType, indexReady]);
};
