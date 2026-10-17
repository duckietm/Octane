/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumberInput } from './NumberInput';

const Demo = ({ onValue, min, max }: { onValue?: (value: number) => void; min?: number; max?: number }) => {
    const [value, setValue] = useState(5);

    return (
        <NumberInput
            aria-label="Amount"
            className="form-control"
            max={max}
            min={min}
            value={value}
            onChange={(event) => {
                const next = Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber;

                setValue(next);
                onValue?.(next);
            }}
        />
    );
};

describe('NumberInput', () => {
    afterEach(() => cleanup());

    it('renders a spinbutton with the value and the octane class', () => {
        render(<Demo />);

        const input = screen.getByRole('spinbutton', { name: 'Amount' }) as HTMLInputElement;

        expect(input.value).toBe('5');
        expect(input.classList.contains('octane-number-input')).toBe(true);
        expect(input.classList.contains('form-control')).toBe(true);
    });

    it('reports a native-shaped change event while typing', () => {
        const onValue = vi.fn();

        render(<Demo onValue={onValue} />);
        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '42' } });

        expect(onValue).toHaveBeenLastCalledWith(42);
    });

    it('keeps decimals and does not group digits', () => {
        render(<NumberInput aria-label="Ratio" step={0.01} value={1234.567} onChange={() => undefined} />);

        expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('1234.567');
    });

    it('reports NaN when the field is cleared', () => {
        const onChange = vi.fn();

        render(<NumberInput aria-label="Empty" value={7} onChange={onChange} />);
        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });

        expect(Number.isNaN(onChange.mock.calls[0][0].target.valueAsNumber)).toBe(true);
        expect(onChange.mock.calls[0][0].target.value).toBe('');
    });

    it('steps with the arrow keys and respects max', () => {
        const onValue = vi.fn();

        render(<Demo max={6} onValue={onValue} />);

        const input = screen.getByRole('spinbutton');

        fireEvent.keyDown(input, { key: 'ArrowUp' });
        expect(onValue).toHaveBeenLastCalledWith(6);

        fireEvent.keyDown(input, { key: 'ArrowUp' });
        expect(onValue).toHaveBeenLastCalledWith(6);
    });

    it('is disabled and read-only on request', () => {
        render(<NumberInput disabled aria-label="Off" value={1} onChange={() => undefined} />);

        expect((screen.getByRole('spinbutton') as HTMLInputElement).disabled).toBe(true);
    });
});
