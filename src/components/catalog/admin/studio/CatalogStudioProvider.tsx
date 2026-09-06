import {
    CatalogStudioDocumentApplyComposer,
    CatalogStudioDocumentDryRunComposer,
    CatalogStudioDocumentResultEvent,
    CatalogStudioExportComposer,
    CatalogStudioHistoryComposer,
    CatalogStudioHistoryEvent,
    CatalogStudioOpenSessionComposer,
    CatalogStudioSessionEvent,
    CatalogStudioUndoComposer,
    CatalogStudioUndoEvent,
    CatalogStudioValidateComposer,
    CatalogStudioValidationEvent
} from '@octane/renderer';
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../../api';
import { useConnectionState, useMessageEvent } from '../../../../hooks';
import { applyCatalogStudioMutation } from './CatalogStudioMutationState';
import { nextCatalogStudioOperationId } from './CatalogStudioOperationId';
import { CatalogStudioDocumentResult, CatalogStudioHistoryGroup, CatalogStudioMutationResult, CatalogStudioSession, CatalogStudioValidationState } from './CatalogStudioTypes';
import { CatalogStudioContext, CatalogStudioContextValue } from './useCatalogStudio';

export const CatalogStudioProvider: FC<{ active: boolean; children: ReactNode }> = ({ active, children }) => {
    const connectionState = useConnectionState();
    const authenticated = connectionState.authenticated;
    const [session, setSession] = useState<CatalogStudioSession | null>(null);
    const [history, setHistory] = useState<CatalogStudioHistoryGroup[]>([]);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);
    const [validation, setValidation] = useState<CatalogStudioValidationState | null>(null);
    const [documentResult, setDocumentResult] = useState<CatalogStudioDocumentResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const sessionRef = useRef<CatalogStudioSession | null>(null);
    const historyGroupIdsRef = useRef<Set<number>>(new Set());

    const replaceSession = useCallback((next: CatalogStudioSession) => {
        sessionRef.current = next;
        setSession(next);
    }, []);

    const refresh = useCallback(() => {
        if (!active || !authenticated) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioOpenSessionComposer());
    }, [active, authenticated]);

    const refreshHistory = useCallback(() => {
        const current = sessionRef.current;
        if (!current) return;
        SendMessageComposer(new CatalogStudioHistoryComposer(current.draftVersionId, 0, 50));
    }, []);

    const updateRevision = useCallback((revision: number) => {
        setSession((current) => {
            if (!current || current.revision === revision) return current;
            const next = { ...current, revision };
            sessionRef.current = next;
            return next;
        });
    }, []);

    useMessageEvent<CatalogStudioSessionEvent>(CatalogStudioSessionEvent, (event) => {
        const parser = event.getParser();
        replaceSession({
            activeVersionId: parser.activeVersionId,
            draftVersionId: parser.draftVersionId,
            revision: parser.revision,
            activeUpdatedAt: parser.activeUpdatedAt,
            draftCreatedAt: parser.draftCreatedAt,
            pendingCount: parser.pendingCount,
            actors: parser.actors.map((actor) => ({ ...actor })),
            validationCurrent: parser.validationCurrent,
            validationIssueCount: parser.validationIssueCount,
            publishedVersions: parser.publishedVersions.map((version) => ({ ...version })),
            pages: (parser.pages ?? []).map((page) => ({ ...page })),
            offers: (parser.offers ?? []).map((offer) => ({ ...offer }))
        });
        setLoading(false);
        setLastError(null);
    });

    const handleOperation = useCallback((event: CatalogStudioUndoEvent) => {
        const parser = event.getParser();
        updateRevision(parser.revision);
        setLoading(false);
        if (!parser.success) {
            setLastError(parser.message || parser.code);
            if (parser.code === 'STALE_REVISION') refresh();
            return;
        }
        setLastError(null);
        refresh();
    }, [refresh, updateRevision]);

    useMessageEvent<CatalogStudioUndoEvent>(CatalogStudioUndoEvent, (event) => {
        handleOperation(event);
        if (event.getParser().success) refreshHistory();
    });

    useMessageEvent<CatalogStudioHistoryEvent>(CatalogStudioHistoryEvent, (event) => {
        const parser = event.getParser();
        updateRevision(parser.revision);
        const nextHistory = parser.groups.map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry })) }));
        historyGroupIdsRef.current = new Set(nextHistory.map(group => group.id));
        setHistory(nextHistory);
        setHistoryTotalCount(parser.totalCount);
        setLoading(false);
    });

    useMessageEvent<CatalogStudioValidationEvent>(CatalogStudioValidationEvent, (event) => {
        const parser = event.getParser();
        const next: CatalogStudioValidationState = {
            operationId: parser.operationId,
            success: parser.success,
            code: parser.code,
            message: parser.message,
            revision: parser.revision,
            current: parser.current,
            issues: parser.issues.map((issue) => ({ ...issue })),
            receivedAt: Date.now()
        };
        setValidation(next);
        updateRevision(parser.revision);
        setLoading(false);
        setLastError(parser.success ? null : parser.message || parser.code);
    });

    useMessageEvent<CatalogStudioDocumentResultEvent>(CatalogStudioDocumentResultEvent, (event) => {
        const parser = event.getParser();
        const changes = (parser as typeof parser & { changes?: CatalogStudioDocumentResult['changes'] }).changes ?? [];
        const result: CatalogStudioDocumentResult = {
            operationId: parser.operationId,
            success: parser.success,
            code: parser.code,
            message: parser.message,
            revision: parser.revision,
            format: parser.format,
            document: parser.document,
            fingerprint: parser.fingerprint,
            changedEntities: parser.changedEntities,
            changes: changes.map(change => ({ ...change, fields: [ ...change.fields ] }))
        };
        setDocumentResult(result);
        setLoading(false);
        setLastError(result.success ? null : result.message || result.code);
        if(result.code === 'APPLIED' || result.code === 'ALREADY_APPLIED') {
            refresh();
            refreshHistory();
        }
    });

    useEffect(() => {
        if (!active || !authenticated) {
            setSession(null);
            sessionRef.current = null;
            setLoading(false);
            return;
        }
        refresh();
    }, [active, authenticated, refresh]);

    const loadHistory = useCallback((offset = 0, limit = 50) => {
        const current = sessionRef.current;
        if (!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioHistoryComposer(current.draftVersionId, offset, limit));
    }, []);

    const validate = useCallback(() => {
        const current = sessionRef.current;
        if (!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioValidateComposer(
            nextCatalogStudioOperationId('validate'), current.draftVersionId, current.revision));
    }, []);

    const undo = useCallback((groupId: number) => {
        const current = sessionRef.current;
        if (!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioUndoComposer(nextCatalogStudioOperationId('undo'), current.draftVersionId, current.revision, groupId));
    }, []);

    const exportDocument = useCallback((format: 'SQL') => {
        const current = sessionRef.current;
        if(!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioExportComposer(
            nextCatalogStudioOperationId('export'), current.draftVersionId, current.revision, format
        ));
    }, []);

    const dryRunDocument = useCallback((format: 'SQL', document: string) => {
        const current = sessionRef.current;
        if(!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioDocumentDryRunComposer(
            nextCatalogStudioOperationId('dry-run'), current.draftVersionId, current.revision, format, document
        ));
    }, []);

    const applyDocument = useCallback((format: 'SQL', document: string, fingerprint: string, summary: string) => {
        const current = sessionRef.current;
        if(!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioDocumentApplyComposer(
            nextCatalogStudioOperationId('apply'), current.draftVersionId, current.revision, '',
            format, document, fingerprint, summary
        ));
    }, []);

    const applyMutation = useCallback((mutation: CatalogStudioMutationResult) => {
        setSession(current => {
            if(!current) return current;
            const next = applyCatalogStudioMutation(current, mutation);
            sessionRef.current = next;
            return next;
        });
        if(!historyGroupIdsRef.current.has(mutation.historyGroup.id)) {
            historyGroupIdsRef.current.add(mutation.historyGroup.id);
            setHistory(current => [ mutation.historyGroup, ...current ].slice(0, 50));
            setHistoryTotalCount(current => current + 1);
        }
    }, []);

    const value = useMemo<CatalogStudioContextValue>(() => ({
        session,
        revision: session?.revision ?? 0,
        pendingCount: session?.pendingCount ?? 0,
        history,
        historyTotalCount,
        validation,
        documentResult,
        loading,
        lastError,
        refresh,
        loadHistory,
        undo,
        validate,
        exportDocument,
        dryRunDocument,
        applyDocument,
        applyMutation
    }), [session, history, historyTotalCount, validation, documentResult, loading, lastError, refresh, loadHistory, undo, validate, exportDocument, dryRunDocument, applyDocument, applyMutation]);

    return <CatalogStudioContext value={value}>{children}</CatalogStudioContext>;
};
