/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../../common', () => ({
    Slider: ({ value }: { value: number }) => <span data-testid="slider">{value}</span>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

import { PULSES_TO_SECONDS, SECONDS_TO_PULSES, WiredSliderSection } from './WiredSliderSection';

describe('WiredSliderSection number input', () => {
    afterEach(cleanup);

    const renderPulses = (onChange = vi.fn()) => {
        render(<WiredSliderSection title="Time" value={4} min={1} max={120} toDisplay={PULSES_TO_SECONDS} fromDisplay={SECONDS_TO_PULSES} onChange={onChange} />);

        return { onChange, input: screen.getByRole('textbox') as HTMLInputElement };
    };

    it('moves the slider as soon as a valid number is typed', () => {
        const { onChange, input } = renderPulses();

        expect(input.value).toBe('2');
        fireEvent.change(input, { target: { value: '2.5' } });
        expect(onChange).toHaveBeenCalledWith(5);
        expect(input).not.toHaveClass('is-invalid');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('shows the range warning instead of clamping a number out of range', () => {
        const { onChange, input } = renderPulses();

        fireEvent.change(input, { target: { value: '99' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('99');
        expect(input).toHaveClass('is-invalid');
        expect(screen.getByRole('alert')).toHaveTextContent('Number needs to be between 0.5 and 60');
    });

    it('shows the invalid warning for a number between two steps', () => {
        const { onChange, input } = renderPulses();

        fireEvent.change(input, { target: { value: '2.3' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent('Number is invalid');
    });
});
