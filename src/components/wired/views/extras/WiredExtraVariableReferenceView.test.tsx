import { act, cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const mocks = vi.hoisted(() => ({
    setIntParams: vi.fn(),
    setStringParam: vi.fn(),
    setVariableIds: vi.fn(),
    save: null as null | (() => void)
}));

const variable = (variableId: string, variableName: string) => ({ variableId, variableName, variableTarget: 1, hasValue: true });
let trigger: Record<string, unknown> | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input aria-label="name" {...props} />
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams: mocks.setIntParams, setStringParam: mocks.setStringParam, setVariableIds: mocks.setVariableIds })
}));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => {
        mocks.save = save;
        return <div>{children}</div>;
    }
}));

const { WiredExtraVariableReferenceView, readReferenceEditor } = await import('./WiredExtraVariableReferenceView');

const shared = {
    type: 4,
    sharedVariables: [
        { roomId: 2, roomName: 'Zoo', variable: variable('user:9', 'coins') },
        { roomId: 3, roomName: 'Arena', variable: variable('room:11', 'round') },
        { roomId: 3, roomName: 'Arena', variable: variable('user:12', 'kills') }
    ]
};

describe('WiredExtraVariableReferenceView (AIR ReferenceVariable)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        mocks.setIntParams.mockClear();
        mocks.setStringParam.mockClear();
        mocks.setVariableIds.mockClear();
    });

    it('opens on the shared variable and saves [readOnly], the name and its id', () => {
        trigger = { stringData: 'my_coins', intData: [0], variableIds: ['user:9'], contexts: [shared] };
        render(<WiredExtraVariableReferenceView />);

        act(() => mocks.save?.());
        expect(mocks.setIntParams).toHaveBeenCalledWith([0]);
        expect(mocks.setStringParam).toHaveBeenCalledWith('my_coins');
        expect(mocks.setVariableIds).toHaveBeenCalledWith(['user:9']);
    });

    it('names itself after the chosen variable while empty', () => {
        trigger = { stringData: '', intData: [1], variableIds: [], contexts: [shared] };
        render(<WiredExtraVariableReferenceView />);

        selectOption(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.room_selection.tooltip' }), 'Arena');
        selectOption(screen.getByRole('combobox', { name: 'wiredfurni.params.variables.variable_selection.tooltip' }), 'kills');

        act(() => mocks.save?.());
        expect(mocks.setStringParam).toHaveBeenCalledWith('kills');
        expect(mocks.setVariableIds).toHaveBeenCalledWith(['user:12']);
        expect(mocks.setIntParams).toHaveBeenCalledWith([1]);
    });

    it('reads the JSON string of the earlier editor', () => {
        const state = readReferenceEditor({ stringData: '{"variableName":"g","sourceRoomId":3,"sourceVariableItemId":11,"sourceTargetType":3,"readOnly":false}' });

        expect(state).toMatchObject({ name: 'g', readOnly: false, variableId: 'room:11' });
    });
});
