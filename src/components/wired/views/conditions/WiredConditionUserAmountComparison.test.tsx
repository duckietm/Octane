import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: ({ value }: { value: number }) => <input aria-label="slider" type="range" readOnly value={value} />
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

import { WiredConditionTeamHasScoreView } from './WiredConditionTeamHasScoreView';

describe('the amount dialog shared by the credits, duckets, diamonds and item-count conditions', () => {
    beforeEach(() => {
        setIntParams.mockClear();
    });

    afterEach(cleanup);

    it('keeps a six-code comparison the server now honours instead of coercing it to equal', () => {
        trigger = { intData: [0, 5, 250, 0, 0], stringData: '' };
        render(<WiredConditionTeamHasScoreView scoped={false} />);
        fireEvent.click(screen.getByText('Save'));

        expect(setIntParams).toHaveBeenCalledWith([1, 5, 250, 0, 0]);
    });

    it('lets the builder pick another operator', () => {
        trigger = { intData: [0, 5, 10, 0, 0], stringData: '' };
        render(<WiredConditionTeamHasScoreView scoped={false} />);
        fireEvent.click(screen.getByText('<'));
        fireEvent.click(screen.getByText('Save'));

        expect(setIntParams).toHaveBeenCalledWith([1, 0, 10, 0, 0]);
    });

    it('an unsaved box starts at "at least", which is what the boxes always did', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredConditionTeamHasScoreView scoped={false} />);
        fireEvent.click(screen.getByText('Save'));

        expect(setIntParams).toHaveBeenCalledWith([1, 5, 0, 0, 0]);
    });
});
