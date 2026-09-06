import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useWiredTools: () => ({
        userVariableDefinitions: [],
        furniVariableDefinitions: [],
        roomVariableDefinitions: [],
        contextVariableDefinitions: []
    })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: () => <div data-testid="variable-picker" />
}));

vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [],
    createFallbackVariableEntry: () => null,
    flattenWiredVariablePickerEntries: () => [],
    getCustomVariableItemId: () => 0,
    normalizeVariableTokenFromWire: (token: string) => token
}));

vi.mock('./WiredTriggerBaseView', () => ({
    WiredTriggerBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => (
        <div>
            {children}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredTriggerVariableChangedView } from './WiredTriggerVariableChangedView';

const originBoxes = () => [
    screen.getByRole('checkbox', { name: 'A wired box in this room' }),
    screen.getByRole('checkbox', { name: 'The web API' }),
    screen.getByRole('checkbox', { name: 'The creator tools' })
];

describe('WiredTriggerVariableChangedView origin filter', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
    });

    it('listens to every origin for a box saved before the filter existed', () => {
        trigger = { intData: [0, 1, 1, 1, 1, 1, 1], stringData: 'custom:score' };

        render(<WiredTriggerVariableChangedView />);

        for (const box of originBoxes()) expect(box).toBeChecked();
    });

    it('reads the saved mask back into the three boxes', () => {
        trigger = { intData: [0, 1, 1, 1, 1, 1, 1, 0b0101], stringData: 'custom:score' };

        render(<WiredTriggerVariableChangedView />);

        const [wired, api, tools] = originBoxes();
        expect(wired).toBeChecked();
        expect(api).not.toBeChecked();
        expect(tools).toBeChecked();
    });

    it('saves -1 while every origin is ticked and the mask once one is not', () => {
        trigger = { intData: [0, 1, 1, 1, 1, 1, 1], stringData: 'custom:score' };

        render(<WiredTriggerVariableChangedView />);

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams.mock.calls[0][0]).toHaveLength(8);
        expect(setIntParams.mock.calls[0][0][7]).toBe(-1);

        fireEvent.click(screen.getByRole('checkbox', { name: 'The web API' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(setIntParams.mock.calls[1][0][7]).toBe(0b101);
    });
});
