import {
    FurniEditorBySpriteComposer,
    FurniEditorDeleteComposer,
    FurniEditorDetailComposer,
    FurniEditorDetailResultEvent,
    FurniEditorImportTextComposer,
    FurniEditorImportTextResultEvent,
    FurniEditorInteractionsComposer,
    FurniEditorInteractionsResultEvent,
    FurniEditorResultEvent,
    FurniEditorRevertFurnidataComposer,
    FurniEditorSearchComposer,
    FurniEditorSearchResultEvent,
    FurniEditorUpdateComposer,
    FurniEditorUpdateFurnidataComposer
} from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { NotificationAlertType, SendMessageComposer } from '../../api';
import { useMessageEvent, useNotification } from '../../hooks';

export interface FurniItem {
    id: number;
    spriteId: number;
    itemName: string;
    publicName: string;
    type: string;
    width: number;
    length: number;
    stackHeight: number;
    allowStack: boolean;
    allowWalk: boolean;
    allowSit: boolean;
    allowLay: boolean;
    interactionType: string;
    interactionModesCount: number;
}

export interface FurniDetail extends FurniItem {
    allowGift: boolean;
    allowTrade: boolean;
    allowRecycle: boolean;
    allowMarketplaceSell: boolean;
    allowInventoryStack: boolean;
    vendingIds: string;
    customparams: string;
    effectIdMale: number;
    effectIdFemale: number;
    clothingOnWalk: string;
    multiheight: string;
    description: string;
    usageCount: number;
}

export interface CatalogRef {
    id: number;
    catalogName: string;
    costCredits: number;
    costPoints: number;
    pointsType: number;
    pageId: number;
    pageName: string;
}

export const useFurniEditor = () => {
    const [items, setItems] = useState<FurniItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<FurniDetail | null>(null);
    const [catalogItems, setCatalogItems] = useState<CatalogRef[]>([]);
    const [interactions, setInteractions] = useState<string[]>([]);
    const [furniDataEntry, setFurniDataEntry] = useState<Record<string, unknown> | null>(null);
    const [furniDataDiagnostic, setFurniDataDiagnostic] = useState<Record<string, unknown> | null>(null);
    const pendingActionRef = useRef<{ action: string; itemId: number } | null>(null);
    const [importResult, setImportResult] = useState<{ found: boolean; name: string; description: string; classname: string; nonce: number } | null>(null);
    const importNonceRef = useRef(0);
    const { simpleAlert = null } = useNotification();

    const clearError = useCallback(() => setError(null), []);

    // Handle search results
    useMessageEvent(FurniEditorSearchResultEvent, (event: FurniEditorSearchResultEvent) => {
        const parser = event.getParser();

        setLoading(false);
        setItems(
            parser.items.map((item) => ({
                id: item.id,
                spriteId: item.spriteId,
                itemName: item.itemName,
                publicName: item.publicName,
                type: item.type,
                width: item.width,
                length: item.length,
                stackHeight: item.stackHeight,
                allowStack: item.allowStack,
                allowWalk: item.allowWalk,
                allowSit: item.allowSit,
                allowLay: item.allowLay,
                interactionType: item.interactionType,
                interactionModesCount: item.interactionModesCount
            }))
        );
        setTotal(parser.total);
        setPage(parser.page);
    });

    // Handle detail results (for both detail and by-sprite lookups)
    useMessageEvent(FurniEditorDetailResultEvent, (event: FurniEditorDetailResultEvent) => {
        const parser = event.getParser();
        const item = parser.item;

        setLoading(false);
        setSelectedItem({
            id: item.id,
            spriteId: item.spriteId,
            itemName: item.itemName,
            publicName: item.publicName,
            type: item.type,
            width: item.width,
            length: item.length,
            stackHeight: item.stackHeight,
            allowStack: item.allowStack,
            allowWalk: item.allowWalk,
            allowSit: item.allowSit,
            allowLay: item.allowLay,
            interactionType: item.interactionType,
            interactionModesCount: item.interactionModesCount,
            allowGift: item.allowGift,
            allowTrade: item.allowTrade,
            allowRecycle: item.allowRecycle,
            allowMarketplaceSell: item.allowMarketplaceSell,
            allowInventoryStack: item.allowInventoryStack,
            vendingIds: item.vendingIds,
            customparams: item.customparams,
            effectIdMale: item.effectIdMale,
            effectIdFemale: item.effectIdFemale,
            clothingOnWalk: item.clothingOnWalk,
            multiheight: item.multiheight,
            description: item.description,
            usageCount: item.usageCount
        });
        setCatalogItems(
            parser.catalogItems.map((ref) => ({
                id: ref.id,
                catalogName: ref.catalogName,
                costCredits: ref.costCredits,
                costPoints: ref.costPoints,
                pointsType: ref.pointsType,
                pageId: ref.pageId,
                pageName: ref.pageName
            }))
        );

        let furniData: Record<string, unknown> | null = null;

        try {
            if (parser.furniDataJson && parser.furniDataJson !== '{}' && parser.furniDataJson !== '') {
                furniData = JSON.parse(parser.furniDataJson);
            }
        } catch (e) {}

        setFurniDataEntry(furniData);

        let diagnostic: Record<string, unknown> | null = null;

        try {
            if (parser.furniDataDiagnosticJson && parser.furniDataDiagnosticJson !== '{}' && parser.furniDataDiagnosticJson !== '') {
                diagnostic = JSON.parse(parser.furniDataDiagnosticJson);
            }
        } catch (e) {}

        setFurniDataDiagnostic(diagnostic);
    });

    // Handle interaction types list
    useMessageEvent(FurniEditorInteractionsResultEvent, (event: FurniEditorInteractionsResultEvent) => {
        setInteractions(event.getParser().interactions);
    });

    // Handle operation results (update, create, delete)
    useMessageEvent(FurniEditorResultEvent, (event: FurniEditorResultEvent) => {
        const parser = event.getParser();
        const pending = pendingActionRef.current;
        const action = pending?.action ?? null;
        const actionItemId = pending?.itemId ?? null;

        pendingActionRef.current = null;
        setLoading(false);

        if (!parser.success) {
            setError(parser.message || 'Operation failed');

            // updateFurnidata applies an optimistic publicName change before the
            // server replies. On failure (e.g. a sprite-id collision when creating
            // an entry for a variant furni) re-fetch the detail so the UI reverts
            // to the true state instead of showing the name that was never applied.
            if (actionItemId) {
                SendMessageComposer(new FurniEditorDetailComposer(actionItemId));
            }

            if (simpleAlert) {
                simpleAlert(parser.message || 'Operation failed', NotificationAlertType.ALERT, null, null, 'Furni Editor Error');
            }

            return;
        }

        setError(null);

        if (action === 'update') {
            // Auto-reload detail after update using the ID from the original request
            if (actionItemId) {
                SendMessageComposer(new FurniEditorDetailComposer(actionItemId));
            }

            if (simpleAlert) {
                simpleAlert('Item updated successfully', NotificationAlertType.DEFAULT, null, null, 'Furni Editor');
            }
        } else if (action === 'delete') {
            setSelectedItem(null);
            setCatalogItems([]);
            setFurniDataEntry(null);
            setFurniDataDiagnostic(null);

            if (simpleAlert) {
                simpleAlert('Item deleted successfully', NotificationAlertType.DEFAULT, null, null, 'Furni Editor');
            }
        }
    });

    const searchItems = useCallback((query: string, type: string, pg: number, sortField: string = 'id', sortDir: string = 'asc') => {
        setLoading(true);
        setError(null);
        SendMessageComposer(new FurniEditorSearchComposer(query, type, pg, sortField, sortDir));
    }, []);

    const loadDetail = useCallback((id: number) => {
        setLoading(true);
        setError(null);
        SendMessageComposer(new FurniEditorDetailComposer(id));
    }, []);

    const loadBySpriteId = useCallback((spriteId: number) => {
        setLoading(true);
        setError(null);
        SendMessageComposer(new FurniEditorBySpriteComposer(spriteId));
    }, []);

    const updateItem = useCallback((id: number, fields: Record<string, unknown>) => {
        setLoading(true);
        setError(null);
        pendingActionRef.current = { action: 'update', itemId: id };
        SendMessageComposer(new FurniEditorUpdateComposer(id, JSON.stringify(fields)));
    }, []);

    const deleteItem = useCallback((id: number) => {
        setLoading(true);
        setError(null);
        pendingActionRef.current = { action: 'delete', itemId: id };
        SendMessageComposer(new FurniEditorDeleteComposer(id));
    }, []);

    const updateFurnidata = useCallback((id: number, name: string, description: string) => {
        pendingActionRef.current = { action: 'update', itemId: id };
        // Optimistic: the server now mirrors the furnidata display name into
        // items_base.public_name, so reflect it immediately in the read-only
        // "Public Name" field. The auto re-fetch that follows will agree (no flicker).
        setSelectedItem((prev) => (prev && prev.id === id ? { ...prev, publicName: name } : prev));
        setLoading(true);
        SendMessageComposer(new FurniEditorUpdateFurnidataComposer(id, JSON.stringify({ name, description })));
    }, []);

    const revertFurnidata = useCallback((id: number) => {
        pendingActionRef.current = { action: 'update', itemId: id };
        setLoading(true);
        SendMessageComposer(new FurniEditorRevertFurnidataComposer(id));
    }, []);

    // Fill an empty items_base.public_name from the furnidata display name. Reuses
    // the generic item update (a partial { publicName } payload is accepted), so the
    // existing 'update' result path shows the toast and re-fetches the detail.
    const syncPublicName = useCallback((id: number, name: string) => {
        setLoading(true);
        setError(null);
        pendingActionRef.current = { action: 'update', itemId: id };
        SendMessageComposer(new FurniEditorUpdateComposer(id, JSON.stringify({ publicName: name })));
    }, []);

    const importText = useCallback((id: number) => {
        setLoading(true);
        setError(null);
        SendMessageComposer(new FurniEditorImportTextComposer(id));
    }, []);

    useMessageEvent(FurniEditorImportTextResultEvent, (event: FurniEditorImportTextResultEvent) => {
        const parser = event.getParser();

        setLoading(false);
        importNonceRef.current += 1;
        setImportResult({
            found: parser.found,
            name: parser.name,
            description: parser.description,
            classname: parser.classname,
            nonce: importNonceRef.current
        });
    });

    const loadInteractions = useCallback(() => {
        SendMessageComposer(new FurniEditorInteractionsComposer());
    }, []);

    return {
        items,
        total,
        page,
        loading,
        error,
        clearError,
        selectedItem,
        setSelectedItem,
        catalogItems,
        furniDataEntry,
        furniDataDiagnostic,
        interactions,
        searchItems,
        loadDetail,
        loadBySpriteId,
        updateItem,
        deleteItem,
        loadInteractions,
        updateFurnidata,
        revertFurnidata,
        syncPublicName,
        importText,
        importResult
    };
};
