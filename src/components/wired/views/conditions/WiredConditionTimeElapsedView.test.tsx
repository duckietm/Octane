import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;

vi.mock('../../../../api', () => ({
    GetWiredTimeLocale: (value: number) => String(value / 2),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: ({ value }: { value: number }) => <input aria-label="slider" type="range" readOnly value={value} />
}));

vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => (
        <div>
            {children}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredConditionTimeElapsedLessView } from './WiredConditionTimeElapsedLessView';
import { WiredConditionTimeElapsedMoreView } from './WiredConditionTimeElapsedMoreView';

const save = () => fireEvent.click(screen.getByText('Save'));

describe.each([
    ['more', WiredConditionTimeElapsedMoreView, 'wiredfurni.params.allowafter2'],
    ['less', WiredConditionTimeElapsedLessView, 'wiredfurni.params.allowbefore2']
])('time elapsed %s', (_name, View, title) => {
    beforeEach(() => setIntParams.mockClear());
    afterEach(cleanup);

    it('reads the slider as the param minus one and saves it plus one', () => {
        trigger = { intData: [21], stringData: '' };
        render(<View />);

        expect(screen.getByText(title)).toBeTruthy();
        expect(screen.getByLabelText('slider')).toHaveValue('20');
        // The header number shows the seconds (20 pulses = 10 s).
        expect(screen.getByRole('textbox')).toHaveValue('10');
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([21]);
    });

    it('defaults to one pulse and takes a typed number of seconds', () => {
        trigger = { intData: [], stringData: '' };
        render(<View />);

        expect(screen.getByLabelText('slider')).toHaveValue('1');
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([2]);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '3' } });
        save();
        expect(setIntParams).toHaveBeenLastCalledWith([7]);
    });
});
