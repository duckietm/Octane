/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogStudioProblemsHistoryPanel } from './CatalogStudioProblemsHistoryPanel';
import { CatalogStudioTransferPanel } from './CatalogStudioTransferPanel';
import { useCatalogStudio } from './useCatalogStudio';

vi.mock('./useCatalogStudio', () => ({ useCatalogStudio: vi.fn() }));

const studio = {
    loading: false,
    documentResult: null,
    dryRunDocument: vi.fn(),
    applyDocument: vi.fn(),
    exportDocument: vi.fn()
};

const historyGroup = {
    id: 1,
    summary: 'Updated Furni',
    revision: 7,
    actorId: 5,
    actorName: 'Admin',
    source: 'UI',
    createdAt: '2026-08-12T20:00:00Z',
    entries: []
};

describe('Catalog Studio essential panels', () => {
    afterEach(cleanup);

    beforeEach(() => {
        Object.values(studio).forEach(value => typeof value === 'function' && value.mockClear());
        vi.mocked(useCatalogStudio).mockReturnValue(studio as any);
    });

    it('uses SQL as the only catalog transfer format', () => {
        render(<CatalogStudioTransferPanel />);
        fireEvent.change(screen.getByLabelText('SQL catalog document'), { target: { value: 'UPDATE catalog_pages SET caption = \'Shop\' WHERE id = 1;' } });
        fireEvent.click(screen.getByText('Validate and dry-run'));

        expect(studio.dryRunDocument).toHaveBeenCalledWith('SQL', "UPDATE catalog_pages SET caption = 'Shop' WHERE id = 1;");
        expect(screen.queryByLabelText('Transfer format')).not.toBeInTheDocument();
    });

    it('offers SQL file import and download controls', () => {
        render(<CatalogStudioTransferPanel />);

        expect(screen.getByLabelText('Import catalog SQL file')).toHaveAttribute('accept', '.sql,application/sql,text/plain');
        expect(screen.getByRole('button', { name: 'Download full catalog' })).toBeEnabled();
    });

    it('shows live history and requires confirmation before undoing one operation', () => {
        const undo = vi.fn();
        render(<CatalogStudioProblemsHistoryPanel
            issues={[]}
            history={[ historyGroup ]}
            loading={false}
            undo={undo}
        />);

        expect(screen.getByText('Updated Furni')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Undo Updated Furni' }));
        expect(screen.getByText('Undo “Updated Furni”?')).toBeInTheDocument();
        expect(undo).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Undo operation' }));
        expect(undo).toHaveBeenCalledWith(1);
    });

    it('shows the exact fields that the SQL dry-run would change', () => {
        vi.mocked(useCatalogStudio).mockReturnValue({
            ...studio,
            documentResult: {
                operationId: 'dry-1', success: true, code: 'DRY_RUN_READY', message: 'Dry-run ready',
                revision: 7, format: 'SQL', document: '', fingerprint: 'abc', changedEntities: 1,
                changes: [ {
                    entityType: 'PAGE', catalogType: 'NORMAL', entityId: 17,
                    operation: 'UPDATE', fields: [ 'caption', 'visible' ]
                } ]
            }
        } as any);

        render(<CatalogStudioTransferPanel />);

        expect(screen.getByText('UPDATE PAGE #17')).toBeInTheDocument();
        expect(screen.getByText('NORMAL · caption, visible')).toBeInTheDocument();
    });

    it('shows current live problems with their exact entity and field', () => {
        render(<CatalogStudioProblemsHistoryPanel
            issues={[ {
                code: 'OFFER_PAGE_MISSING', entityType: 'OFFER', entityId: 77,
                field: 'pageId', message: 'Offer page 999 does not exist'
            } ]}
            history={[]}
            loading={false}
            undo={vi.fn()}
        />);

        // The rule heads the group; the entity and field sit in the row beneath it.
        expect(screen.getByText('Offer page 999 does not exist')).toBeInTheDocument();
        expect(screen.getByText('OFFER #77')).toBeInTheDocument();
        expect(screen.getByText('pageId · Offer page 999 does not exist')).toBeInTheDocument();
        expect(screen.queryByText(/publish/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/draft/i)).not.toBeInTheDocument();
    });
});
