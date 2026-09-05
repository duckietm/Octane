import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutoGrid } from './AutoGrid';

describe('AutoGrid responsive columns', () => {
    it('preserves the template tile width while distributing the remaining row space', () => {
        const { getByRole } = render(
            <AutoGrid aria-label="Template offers" className="octane-catalog-grid" columnCount={6} columnMinWidth={55} role="listbox" />
        );
        const grid = getByRole('listbox');

        expect(grid.style.getPropertyValue('--octane-grid-column-min-width')).toBe('55px');
        expect(grid.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(55px, 1fr))');
    });
});
