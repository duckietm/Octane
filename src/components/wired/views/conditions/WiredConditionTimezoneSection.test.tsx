import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;
let configuredZones = 'UTC, Europe/Amsterdam, America/New_York';
let roomZone = 'Europe/Amsterdam';

vi.mock('../../../../api', async () => {
    const { buildTimezoneOptions } = await vi.importActual<typeof import('../../../../api/wired/WiredTimezones')>('../../../../api/wired/WiredTimezones');

    return {
        buildTimezoneOptions,
        GetConfigurationValue: () => configuredZones,
        LocalizeText: (key: string) => key,
        localizeWithFallback: (key: string, fallback: string) => fallback,
        WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
    };
});

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useRoom: () => ({ roomSession: { hotelTimeZone: 'UTC' } }),
    useWiredTools: () => ({ roomSettings: { timezone: roomZone } })
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

import { WiredConditionMatchDateView } from './WiredConditionMatchDateView';
import { WiredConditionMatchTimeView } from './WiredConditionMatchTimeView';

const save = () => fireEvent.click(screen.getByText('Save'));
const zoneSelect = () => screen.getByRole('combobox', { name: 'Timezone' });

describe.each([
    ['time matches', WiredConditionMatchTimeView, [0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['date matches', WiredConditionMatchDateView, [0, 0, 0, 1, 1, 0, 0, 0]]
])('%s timezone', (_name, View, ints) => {
    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        configuredZones = 'UTC, Europe/Amsterdam, America/New_York';
        roomZone = 'Europe/Amsterdam';
    });

    afterEach(cleanup);

    it('opens a box without a zone on the room timezone and saves it as the string', () => {
        trigger = { intData: ints, stringData: '' };
        render(<View />);

        expect(screen.getByText('wiredfurni.params.time.timezone_selection')).toBeTruthy();
        expect(zoneSelect()).toHaveTextContent('Europe/Amsterdam');
        save();
        expect(setStringParam).toHaveBeenLastCalledWith('Europe/Amsterdam');
    });

    it('keeps a saved zone and saves a picked one', () => {
        trigger = { intData: ints, stringData: 'America/New_York' };
        render(<View />);

        expect(zoneSelect()).toHaveTextContent('America/New_York');
        selectOption(zoneSelect(), 'UTC');
        save();
        expect(setStringParam).toHaveBeenLastCalledWith('UTC');
    });

    it('hides the section when there is one zone to pick', () => {
        configuredZones = 'UTC';
        roomZone = 'UTC';
        trigger = { intData: ints, stringData: '' };
        render(<View />);

        expect(screen.queryByText('wiredfurni.params.time.timezone_selection')).toBeNull();
        save();
        expect(setStringParam).toHaveBeenLastCalledWith('UTC');
    });
});

describe('date matches masks', () => {
    beforeEach(() => setIntParams.mockClear());
    afterEach(cleanup);

    it.each([
        ['every box', [0, 0, 127, 1, 1, 4095, 0, 0]],
        ['no box', [0, 0, 0, 1, 1, 0, 0, 0]],
        ['some boxes', [0, 0, 5, 1, 1, 2049, 0, 0]]
    ])('sends %s back as AIR does', (_name, ints) => {
        trigger = { intData: ints, stringData: '' };
        render(<WiredConditionMatchDateView />);

        save();
        expect(setIntParams).toHaveBeenLastCalledWith(ints);
    });
});
