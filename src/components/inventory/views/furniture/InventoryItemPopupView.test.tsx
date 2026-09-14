import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({}));

vi.mock('../../../../common', () => ({
    LayoutLimitedEditionCompactPlateView: (props: { uniqueNumber: number; uniqueSeries: number }) => (
        <div data-testid="ltd-plate">
            {props.uniqueNumber}/{props.uniqueSeries}
        </div>
    )
}));

import { ITEM_POPUP_CLOSE_DELAY_MS, ITEM_POPUP_WIDTH, resolveItemPopupLeft, resolveItemPopupSide, useInventoryItemPopup } from './InventoryItemPopupView';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const makeGroupItem = (name: string, uniqueNumber = 0) =>
    ({
        name,
        iconUrl: `https://example.test/${name}.png`,
        stuffData: { uniqueNumber, uniqueSeries: uniqueNumber > 0 ? 500 : 0 }
    }) as never;

const Harness = ({ items }: { items: ReturnType<typeof makeGroupItem>[] }) => {
    const { getAnchorProps, popup } = useInventoryItemPopup();

    return (
        <div>
            {items.map((item, index) => (
                <div key={index} data-testid={`thumb-${index}`} {...getAnchorProps(item)} />
            ))}
            {popup}
        </div>
    );
};

describe('item popup placement', () => {
    const anchor = { top: 100, left: 300, width: 40, height: 40 };

    it('hangs off the right edge with a 5px overlap and moves left at the screen edge', () => {
        expect(resolveItemPopupSide(anchor, 1024)).toBe('right');
        expect(resolveItemPopupLeft(anchor, 'right')).toBe(335);

        expect(resolveItemPopupSide(anchor, 500)).toBe('left');
        expect(resolveItemPopupLeft(anchor, 'left')).toBe(305 - ITEM_POPUP_WIDTH);
    });
});

describe('useInventoryItemPopup', () => {
    it('shows the hovered item at once and hides it after the close delay', () => {
        vi.useFakeTimers();

        render(<Harness items={[makeGroupItem('Sofa'), makeGroupItem('Lamp', 12)]} />);

        expect(screen.queryByTestId('inventory-item-popup')).not.toBeInTheDocument();

        fireEvent.mouseEnter(screen.getByTestId('thumb-0'));

        expect(screen.getByTestId('inventory-item-popup')).toHaveTextContent('Sofa');
        expect(screen.queryByTestId('ltd-plate')).not.toBeInTheDocument();

        fireEvent.mouseLeave(screen.getByTestId('thumb-0'));

        // Still visible while the close delay runs, so moving between thumbs does not flicker.
        expect(screen.getByTestId('inventory-item-popup')).toBeInTheDocument();

        fireEvent.mouseEnter(screen.getByTestId('thumb-1'));

        expect(screen.getByTestId('inventory-item-popup')).toHaveTextContent('Lamp');
        expect(screen.getByTestId('ltd-plate')).toHaveTextContent('12/500');

        fireEvent.mouseLeave(screen.getByTestId('thumb-1'));

        act(() => {
            vi.advanceTimersByTime(ITEM_POPUP_CLOSE_DELAY_MS);
        });

        expect(screen.queryByTestId('inventory-item-popup')).not.toBeInTheDocument();
    });
});
