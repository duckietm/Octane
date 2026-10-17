/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToggleButton } from './ToggleButton';

const Demo = ({ onClick }: { onClick?: () => void }) => {
    const [on, setOn] = useState(false);

    return (
        <ToggleButton
            aria-label="Zoom"
            pressed={on}
            onClick={() => {
                setOn((value) => !value);
                onClick?.();
            }}
        />
    );
};

describe('ToggleButton', () => {
    afterEach(() => cleanup());

    it('is a button whose pressed state follows the `pressed` prop', () => {
        render(<Demo />);

        const button = screen.getByRole('button', { name: 'Zoom' });

        expect(button.tagName).toBe('BUTTON');
        expect(button.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(button);

        expect(button.getAttribute('aria-pressed')).toBe('true');
        expect(button.hasAttribute('data-pressed')).toBe(true);
    });

    it('keeps firing onClick, even on the already pressed item of a pick-one set', () => {
        const onClick = vi.fn();

        render(<ToggleButton aria-label="Model" pressed onClick={onClick} />);
        fireEvent.click(screen.getByRole('button', { name: 'Model' }));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Model' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('does not fire when disabled', () => {
        const onClick = vi.fn();

        render(<ToggleButton disabled aria-label="Locked" pressed={false} onClick={onClick} />);
        fireEvent.click(screen.getByRole('button', { name: 'Locked' }));

        expect(onClick).not.toHaveBeenCalled();
    });
});
