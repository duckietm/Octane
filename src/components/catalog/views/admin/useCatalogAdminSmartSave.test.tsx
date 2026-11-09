import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';

interface FormState
{
    caption: string;
    minRank: number;
}

describe('useCatalogAdminSmartSave', () =>
{
    it('keeps edits made while a matching save is in flight', () =>
    {
        const submit = vi.fn(() => 'save-1');
        const { result, rerender } = renderHook(
            ({ acknowledgement }) => useCatalogAdminSmartSave<FormState>({
                initial: { caption: 'Original', minRank: 1 },
                acknowledgement,
                submit,
                toCommitted: value => value.entity as FormState
            }),
            { initialProps: { acknowledgement: null as any } }
        );

        act(() => result.current.patch({ caption: 'First' }));
        act(() => result.current.save());
        act(() => result.current.patch({ caption: 'Second' }));
        rerender({
            acknowledgement: {
                operationId: 'save-1', success: true, code: 'SAVED', message: 'Saved',
                entity: { caption: 'First', minRank: 2 }, fieldErrors: {}, acknowledgedAt: 100
            }
        });

        expect(result.current.draft).toEqual({ caption: 'Second', minRank: 2 });
        expect(result.current.status).toBe('dirty');
    });

    it('queues the latest draft and closes only after its acknowledgement', () =>
    {
        let sequence = 0;
        const submit = vi.fn(() => `save-${++sequence}`);
        const close = vi.fn();
        const { result, rerender } = renderHook(
            ({ acknowledgement }) => useCatalogAdminSmartSave<FormState>({
                initial: { caption: 'Original', minRank: 1 }, acknowledgement, submit, onClose: close,
                toCommitted: value => value.entity as FormState
            }),
            { initialProps: { acknowledgement: null as any } }
        );

        act(() => result.current.patch({ caption: 'First' }));
        act(() => result.current.save());
        act(() => result.current.patch({ caption: 'Second' }));
        act(() => result.current.save(true));
        expect(submit).toHaveBeenCalledTimes(1);

        rerender({ acknowledgement: {
            operationId: 'save-1', success: true, code: 'SAVED', message: 'Saved',
            entity: { caption: 'First', minRank: 1 }, fieldErrors: {}, acknowledgedAt: 100
        } });
        expect(submit).toHaveBeenCalledTimes(2);
        expect(close).not.toHaveBeenCalled();

        rerender({ acknowledgement: {
            operationId: 'save-2', success: true, code: 'SAVED', message: 'Saved',
            entity: { caption: 'Second', minRank: 1 }, fieldErrors: {}, acknowledgedAt: 200
        } });
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('exposes field errors and guards a dirty close', () =>
    {
        const confirmClose = vi.fn(() => false);
        const close = vi.fn();
        const { result, rerender } = renderHook(
            ({ acknowledgement }) => useCatalogAdminSmartSave<FormState>({
                initial: { caption: 'Original', minRank: 1 }, acknowledgement,
                submit: () => 'save-1', onClose: close, confirmClose,
                toCommitted: value => value.entity as FormState
            }),
            { initialProps: { acknowledgement: null as any } }
        );

        act(() => result.current.patch({ caption: '' }));
        act(() => result.current.requestClose());
        expect(confirmClose).toHaveBeenCalledTimes(1);
        expect(close).not.toHaveBeenCalled();

        act(() => result.current.save());
        rerender({ acknowledgement: {
            operationId: 'save-1', success: false, code: 'VALIDATION_FAILED', message: 'Invalid',
            entity: null, fieldErrors: { caption: 'Required' }, acknowledgedAt: 100
        } });
        expect(result.current.fieldErrors.caption).toBe('Required');
        expect(result.current.status).toBe('error');
    });

    it('does not submit through the keyboard when the current draft is invalid', () =>
    {
        const submit = vi.fn(() => 'save-1');
        const { result } = renderHook(() => useCatalogAdminSmartSave<FormState>({
            initial: { caption: 'Original', minRank: 1 }, acknowledgement: null, submit,
            canSubmit: draft => draft.caption.trim().length > 0,
            toCommitted: value => value.entity as FormState
        }));
        act(() => result.current.patch({ caption: '' }));
        act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })));
        expect(submit).not.toHaveBeenCalled();
    });
});
