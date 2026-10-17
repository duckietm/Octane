/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingSubTabs } from './HousekeepingSubTabs';

const TABS = [
    { id: 'info', label: 'Info' },
    { id: 'history', label: 'History', count: 3 },
    { id: 'quiet', label: 'Quiet', count: 0 }
];

describe('HousekeepingSubTabs', () => {
    afterEach(() => cleanup());

    it('renders a tablist with the segmented classes and the active tab', () => {
        render(<HousekeepingSubTabs active="history" compact tabs={TABS} onChange={() => undefined} />);

        const list = screen.getByRole('tablist');

        expect(list.classList.contains('hk-segmented')).toBe(true);
        expect(list.classList.contains('hk-segmented--compact')).toBe(true);
        expect(screen.getByRole('tab', { name: /History/ })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: /History/ }).classList.contains('is-active')).toBe(true);
        expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'false');
    });

    it('shows the counter only when it is above zero', () => {
        render(<HousekeepingSubTabs active="info" tabs={TABS} onChange={() => undefined} />);

        expect(screen.getByText('3').classList.contains('hk-segmented__count')).toBe(true);
        expect(screen.queryByText('0')).toBeNull();
    });

    it('reports the clicked tab id', () => {
        const onChange = vi.fn();

        render(<HousekeepingSubTabs active="info" tabs={TABS} onChange={onChange} />);
        fireEvent.click(screen.getByRole('tab', { name: /History/ }));

        expect(onChange).toHaveBeenCalledWith('history');
    });
});
