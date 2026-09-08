import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;

vi.mock('../../../../api', () => ({
    FriendlyTime: { format: (seconds: number) => `${seconds}s` },
    LocalizeText: (key: string, _params: string[], values: string[]) => `${key}:${values[0]}`,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: ({ value }: { value: number }) => <input aria-label="slider" type="range" readOnly value={value} />
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

import { WiredTriggerExecuteOnceLongView } from './WiredTriggerExecuteOnceLongView';

describe('WiredTriggerExecuteOnceLongView', () => {
    beforeEach(() => {
        setIntParams.mockClear();
    });

    afterEach(cleanup);

    it('sends the step count back and shows it as seconds times five', () => {
        trigger = { intData: [12], stringData: '' };
        render(<WiredTriggerExecuteOnceLongView />);

        expect(screen.getByText('wiredfurni.params.setlongtime:60s')).toBeTruthy();
        fireEvent.click(screen.getByText('Save'));

        expect(setIntParams).toHaveBeenCalledWith([12]);
    });

    it('starts at one step when the box has never been saved', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredTriggerExecuteOnceLongView />);
        fireEvent.click(screen.getByText('Save'));

        expect(setIntParams).toHaveBeenCalledWith([1]);
    });
});
