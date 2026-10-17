/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInventoryBadges } from '../../../../../hooks';
import { InfoStandBadgeSlotView } from './InfoStandBadgeSlotView';

vi.mock('../../../../../hooks', () => ({
    useInventoryBadges: vi.fn()
}));

vi.mock('../../../../../common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../common')>()),
    LayoutBadgeImageView: (props: { badgeCode: string }) => <i data-testid={`badge-${props.badgeCode}`} />
}));

describe('InfoStandBadgeSlotView picker', () => {
    const setBadgeAtSlot = vi.fn();

    beforeEach(() => {
        setBadgeAtSlot.mockClear();
        vi.mocked(useInventoryBadges).mockReturnValue({
            badgeCodes: ['AAA', 'BBB', 'CCC'],
            activeBadgeCodes: ['AAA', null, null, null, null],
            setBadgeAtSlot,
            swapBadges: vi.fn(),
            removeBadge: vi.fn(),
            requestBadges: vi.fn()
        } as unknown as ReturnType<typeof useInventoryBadges>);
    });

    afterEach(cleanup);

    it('opens the picker from an empty own slot, hides the worn badges and places the pick', async () => {
        const { container } = render(<InfoStandBadgeSlotView isOwnUser slotIndex={1} />);

        expect(screen.queryByRole('textbox')).toBeNull();

        fireEvent.click(container.querySelector('.octane-infostand__badge-slot') as HTMLElement);

        await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());
        expect(screen.queryByTestId('badge-AAA')).toBeNull();

        fireEvent.click(screen.getByTestId('badge-BBB'));

        expect(setBadgeAtSlot).toHaveBeenCalledWith('BBB', 1);
        await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    });

    it('filters by the search text and closes on Escape', async () => {
        const { container } = render(<InfoStandBadgeSlotView isOwnUser slotIndex={1} />);

        fireEvent.click(container.querySelector('.octane-infostand__badge-slot') as HTMLElement);

        const input = await screen.findByRole('textbox');

        fireEvent.change(input, { target: { value: 'cc' } });

        expect(screen.queryByTestId('badge-BBB')).toBeNull();
        expect(screen.getByTestId('badge-CCC')).toBeInTheDocument();

        fireEvent.keyDown(input, { key: 'Escape' });

        await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    });

    it('does not open for another user', () => {
        const { container } = render(<InfoStandBadgeSlotView isOwnUser={false} slotIndex={1} />);

        fireEvent.click(container.querySelector('.octane-infostand__badge-slot') as HTMLElement);

        expect(screen.queryByRole('textbox')).toBeNull();
    });
});
