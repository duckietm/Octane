/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async () => ({
    ...(await vi.importActual<typeof import('../../../../api/wired/WiredActionDelay')>('../../../../api/wired/WiredActionDelay')),
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../api/utils/localizeWithFallback', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', () => ({
    Slider: ({ value }: { value: number }) => <span data-testid="slider">{value}</span>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../common/Tooltip', () => ({ Hint: ({ children }: PropsWithChildren) => <>{children}</> }));

import { WiredActionDelaySection } from './WiredActionDelaySection';

describe('WiredActionDelaySection number input', () => {
    afterEach(cleanup);

    const renderDelay = (value: number) => {
        const onChange = vi.fn();

        render(<WiredActionDelaySection value={value} onChange={onChange} />);

        return { onChange, input: screen.getByRole('textbox') as HTMLInputElement };
    };

    it('takes a standard delay in half seconds', () => {
        const { onChange, input } = renderDelay(4);

        expect(input.value).toBe('2');
        fireEvent.change(input, { target: { value: '3,5' } });
        expect(onChange).toHaveBeenLastCalledWith(7);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('refuses a time between two steps instead of rounding it', () => {
        const { onChange, input } = renderDelay(4);

        fireEvent.change(input, { target: { value: '2.3' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(input).toHaveClass('is-invalid');
        expect(screen.getByRole('alert')).toHaveTextContent('Number is invalid');
    });

    it('says the range instead of clamping a delay that is too long', () => {
        const { onChange, input } = renderDelay(4);

        fireEvent.change(input, { target: { value: '61' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent('Number needs to be between 0 and 60');
    });

    it('takes a precise delay in 0.05 s steps, sent as negative milliseconds', () => {
        const { onChange, input } = renderDelay(-100);

        fireEvent.change(input, { target: { value: '0.15' } });
        expect(onChange).toHaveBeenLastCalledWith(-150);
    });

    it('keeps only digits and the decimal point', () => {
        const { input } = renderDelay(0);

        fireEvent.change(input, { target: { value: '1a-' } });
        expect(input.value).toBe('1');
    });
});
