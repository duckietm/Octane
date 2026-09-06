import { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { FaDownload, FaFileImport, FaUpload } from 'react-icons/fa';
import { useCatalogStudio } from './useCatalogStudio';

const CATALOG_FILE_NAME = 'catalog-studio.sql';

const downloadDocument = (document: string) => {
    const url = URL.createObjectURL(new Blob([ document ], { type: 'application/sql;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = CATALOG_FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
};

export const CatalogStudioTransferPanel: FC = () => {
    const studio = useCatalogStudio();
    const [document, setDocument] = useState('');
    const downloadPending = useRef(false);
    const result = studio.documentResult?.format === 'SQL' ? studio.documentResult : null;

    useEffect(() => {
        if (result?.code !== 'EXPORTED' || !result.document) return;

        setDocument(result.document);
        if (downloadPending.current) {
            downloadPending.current = false;
            downloadDocument(result.document);
        }
    }, [result?.operationId]);

    const importFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => setDocument(String(reader.result ?? '')));
        reader.readAsText(file);
    };

    const requestDownload = () => {
        downloadPending.current = true;
        studio.exportDocument('SQL');
    };

    return <div className="octane-catalog-admin-import-export">
        <div className="octane-catalog-admin-section-head">
            <div>
                <strong>Import or export the full catalog</strong>
                <span>Pages and offers travel together in one validated SQL file. Statements are parsed safely and never executed directly.</span>
            </div>
        </div>
        <div className="octane-catalog-admin-import-toolbar">
            <label className="octane-catalog-admin-btn" htmlFor="catalog-studio-file-import">
                <FaFileImport /> Import file
            </label>
            <input
                id="catalog-studio-file-import"
                className="d-none"
                type="file"
                accept=".sql,application/sql,text/plain"
                aria-label="Import catalog SQL file"
                onChange={importFile}
            />
            <button className="octane-catalog-admin-btn" disabled={studio.loading} onClick={requestDownload}>
                <FaDownload /> Download full catalog
            </button>
            <button
                className="octane-catalog-admin-btn"
                disabled={studio.loading || !document.trim()}
                onClick={() => studio.dryRunDocument('SQL', document)}
            >
                Validate and dry-run
            </button>
            <button
                className="octane-catalog-admin-btn is-publish"
                disabled={studio.loading || result?.code !== 'DRY_RUN_READY' || result.changedEntities === 0}
                onClick={() => result && studio.applyDocument('SQL', document, result.fingerprint, 'Import catalog SQL file')}
            >
                <FaUpload /> Apply {result?.changedEntities ?? 0} changes
            </button>
        </div>
        <textarea
            value={document}
            onChange={event => setDocument(event.target.value)}
            spellCheck={false}
            aria-label="SQL catalog document"
            placeholder="Import a .sql file or paste a complete catalog export here."
        />
        {result && <div role="status" className={`octane-catalog-admin-publish-status ${result.success ? 'is-ready' : 'is-blocked'}`}>
            {result.message} &middot; {result.changedEntities} change(s)
        </div>}
        {!!result?.changes.length && <div className="octane-catalog-admin-validation-list" aria-label="SQL field diff">
            <div className="octane-catalog-admin-publish-changes-head">Dry-run field diff</div>
            {result.changes.map(change => <div
                className="octane-catalog-admin-history-row"
                key={`${change.catalogType}-${change.entityType}-${change.entityId}-${change.operation}`}
            >
                <div className="octane-catalog-admin-history-main">
                    <strong>{change.operation} {change.entityType} #{change.entityId}</strong>
                    <span>{change.catalogType} &middot; {change.fields.length ? change.fields.join(', ') : 'no field changes'}</span>
                </div>
            </div>)}
        </div>}
    </div>;
};
