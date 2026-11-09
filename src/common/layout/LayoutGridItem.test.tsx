import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayoutGridItem } from './LayoutGridItem';

afterEach(cleanup);

describe('LayoutGridItem', () => {
    it('is a native toggle button when it is clickable', () => {
        const onClick = vi.fn();

        render(<LayoutGridItem itemActive aria-label="item" onClick={onClick} />);

        const item = screen.getByRole('button', { name: 'item' });

        expect(item.tagName).toBe('BUTTON');
        expect(item).toHaveAttribute('type', 'button');
        expect(item).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(item);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('takes a real disabled state when it is a button', () => {
        const onClick = vi.fn();

        render(<LayoutGridItem disabled aria-label="item" onClick={onClick} />);

        const item = screen.getByRole('button', { name: 'item' });

        expect(item).toBeDisabled();
        expect(item).toHaveClass('disabled');

        fireEvent.click(item);

        expect(onClick).not.toHaveBeenCalled();
    });

    it('stays a div when nothing listens to it', () => {
        render(<LayoutGridItem aria-label="item" />);

        expect(screen.queryByRole('button')).toBeNull();
        expect(document.querySelector('.layout-grid-item')?.tagName).toBe('DIV');
    });

    it('keeps the role and selection the caller sets instead of aria-pressed', () => {
        render(<LayoutGridItem aria-selected aria-label="item" role="option" onClick={() => undefined} />);

        const item = screen.getByRole('option', { name: 'item' });

        expect(item.tagName).toBe('BUTTON');
        expect(item).toHaveAttribute('aria-selected', 'true');
        expect(item).not.toHaveAttribute('aria-pressed');
    });

    it('renders a div when asked to, so it can hold its own buttons', () => {
        render(
            <LayoutGridItem component="div" onClick={() => undefined}>
                <button type="button">inner</button>
            </LayoutGridItem>
        );

        expect(document.querySelector('.layout-grid-item')?.tagName).toBe('DIV');
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });
});
