import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';
import { WIRED_FX_CATEGORY } from '../../../../api';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
/** Our former sixteen-param order, as the official 23-int layout the box now sends and saves. */
const official = (l: number[]) => {
    const holder = l[0] === 1 ? 0 : 1;
    const word = (value: number) => (value < 0 ? -1 : 0);

    return [holder, l[1], l[2], 0, 0, l[3], l[4], l[5], l[6], 0, word(l[8]), l[8], word(l[9]), l[9], l[10], l[11], l[12] === 1 ? -10 : holder, l[13] === 1 ? -10 : holder, word(l[14]), l[14], l[7], l[15], 0];
};

let trigger: { stringData: string; intData: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useWiredTools: () => ({
        userVariableDefinitions: [{ itemId: 300, name: 'max_hp', availability: 0, hasValue: true }],
        furniVariableDefinitions: [],
        roomVariableDefinitions: [{ itemId: 500, name: 'boss_max', availability: 0, hasValue: true }]
    })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: (props: { entries: { token: string; children?: { token: string }[] }[]; selectedToken: string; onSelect: (entry: { token: string }) => void; recentScope: string }) => (
        <div data-testid={`picker-${props.recentScope}`} data-selected={props.selectedToken}>
            {props.entries.flatMap((entry) => (entry.children?.length ? entry.children : [entry])).map((entry) => (
                <button key={entry.token} type="button" onClick={() => props.onSelect(entry)}>
                    {entry.token}
                </button>
            ))}
        </div>
    )
}));

import { WiredExtraVariableFxView } from './WiredExtraVariableFxView';

describe('WiredExtraVariableFxView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
        trigger = { stringData: '', intData: [] };
    });

    it('saves the defaults as the official params and four empty tokens', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);

        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith(official([0, 2, 0, 3000, 0, -1, 2, 0, 0, 100, 0, 0, 0, 0, 0, 0]));
        expect(setStringParam).toHaveBeenCalledWith('\t\t\t');
    });

    it('shows what the box stored and writes edits back in wire order', () => {
        trigger = { stringData: 'custom:300\t\t\t', intData: official([0, 1, 1, 2500, 1, 3, 3, 4, 10, 250, 1, 0, 0, 0, 0, 0]) };

        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);

        expect((screen.getByTestId('fx-min') as HTMLInputElement).value).toBe('10');
        expect((screen.getByTestId('fx-max') as HTMLInputElement).value).toBe('250');
        expect((screen.getByTestId('fx-segments') as HTMLInputElement).value).toBe('4');
        expect(screen.getByTestId('picker-variable-fx-override-min').getAttribute('data-selected')).toBe('custom:300');

        fireEvent.change(screen.getByTestId('fx-max'), { target: { value: '300' } });
        fireEvent.change(screen.getByTestId('fx-show-duration'), { target: { value: '99999' } });
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith(official([0, 1, 1, 20000, 1, 3, 3, 4, 10, 300, 1, 0, 0, 0, 0, 0]));
        expect(setStringParam).toHaveBeenCalledWith('custom:300\t\t\t');
    });

    it('refuses a maximum that is not above the minimum, except where there is no range', () => {
        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.HEALTH_POINTS} />);

        fireEvent.change(screen.getByTestId('fx-max'), { target: { value: '0' } });

        let valid = true;
        act(() => {
            valid = baseProps.validate();
        });
        expect(valid).toBe(false);
        expect(screen.getByText('The maximum has to be above the minimum.')).toBeTruthy();
        cleanup();

        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.NUMBER_DISPLAY} />);

        expect(screen.queryByTestId('fx-max')).toBeNull();
        expect(baseProps.validate()).toBe(true);
    });

    it('offers only user-made variables for the audience and the room ones for a room-wide override', () => {
        trigger = { stringData: '', intData: official([0, 4, 0, 3000, 0, -1, 2, 0, 0, 100, 0, 1, 0, 1, 0, 0]) };

        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.STATUS_BAR} />);

        const audience = screen.getByTestId('picker-variable-fx-audience');
        expect(audience.textContent).toBe('custom:300');
        fireEvent.click(audience.querySelector('button'));
        fireEvent.change(screen.getByTestId('fx-audience-value'), { target: { value: '5' } });

        const overrideMax = screen.getByTestId('picker-variable-fx-override-max');
        expect(overrideMax.textContent).toBe('custom:500');
        fireEvent.click(overrideMax.querySelector('button'));

        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith(official([0, 4, 0, 3000, 0, -1, 2, 0, 0, 100, 0, 1, 0, 1, 5, 0]));
        expect(setStringParam).toHaveBeenCalledWith('\tcustom:500\tcustom:300\t');
    });

    it('only shows the icon picker where the server reads one', () => {
        const { unmount } = render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.BOSS_BAR} />);
        selectOption(screen.getByTestId('fx-icon'), 'misc skull');
        baseProps.save();
        expect(setStringParam).toHaveBeenCalledWith('\t\t\tmisc_skull');
        unmount();

        render(<WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />);
        expect(screen.queryByTestId('fx-icon')).toBeNull();
    });
});
