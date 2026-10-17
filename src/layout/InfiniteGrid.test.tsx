import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfiniteGrid } from './InfiniteGrid';

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: () => ({
        getTotalSize: () => 700,
        getVirtualItems: () => [{ index: 0, key: 0, size: 70, start: 0 }],
        measureElement: vi.fn(),
        scrollToIndex: vi.fn()
    })
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('InfiniteGrid responsive columns', () => {
    it('excludes scrollbar padding when calculating virtualized columns', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(580);
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
        vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(800);
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            paddingLeft: '0px',
            paddingRight: '17px'
        } as CSSStyleDeclaration);

        const { container } = render(
            <InfiniteGrid
                classicScrollbar
                columnCount={6}
                estimateSize={70}
                itemMinWidth={53}
                items={Array.from({ length: 100 }, (_, index) => index + 1)}
                itemRender={(item) => <span>{item}</span>}
            />
        );

        await waitFor(() => {
            const firstRow = container.querySelector<HTMLElement>('[data-index="0"]');

            expect(firstRow?.children).toHaveLength(9);
            expect(firstRow?.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(53px, 1fr))');
        });
    });

});

describe('InfiniteGrid.Item', () => {
    it('is a native button that reports its active state as pressed', () => {
        const { rerender } = render(
            <InfiniteGrid.Item aria-label="item" itemActive={false}>
                x
            </InfiniteGrid.Item>
        );

        const item = screen.getByRole('button', { name: 'item' });

        expect(item.tagName).toBe('BUTTON');
        expect(item).toHaveAttribute('type', 'button');
        expect(item).toHaveAttribute('aria-pressed', 'false');
        expect(item.className).toContain('border-card-grid-item-border');

        rerender(
            <InfiniteGrid.Item aria-label="item" itemActive>
                x
            </InfiniteGrid.Item>
        );

        expect(screen.getByRole('button', { name: 'item' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'item' }).className).toContain('border-card-grid-item-active');
    });

    it('keeps the click, mouse and data props, the ref and the count badge', () => {
        const onClick = vi.fn();
        const onDoubleClick = vi.fn();
        const ref = { current: null as HTMLButtonElement | null };

        render(
            <InfiniteGrid.Item aria-label="item" className="extra" data-slot="a" itemCount={3} ref={ref} onClick={onClick} onDoubleClick={onDoubleClick}>
                <img alt="" src="" />
            </InfiniteGrid.Item>
        );

        const item = screen.getByRole('button', { name: 'item' });

        fireEvent.click(item);
        fireEvent.doubleClick(item);

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onDoubleClick).toHaveBeenCalledTimes(1);
        expect(ref.current).toBe(item);
        expect(item).toHaveAttribute('data-slot', 'a');
        expect(item.className).toContain('extra');
        expect(item).toHaveTextContent('3');
    });
});
