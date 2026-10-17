import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTimeUtilMask, normalizeTimeUtilMode, setTimeUtilSubVariableSelected, timeUtilPartName, timeUtilTimestampName } from './timeUtilitiesParams';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;

vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => (
        <div>
            {children}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredExtraTimeUtilitiesView } from './WiredExtraTimeUtilitiesView';

describe('timeUtilitiesParams', () => {
    it('keeps only the calendar and unit bits', () => {
        expect(normalizeTimeUtilMask(-1)).toBe(0x7fe | 0x7f00000);
        expect(normalizeTimeUtilMask(1)).toBe(0);
        expect(normalizeTimeUtilMask(Number.NaN)).toBe(0);
        expect(setTimeUtilSubVariableSelected(0, 11, true)).toBe(0);
        expect(setTimeUtilSubVariableSelected(1 << 4, 4, false)).toBe(0);
    });

    it('falls back to the value mode', () => {
        expect(normalizeTimeUtilMode(2)).toBe(2);
        expect(normalizeTimeUtilMode(3)).toBe(0);
        expect(normalizeTimeUtilMode(-1)).toBe(0);
    });

    it('names a part after the mode, as the server does', () => {
        expect(timeUtilPartName(0, 'hour_of_day')).toBe('value.hour_of_day');
        expect(timeUtilPartName(1, 'year')).toBe('creation_time.year');
        expect(timeUtilPartName(2, 'milliseconds_of_seconds')).toBe('last_update_time.milliseconds_of_seconds');
    });

    it('lists the timestamp itself only in the timestamp modes', () => {
        expect(timeUtilTimestampName(0)).toBeNull();
        expect(timeUtilTimestampName(1)).toBe('creation_time');
        expect(timeUtilTimestampName(2)).toBe('last_update_time');
    });
});

describe('WiredExtraTimeUtilitiesView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        trigger = { stringData: '', intData: [(1 << 4) | (1 << 24), 1] };
    });

    it('shows the saved selection and mode', () => {
        render(<WiredExtraTimeUtilitiesView />);

        expect(screen.getByRole('radio', { name: 'Creation time' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Hour of the day' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Year' })).not.toBeChecked();
        expect(screen.getByDisplayValue('creation_time.hour_of_day')).toBeTruthy();
        expect(screen.queryByRole('checkbox', { name: 'Days' })).toBeNull();
    });

    it('saves the mask and the mode', () => {
        render(<WiredExtraTimeUtilitiesView />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Year' }));
        fireEvent.click(screen.getByRole('button', { name: /Advanced sub-variables/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Days' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Months' }));
        fireEvent.click(screen.getByRole('radio', { name: 'Last update time' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setIntParams).toHaveBeenCalledWith([(1 << 4) | (1 << 10) | (1 << 26), 2]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('shows the timestamp entry in a timestamp mode and the writable note in the value mode', () => {
        render(<WiredExtraTimeUtilitiesView />);

        expect(screen.getByDisplayValue('creation_time')).toBeTruthy();
        expect(screen.getByText('The parts of a timestamp are read-only.')).toBeTruthy();

        fireEvent.click(screen.getByRole('radio', { name: 'Variable value' }));

        expect(screen.queryByDisplayValue('creation_time')).toBeNull();
        expect(screen.getByDisplayValue('value.hour_of_day')).toBeTruthy();
        expect(screen.getByText('Writing a part moves the variable by that part.')).toBeTruthy();
    });

    it('starts a new box with nothing selected', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredExtraTimeUtilitiesView />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setIntParams).toHaveBeenCalledWith([0, 0]);
    });
});
