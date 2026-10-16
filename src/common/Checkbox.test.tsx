/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

const Controlled = ({ onChange }: { onChange?: (checked: boolean) => void }) => {
    const [checked, setChecked] = useState(false);

    return (
        <label>
            <Checkbox
                checked={checked}
                onCheckedChange={(next) => {
                    setChecked(next);
                    onChange?.(next);
                }}
            />
            <span>Invert</span>
        </label>
    );
};

describe('Checkbox', () => {
    afterEach(() => cleanup());

    it('exposes role, state and the octane-checkbox skin class', () => {
        render(<Checkbox checked className="mt-0" onCheckedChange={() => undefined} />);

        const box = screen.getByRole('checkbox');

        expect(box).toBeChecked();
        expect(box.classList.contains('octane-checkbox')).toBe(true);
        expect(box.classList.contains('mt-0')).toBe(true);
        expect(box.hasAttribute('data-checked')).toBe(true);
    });

    it('reports the next boolean when clicked', () => {
        const onChange = vi.fn();

        render(<Controlled onChange={onChange} />);

        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenLastCalledWith(true);
        expect(screen.getByRole('checkbox')).toBeChecked();

        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenLastCalledWith(false);
    });

    it('toggles from a click on the wrapping label', () => {
        const onChange = vi.fn();

        render(<Controlled onChange={onChange} />);
        fireEvent.click(screen.getByText('Invert'));

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('does not toggle when disabled', () => {
        const onChange = vi.fn();

        render(<Checkbox disabled checked={false} onCheckedChange={onChange} />);
        fireEvent.click(screen.getByRole('checkbox'));

        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
    });
});
