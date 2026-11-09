import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ setIntParams: vi.fn(), setStringParam: vi.fn(), save: null as null | (() => void) }));
let trigger: { stringData: string; intData: number[] } | null = null;

vi.mock('../../../../api', () => ({
    DAILY_TASK_NAME_MAX_LENGTH: 100,
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../layout', () => ({ OctaneInput: (props: Record<string, unknown>) => <input {...props} /> }));
vi.mock('../../../../hooks', () => ({ useWired: () => ({ trigger, setIntParams: mocks.setIntParams, setStringParam: mocks.setStringParam }) }));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => {
        mocks.save = save;
        return <div>{children}</div>;
    }
}));

const { WiredExtraQuestView } = await import('./WiredExtraQuestView');
const { WiredExtraQuestChainView } = await import('./WiredExtraQuestChainView');
const { WiredExtraDailyTaskView } = await import('./WiredExtraDailyTaskView');
const { readNamedCode } = await import('./WiredExtraNamedCodeVariableView');

describe('quest, quest chain and daily task variables (AIR)', () => {
    afterEach(cleanup);
    beforeEach(() => {
        mocks.setIntParams.mockClear();
        mocks.setStringParam.mockClear();
    });

    it.each([
        ['quest', WiredExtraQuestView, 'wiredfurni.params.variables.quest_name', '500'],
        ['quest chain', WiredExtraQuestChainView, 'wiredfurni.params.variables.quest_chain_name', '500'],
        ['daily task', WiredExtraDailyTaskView, 'wiredfurni.params.variables.daily_task_name', '100']
    ])('the %s saves name<TAB>code and no ints', (_name, View, codeKey, maxLength) => {
        trigger = { stringData: 'goal\tQ1', intData: [5] };
        render(<View />);

        const code = screen.getByRole('textbox', { name: codeKey });
        expect(code).toHaveValue('Q1');
        expect(code).toHaveAttribute('maxLength', maxLength);
        expect(screen.getByRole('textbox', { name: 'wiredfurni.params.variables.variable_name' })).toHaveValue('goal');

        fireEvent.change(code, { target: { value: 'Q2' } });
        act(() => mocks.save?.());
        expect(mocks.setIntParams).toHaveBeenCalledWith([]);
        expect(mocks.setStringParam).toHaveBeenCalledWith('goal\tQ2');
    });

    it('reads the task alone of the earlier daily task editor', () => {
        expect(readNamedCode('Run five laps', 100)).toEqual(['', 'Run five laps']);
        expect(readNamedCode('my goal\t1234', 100)).toEqual(['my_goal', '1234']);
    });
});
