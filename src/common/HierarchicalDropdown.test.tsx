import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseHierarchicalOption } from '../test-utils/chooseHierarchicalOption';
import { findHierarchicalDropdownPath, HierarchicalDropdown, IHierarchicalDropdownOption } from './HierarchicalDropdown';

const OPTIONS: IHierarchicalDropdownOption[] = [
    { label: 'None', value: '' },
    { label: 'Fish', value: 'fish' },
    {
        label: '(Christmas 2026)',
        children: [
            { label: 'Tree', value: 'xmas26.tree' },
            { label: 'Bell', value: 'xmas26.bell' }
        ]
    },
    { label: 'Coming soon' }
];

describe('HierarchicalDropdown', () => {
    afterEach(cleanup);

    it('finds the path of a value through its branch', () => {
        expect(findHierarchicalDropdownPath(OPTIONS, 'fish')?.map((option) => option.label)).toEqual(['Fish']);
        expect(findHierarchicalDropdownPath(OPTIONS, 'xmas26.bell')?.map((option) => option.label)).toEqual(['(Christmas 2026)', 'Bell']);
        expect(findHierarchicalDropdownPath(OPTIONS, 'nothing')).toBeNull();
        expect(findHierarchicalDropdownPath(OPTIONS, null)).toBeNull();
    });

    it('shows the chosen path, or the caption when nothing is chosen', () => {
        const { rerender } = render(<HierarchicalDropdown caption="Pick one" data-testid="menu" options={OPTIONS} value={null} onChange={() => {}} />);

        expect(screen.getByTestId('menu')).toHaveTextContent('Pick one');

        rerender(<HierarchicalDropdown caption="Pick one" data-testid="menu" options={OPTIONS} value="xmas26.tree" onChange={() => {}} />);
        expect(screen.getByTestId('menu')).toHaveTextContent('(Christmas 2026) > Tree');

        rerender(<HierarchicalDropdown caption="Pick one" data-testid="menu" options={OPTIONS} value="" onChange={() => {}} />);
        expect(screen.getByTestId('menu')).toHaveTextContent('None');
    });

    it('opens a column, marks the chosen row and reports a top-level choice', () => {
        const onChange = vi.fn();

        render(<HierarchicalDropdown data-testid="menu" options={OPTIONS} value="fish" onChange={onChange} />);
        fireEvent.click(screen.getByTestId('menu'));

        expect(screen.getByRole('menuitem', { name: 'Fish' })).toHaveClass('is-selected');
        expect(screen.getByRole('menuitem', { name: 'None' })).not.toHaveClass('is-selected');
        // A row that is neither a choice nor a branch cannot be picked.
        expect(screen.getByRole('menuitem', { name: 'Coming soon' })).toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(screen.getByRole('menuitem', { name: 'None' }));
        expect(onChange).toHaveBeenCalledWith('', [OPTIONS[0]]);
    });

    it('opens a branch beside its row and reports the choice with its path', () => {
        const onChange = vi.fn();

        render(<HierarchicalDropdown data-testid="menu" options={OPTIONS} value="fish" onChange={onChange} />);
        chooseHierarchicalOption(screen.getByTestId('menu'), '(Christmas 2026)', 'Bell');

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('xmas26.bell', [OPTIONS[2], OPTIONS[2].children[1]]);
    });

    it('does not open while disabled or without rows', () => {
        const { rerender } = render(<HierarchicalDropdown data-testid="menu" disabled options={OPTIONS} value={null} onChange={() => {}} />);

        expect(screen.getByTestId('menu')).toBeDisabled();

        rerender(<HierarchicalDropdown data-testid="menu" options={[]} value={null} onChange={() => {}} />);
        expect(screen.getByTestId('menu')).toBeDisabled();
    });
});
