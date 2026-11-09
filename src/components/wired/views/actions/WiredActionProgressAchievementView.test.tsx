import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let enabledWiredAchievements: string[] = [];
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, availability: 0, hasValue, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score')],
    furniVariableDefinitions: [variable(42, 'height')],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback?: string) => fallback ?? key,
    GetRoomSession: () => ({ roomId: 1 }),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => tools,
    useAchievements: () => ({ enabledWiredAchievements })
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>,
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
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
        setVariableIds.mockClear();
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
        fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), { target: { value: '5000000' } });
        baseProps.save();

        // AIR: the name as the string, the amount's variable (none here) as the variable ids.
        expect(setStringParam).toHaveBeenCalledWith('ACH_Race');
        expect(setVariableIds).toHaveBeenCalledWith([]);
        expect(setIntParams).toHaveBeenCalledWith([0, 0, 5_000_000, 0]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [0], users: [200, 0] });
    });

    it('saves the amount variable after the name', () => {
        enabledWiredAchievements = ['ACH_Game'];
        trigger = { stringData: 'ACH_Game', intData: [1, 0, 1, 0] };
        render(<WiredActionProgressAchievementView />);

        fireEvent.change(screen.getByRole('textbox', { name: 'Amount' }), { target: { value: 'Height' } });
        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('ACH_Game');
        expect(setVariableIds).toHaveBeenCalledWith(['furni:42']);
        expect(setIntParams).toHaveBeenCalledWith([1, 1, 1, 0]);
    });

    it('keeps a stored name the room no longer lists so the box can be read back', () => {
        enabledWiredAchievements = ['ACH_Race'];
        trigger = { stringData: 'ACH_Old', intData: [1, 0, 1, 0] };
        render(<WiredActionProgressAchievementView />);

        expect(screen.getByRole('combobox')).toHaveTextContent('ACH_Old');
        expect(baseProps.validate()).toBe(true);
    });

    it('offers the value holder with the type selector in the popup (AIR merged slot 0) and saves its sources', () => {
        enabledWiredAchievements = ['ACH_Game'];
        trigger = { stringData: 'ACH_Game\t5', intData: [1, 1, 1, 1], userSourceTypes: [0, 200], furniSourceTypes: [0] };
        render(<WiredActionProgressAchievementView />);

        const field = screen.getByRole('textbox', { name: 'Amount' });

        expect(field).toHaveValue('score');
        fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));
        const popup = screen.getByRole('dialog');

        expect(within(popup).getByText('wiredfurni.params.sources.merged.title.variables')).toBeTruthy();
        expect(within(popup).getByText('wiredfurni.params.sources.users.200')).toBeTruthy();
        expect(within(popup).getAllByRole('button', { name: /^wiredfurni\.params\.sourcetype\.(global|context|furni|users)$/ })).toHaveLength(4);
        expect(within(popup).queryByRole('checkbox')).toBeNull();
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([1, 1, 1, 1]);
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [0], users: [0, 200] });
    });

    it('marks a negative or unknown amount invalid (AIR range 0..int max)', () => {
        enabledWiredAchievements = ['ACH_Game'];
        trigger = { stringData: 'ACH_Game', intData: [1, 0, 1, 0] };
        render(<WiredActionProgressAchievementView />);

        const field = screen.getByRole('textbox', { name: 'Amount' });

        fireEvent.change(field, { target: { value: '-1' } });
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field, { target: { value: 'nobody' } });
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
        fireEvent.change(field, { target: { value: '0' } });
        expect(baseProps.validate()).toBe(true);
    });

    it('keeps the amount to 0..int max as AIR', () => {
        expect(clampProgressAmount(-4)).toBe(0);
        expect(clampProgressAmount(0)).toBe(0);
        expect(clampProgressAmount(Number.NaN)).toBe(0);
        expect(clampProgressAmount(2.9)).toBe(2);
        expect(clampProgressAmount(9_999_999)).toBe(9_999_999);
        expect(clampProgressAmount(99_999_999_999)).toBe(2_147_483_647);
    });
});
