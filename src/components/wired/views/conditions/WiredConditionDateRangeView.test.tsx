import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;

vi.mock('../../../../api', async () => {
    const { WiredDateToString } = await vi.importActual<typeof import('../../../../api/wired/WiredDateToString')>('../../../../api/wired/WiredDateToString');

    return {
        LocalizeText: (key: string) => key,
        WiredDateToString,
        WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
    };
});

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
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

import { dateRangeParams, WiredConditionDateRangeView } from './WiredConditionDateRangeView';

const seconds = (year: number, month: number, day: number, hours: number, minutes: number) => Math.floor(new Date(year, month - 1, day, hours, minutes).getTime() / 1000);
const start = () => screen.getByRole('textbox', { name: 'wiredfurni.params.startdate' });
const end = () => screen.getByRole('textbox', { name: 'wiredfurni.params.enddate' });

describe('WiredConditionDateRangeView', () => {
    beforeEach(() => setIntParams.mockClear());
    afterEach(cleanup);

    it('sends [], [start] or [start, end] as AIR does', () => {
        expect(dateRangeParams('', '2027/01/02 10:30')).toEqual([]);
        expect(dateRangeParams('garbage', '')).toEqual([]);
        expect(dateRangeParams('2027/01/02 10:30', '')).toEqual([seconds(2027, 1, 2, 10, 30)]);
        expect(dateRangeParams('2027/01/02 10:30', '2027/02/03 11:45')).toEqual([seconds(2027, 1, 2, 10, 30), seconds(2027, 2, 3, 11, 45)]);
    });

    it('opens a fresh box empty with the official placeholder and saves []', () => {
        trigger = { intData: [0, 0], stringData: '' };
        render(<WiredConditionDateRangeView />);

        expect(start()).toHaveValue('');
        expect(end()).toHaveValue('');
        expect(start()).toHaveAttribute('placeholder', 'YYYY/MM/DD HH:MM');
        expect(start()).toHaveAttribute('maxLength', '1000');
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([]);
    });

    it('shows a saved start alone and keeps the end empty', () => {
        const startSeconds = seconds(2027, 1, 2, 10, 30);
        trigger = { intData: [startSeconds], stringData: '' };
        render(<WiredConditionDateRangeView />);

        expect(start()).toHaveValue('2027/01/02 10:30');
        expect(end()).toHaveValue('');
        fireEvent.change(end(), { target: { value: '2027/01/03 00:00' } });
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([startSeconds, seconds(2027, 1, 3, 0, 0)]);
    });
});
