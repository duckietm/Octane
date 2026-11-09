/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../test-utils/selectOption';
import { ListSelect } from './ListSelect';

const options = [
    { value: '0', label: 'Anything' },
    { value: '1', label: 'Room name' },
    { value: '2', label: 'Owner' }
];

const Demo = ({ onPick }: { onPick?: (value: string) => void }) => {
    const [value, setValue] = useState('0');

    return (
        <ListSelect
            aria-label="Filter"
            itemClassName="row"
            options={options}
            popupClassName="menu"
            renderTrigger={(selected) => <span data-testid="shown">{selected?.label}</span>}
            triggerClassName="trigger"
            value={value}
            onValueChange={(next) => {
                setValue(next);
                onPick?.(next);
            }}
        />
    );
};

describe('ListSelect', () => {
    afterEach(() => cleanup());

    it('shows the selected option through the caller-provided trigger content', () => {
        render(<Demo />);

        const trigger = screen.getByRole('combobox', { name: 'Filter' });

        expect(trigger.classList.contains('trigger')).toBe(true);
        expect(screen.getByTestId('shown').textContent).toBe('Anything');
    });

    it('opens a list with the caller classes and picks an option', () => {
        const onPick = vi.fn();

        render(<Demo onPick={onPick} />);

        const trigger = screen.getByRole('combobox', { name: 'Filter' });

        fireEvent.click(trigger);

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Anything', 'Room name', 'Owner']);
        expect(screen.getAllByRole('option')[0].classList.contains('row')).toBe(true);
        expect(document.querySelector('.menu')).not.toBeNull();

        cleanup();
        render(<Demo onPick={onPick} />);
        selectOption(screen.getByRole('combobox', { name: 'Filter' }), 'Owner');

        expect(onPick).toHaveBeenCalledWith('2');
        expect(screen.getByTestId('shown').textContent).toBe('Owner');
    });

    it('does not open when disabled', () => {
        render(<ListSelect disabled aria-label="Off" options={options} value="0" onValueChange={() => undefined} />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Off' }));

        expect(screen.queryByRole('option')).toBeNull();
    });
});
