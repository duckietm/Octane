/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Radio } from './Radio';

const Pair = ({ onPick }: { onPick?: (value: number) => void }) => {
    const [value, setValue] = useState(1);

    return (
        <div>
            <label>
                <Radio
                    checked={value === 1}
                    onCheckedChange={() => {
                        setValue(1);
                        onPick?.(1);
                    }}
                />
                <span>One</span>
            </label>
            <label>
                <Radio
                    checked={value === 2}
                    onCheckedChange={() => {
                        setValue(2);
                        onPick?.(2);
                    }}
                />
                <span>Two</span>
            </label>
        </div>
    );
};

describe('Radio', () => {
    afterEach(() => cleanup());

    it('exposes role, state and the octane-radio skin class', () => {
        render(<Radio checked className="mt-0" onCheckedChange={() => undefined} />);

        const radio = screen.getByRole('radio');

        expect(radio).toBeChecked();
        expect(radio.classList.contains('octane-radio')).toBe(true);
        expect(radio.classList.contains('mt-0')).toBe(true);
    });

    it('switches between two radios like a native group', () => {
        const onPick = vi.fn();

        render(<Pair onPick={onPick} />);

        const [one, two] = screen.getAllByRole('radio');

        expect(one).toBeChecked();
        expect(two).not.toBeChecked();

        fireEvent.click(two);

        expect(onPick).toHaveBeenLastCalledWith(2);
        expect(one).not.toBeChecked();
        expect(two).toBeChecked();
    });

    it('does not fire when the checked radio is clicked again', () => {
        const onPick = vi.fn();

        render(<Pair onPick={onPick} />);
        fireEvent.click(screen.getAllByRole('radio')[0]);

        expect(onPick).not.toHaveBeenCalled();
    });

    it('selects from a click on the wrapping label', () => {
        const onPick = vi.fn();

        render(<Pair onPick={onPick} />);
        fireEvent.click(screen.getByText('Two'));

        expect(onPick).toHaveBeenCalledWith(2);
    });

    it('does not fire when disabled', () => {
        const onChange = vi.fn();

        render(<Radio disabled checked={false} onCheckedChange={onChange} />);
        fireEvent.click(screen.getByRole('radio'));

        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('radio')).toHaveAttribute('aria-disabled', 'true');
    });
});
