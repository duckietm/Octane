/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HandheldInfoSheetView } from './HandheldInfoSheetView';

afterEach(cleanup);

describe('HandheldInfoSheetView', () => {
    it('shows the infostand content with a close button', () => {
        const onClose = vi.fn();

        render(
            <HandheldInfoSheetView onClose={onClose}>
                <p>furni details</p>
            </HandheldInfoSheetView>
        );

        expect(screen.getByText('furni details')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('offers the avatar actions when asked to', () => {
        const onActions = vi.fn();

        render(<HandheldInfoSheetView actionsOpen={false} onActions={onActions} onClose={vi.fn()} />);

        const actions = screen.getByRole('button', { name: 'Actions' });

        expect(actions).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(actions);

        expect(onActions).toHaveBeenCalledTimes(1);
    });
});
