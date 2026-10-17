/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../test-utils/selectOption';
import { Select } from './Select';

const Demo = ({ onPick }: { onPick?: (value: string) => void }) => {
    const [value, setValue] = useState('b');

    return (
        <Select
            aria-label="Letter"
            className="form-select"
            value={value}
            onChange={(event) => {
                setValue(event.target.value);
                onPick?.(event.target.value);
            }}
        >
            <option value="a">Alpha</option>
            <option value="b">Beta</option>
            {[1, 2].map((n) => (
                <option key={n} value={`n${n}`}>
                    Number {n}
                </option>
            ))}
            <optgroup label="Group">
                <option value="g">Gamma</option>
            </optgroup>
        </Select>
    );
};

describe('Select', () => {
    afterEach(() => cleanup());

    it('shows the selected option label on the trigger', () => {
        render(<Demo />);

        const trigger = screen.getByRole('combobox', { name: 'Letter' });

        expect(trigger.textContent).toContain('Beta');
        expect(trigger.classList.contains('octane-select-trigger')).toBe(true);
        expect(trigger.classList.contains('form-select')).toBe(true);
    });

    it('falls back to the first option when the value matches none', () => {
        render(
            <Select aria-label="Unknown" value={-1} onChange={() => undefined}>
                <option value="0">Zero</option>
                <option value="1">One</option>
            </Select>
        );

        expect(screen.getByRole('combobox', { name: 'Unknown' }).textContent).toContain('Zero');
    });

    it('lists options, groups and mapped options once opened', () => {
        render(<Demo />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Letter' }));

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Alpha', 'Beta', 'Number 1', 'Number 2', 'Gamma']);
    });

    it('reports a native-shaped change event when an option is picked', () => {
        const onPick = vi.fn();

        render(<Demo onPick={onPick} />);
        selectOption(screen.getByRole('combobox', { name: 'Letter' }), 'Gamma');

        expect(onPick).toHaveBeenCalledWith('g');
        expect(screen.getByRole('combobox', { name: 'Letter' }).textContent).toContain('Gamma');
    });

    it('keeps its own choice, starting from defaultValue, when no value is given', () => {
        render(
            <Select aria-label="Free" defaultValue="b">
                <option value="a">Alpha</option>
                <option value="b">Beta</option>
            </Select>
        );

        const trigger = screen.getByRole('combobox', { name: 'Free' });

        expect(trigger.textContent).toContain('Beta');

        selectOption(trigger, 'Alpha');
        expect(trigger.textContent).toContain('Alpha');
    });

    it('does not open when disabled', () => {
        render(
            <Select disabled aria-label="Off" value="a" onChange={() => undefined}>
                <option value="a">Alpha</option>
            </Select>
        );
        fireEvent.click(screen.getByRole('combobox', { name: 'Off' }));

        expect(screen.queryByRole('option')).toBeNull();
    });
});
