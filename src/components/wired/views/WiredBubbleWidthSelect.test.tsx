import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => fallback
}));

vi.mock('../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

import { WIRED_BUBBLE_WIDTH_OPTIONS, WiredBubbleWidthSelect } from './WiredBubbleWidthSelect';

describe('WiredBubbleWidthSelect', () => {
    afterEach(cleanup);

    it('offers the room setting and the three official widths, in the official order', () => {
        expect(WIRED_BUBBLE_WIDTH_OPTIONS).toEqual([-1, 0, 1, 2]);

        render(<WiredBubbleWidthSelect value={-1} onChange={vi.fn()} />);

        const select = screen.getByRole('combobox', { name: 'Bubble width' });
        expect(Array.from(select.querySelectorAll('option')).map((option) => option.textContent)).toEqual(['Room setting', 'Wide', 'Normal', 'Thin']);
    });

    it('hands the chosen width to the window as a number', () => {
        const onChange = vi.fn();

        render(<WiredBubbleWidthSelect value={-1} onChange={onChange} />);

        fireEvent.change(screen.getByRole('combobox', { name: 'Bubble width' }), { target: { value: '2' } });

        expect(onChange).toHaveBeenCalledWith(2);
    });
});
