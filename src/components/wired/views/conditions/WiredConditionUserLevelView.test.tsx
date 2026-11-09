import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { intData: number[]; stringData: string; userSourceTypes?: number[] } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, _fallback: string, _params?: string[], values?: string[]) => `${key}:${values?.[0] ?? ''}`,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: ({ value, min, max }: { value: number; min: number; max: number }) => <input aria-label="slider" type="range" readOnly min={min} max={max} value={value} />
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div />
}));

vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: ({ children, save, footer }: PropsWithChildren<{ save: () => void; footer?: ReactNode }>) => (
        <div>
            {children}
            {footer}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredConditionUserLevelView } from './WiredConditionUserLevelView';

describe('WiredConditionUserLevelView', () => {
    beforeEach(() => {
        setIntParams.mockClear();
        setSourceTypes.mockClear();
    });

    afterEach(cleanup);

    it('shows a 1..30 slider with its number and the three official comparisons', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredConditionUserLevelView />);

        expect(screen.getByLabelText('slider')).toHaveAttribute('max', '30');
        expect(screen.getByLabelText('slider')).toHaveValue('1');
        expect(screen.getByRole('textbox')).toHaveValue('1');
        expect(screen.getByText('wiredfurni.params.level_selection:1')).toBeTruthy();
        expect(screen.getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual([
            'wiredfurni.params.comparison.0',
            'wiredfurni.params.comparison.1',
            'wiredfurni.params.comparison.2'
        ]);
        // A fresh box: level 1, "equal to".
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([1, 1]);
    });

    it('saves a typed level and the picked comparison', () => {
        trigger = { intData: [5, 0], stringData: '' };
        render(<WiredConditionUserLevelView />);

        expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true');
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '20' } });
        fireEvent.click(screen.getAllByRole('radio')[2]);
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([20, 2]);
    });
});
