/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    trigger: { isFilter: true, isInvert: false } as { isFilter: boolean; isInvert: boolean },
    setSelectorOptions: vi.fn()
}));

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) =>
        ({
            'wiredfurni.params.selector_options_selector': 'Selector options',
            'wiredfurni.params.selector_option.0': 'Filter',
            'wiredfurni.params.selector_option.1': 'Invert'
        })[key] ?? key
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger: mocks.trigger, setSelectorOptions: mocks.setSelectorOptions })
}));

import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';

describe('WiredSelectorOptionsSection', () => {
    afterEach(() => {
        cleanup();
        mocks.setSelectorOptions.mockClear();
    });

    it('shows the saved filter / invert and hands them to the save', () => {
        render(<WiredSelectorOptionsSection />);

        expect(screen.getByText('Selector options')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Filter' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('checkbox', { name: 'Invert' })).toHaveAttribute('aria-checked', 'false');
        expect(mocks.setSelectorOptions).toHaveBeenLastCalledWith({ filter: true, invert: false });
    });

    it('sends every change at once, keeping the other option', () => {
        render(<WiredSelectorOptionsSection />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Invert' }));
        expect(mocks.setSelectorOptions).toHaveBeenLastCalledWith({ filter: true, invert: true });

        fireEvent.click(screen.getByRole('checkbox', { name: 'Filter' }));
        expect(mocks.setSelectorOptions).toHaveBeenLastCalledWith({ filter: false, invert: true });
    });
});
