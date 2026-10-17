/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchFilterOptions } from '../../../../api';
import { NavigatorFilterChipsView } from './NavigatorFilterChipsView';

describe('NavigatorFilterChipsView', () => {
    afterEach(() => cleanup());

    it('lists every search filter and reports the index of the picked one', () => {
        const onChange = vi.fn();

        render(<NavigatorFilterChipsView value={0} onChange={onChange} />);

        const trigger = screen.getByRole('combobox');

        expect(trigger.classList.contains('octane-navigator-air__filter-button')).toBe(true);

        fireEvent.click(trigger);

        const options = screen.getAllByRole('option');

        expect(options).toHaveLength(SearchFilterOptions.length);
        // The list is mounted inside the filter root so the window-scoped css applies.
        expect(options[1].closest('.octane-navigator-air__filter')).not.toBeNull();

        fireEvent.pointerDown(options[1]);
        fireEvent.click(options[1]);

        expect(onChange).toHaveBeenCalledWith(1);
    });

    it('falls back to the first filter for an out-of-range value', () => {
        const { rerender } = render(<NavigatorFilterChipsView value={0} onChange={() => undefined} />);
        const first = screen.getByRole('combobox').textContent;

        rerender(<NavigatorFilterChipsView value={99} onChange={() => undefined} />);

        expect(screen.getByRole('combobox').textContent).toBe(first);
    });
});
