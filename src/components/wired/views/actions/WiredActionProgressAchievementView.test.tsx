import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let enabledWiredAchievements: string[] = [];
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes }),
    useAchievements: () => ({ enabledWiredAchievements })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('../WiredValueOrVariableSection', () => ({
    normalizeWiredValueTarget: (value: number) => value,
    variableTokenFromId: (text: string) => (parseInt(text, 10) > 0 ? `custom:${text}` : ''),
    WiredValueOrVariableSection: (props: { isVariable: boolean; value: string; onValueChange: (value: string) => void; onIsVariableChange: (value: boolean) => void; onTokenChange: (token: string) => void }) => (
        <div>
            <input type="number" value={props.value} onChange={(event) => props.onValueChange(event.target.value)} />
            <button onClick={() => { props.onIsVariableChange(true); props.onTokenChange('custom:42'); }}>use variable</button>
        </div>
    )
}));

vi.mock('../WiredVariablePickerData', () => ({
    getCustomVariableItemId: (token: string) => (token.startsWith('custom:') ? parseInt(token.slice(7), 10) : 0)
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { clampProgressAmount, WiredActionProgressAchievementView } from './WiredActionProgressAchievementView';

describe('WiredActionProgressAchievementView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setSourceTypes.mockClear();
        baseProps = null;
        enabledWiredAchievements = [];
    });

    it('explains the enabler when the room offers no achievement and refuses to save', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionProgressAchievementView />);

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.getByText(/achievement enabler/)).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
    });

    it('offers the room achievements and saves the name, the mode, the amount and the user source', () => {
        enabledWiredAchievements = ['ACH_Game', 'ACH_Race'];
        trigger = { stringData: 'ACH_Game\t0', intData: [1, 0, 3, 0], userSourceTypes: [200, 0], furniSourceTypes: [0] };
        render(<WiredActionProgressAchievementView />);

        const select = screen.getByRole('combobox');
        expect(select).toHaveTextContent('ACH_Game');
        selectOption(select, 'ACH_Race');
        fireEvent.click(screen.getAllByRole('radio')[1]);
        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5000000' } });
        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('ACH_Race\t0');
        expect(setIntParams).toHaveBeenCalledWith([0, 0, 1_000_000, 0]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [0], users: [200, 0] });
    });

    it('saves the amount variable after the name', () => {
        enabledWiredAchievements = ['ACH_Game'];
        trigger = { stringData: 'ACH_Game', intData: [1, 0, 1, 0] };
        render(<WiredActionProgressAchievementView />);

        fireEvent.click(screen.getByText('use variable'));
        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('ACH_Game\t42');
        expect(setIntParams).toHaveBeenCalledWith([1, 1, 1, 0]);
    });

    it('keeps a stored name the room no longer lists so the box can be read back', () => {
        enabledWiredAchievements = ['ACH_Race'];
        trigger = { stringData: 'ACH_Old', intData: [1, 0, 1, 0] };
        render(<WiredActionProgressAchievementView />);

        expect(screen.getByRole('combobox')).toHaveTextContent('ACH_Old');
        expect(baseProps.validate()).toBe(true);
    });

    it('clamps the amount to what the server accepts', () => {
        expect(clampProgressAmount(-4)).toBe(1);
        expect(clampProgressAmount(Number.NaN)).toBe(1);
        expect(clampProgressAmount(2.9)).toBe(2);
        expect(clampProgressAmount(9_999_999)).toBe(1_000_000);
    });
});
