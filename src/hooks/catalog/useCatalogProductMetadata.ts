import {
    CatalogProductMetadataComposer,
    CatalogProductMetadataEntry,
    CatalogProductMetadataEvent
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

const METADATA_TIMEOUT_MS = 2500;
let nextRequestId = 0;

export const useCatalogProductMetadata = (pageId: number, catalogMode: string) => {
    const [entries, setEntries] = useState<CatalogProductMetadataEntry[] | null>(null);
    const activeRequestRef = useRef<string | null>(null);

    useMessageEvent<CatalogProductMetadataEvent>(CatalogProductMetadataEvent, (event) => {
        const parser = event.getParser();

        if (
            !activeRequestRef.current ||
            parser.protocolVersion !== 1 ||
            parser.requestId !== activeRequestRef.current ||
            parser.pageId !== pageId
        ) {
            return;
        }

        activeRequestRef.current = null;
        setEntries(parser.entries);
    });

    useEffect(() => {
        setEntries(null);

        if (pageId <= 0) {
            activeRequestRef.current = null;
            return;
        }

        const requestId = `catalog-metadata-${Date.now().toString(36)}-${++nextRequestId}`;
        activeRequestRef.current = requestId;
        SendMessageComposer(new CatalogProductMetadataComposer(requestId, pageId, catalogMode || 'NORMAL'));

        const timeout = setTimeout(() => {
            if (activeRequestRef.current === requestId) activeRequestRef.current = null;
        }, METADATA_TIMEOUT_MS);

        return () => {
            clearTimeout(timeout);
            if (activeRequestRef.current === requestId) activeRequestRef.current = null;
        };
    }, [catalogMode, pageId]);

    return entries;
};
