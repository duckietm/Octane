/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../hooks', () => ({ useHousekeepingStore: () => ({ refreshAuditLog: vi.fn() }) }));
vi.mock('./HousekeepingAuditEntryDetails', () => ({
    HousekeepingAuditEntryDetails: ({ entry }: { entry: { id: number } }) => <div data-testid="details">details {entry.id}</div>
}));

import { HousekeepingHistoryView } from './HousekeepingHistoryView';

const entry = (id: number) => ({
    id,
    timestamp: Date.now() - 1000,
    actorName: `staff${id}`,
    action: 'ban',
    detail: `userId=${id}`,
    success: true,
    targetType: 'user',
    targetId: id
});

describe('HousekeepingHistoryView', () => {
    afterEach(() => cleanup());

    it('opens the detail of one entry at a time from its info button', () => {
        render(<HousekeepingHistoryView entries={[entry(1), entry(2)] as never} />);

        expect(screen.queryByTestId('details')).toBeNull();

        const [first, second] = Array.from(document.querySelectorAll<HTMLElement>('li button[aria-expanded]'));

        fireEvent.click(first);
        expect(screen.getByTestId('details').textContent).toBe('details 1');
        expect(first.getAttribute('aria-expanded')).toBe('true');

        fireEvent.click(second);
        expect(screen.getAllByTestId('details')).toHaveLength(1);
        expect(screen.getByTestId('details').textContent).toBe('details 2');
        expect(first.getAttribute('aria-expanded')).toBe('false');

        fireEvent.click(second);
        expect(screen.queryByTestId('details')).toBeNull();
    });
});
