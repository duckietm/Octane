import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    setIntParams: vi.fn(),
    setStringParam: vi.fn(),
    setVariableIds: vi.fn(),
    save: null as null | (() => void),
    entries: [] as Array<{ token: string; displayLabel: string; selectable: boolean }>,
    select: null as null | ((entry: { token: string; displayLabel: string }) => void)
}));

let trigger: { intData: number[]; stringData: string; variableIds: string[] } | null = null;
const definition = (itemId: number, name: string) => ({ itemId, name, hasValue: true, availability: 0, isReadOnly: false });
const tools = {
    userVariableDefinitions: [definition(5, 'score.level')],
    furniVariableDefinitions: [definition(7, 'power.max')],
    roomVariableDefinitions: [],
    contextVariableDefinitions: []
};

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
    useWired: () => ({ trigger, setIntParams: mocks.setIntParams, setStringParam: mocks.setStringParam, setVariableIds: mocks.setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: (props: { entries: typeof mocks.entries; onSelect: (entry: { token: string; displayLabel: string }) => void }) => {
        mocks.entries = props.entries;
        mocks.select = props.onSelect;
        return null;
    }
}));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => {
        mocks.save = save;
        return <div>{children}</div>;
    }
}));

const { WiredExtraVariableEchoView, readEchoEditor, writeEchoSourceId, flatVariableName } = await import('./WiredExtraVariableEchoView');

describe('WiredExtraVariableEchoView (AIR EchoVariable)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        mocks.setIntParams.mockClear();
        mocks.setStringParam.mockClear();
        mocks.setVariableIds.mockClear();
    });

    it('offers the furni, user, global and context lists', () => {
        trigger = { intData: [], stringData: '', variableIds: [] };
        render(<WiredExtraVariableEchoView />);

        expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual(['furni', 'user', 'global', 'context']);

        fireEvent.click(screen.getByRole('radio', { name: 'context' }));
        expect(mocks.entries.find((entry) => entry.token === 'internal:@selector_user_count')?.selectable).toBe(true);
    });

    it('opens on the list of the box variable it echoes and saves AIR fields', () => {
        trigger = { intData: [], stringData: 'pwr', variableIds: ['7'] };
        render(<WiredExtraVariableEchoView />);

        expect(screen.getByRole('radio', { name: 'furni' })).toHaveAttribute('aria-checked', 'true');
        mocks.save?.();
        expect(mocks.setIntParams).toHaveBeenCalledWith([]);
        expect(mocks.setStringParam).toHaveBeenCalledWith('pwr');
        // An older server's bare id opens on the list that holds it and goes back as the variable list's id.
        expect(mocks.setVariableIds).toHaveBeenCalledWith(['furni:7']);
    });

    it('names itself after the chosen variable while the name is empty', () => {
        trigger = { intData: [], stringData: '', variableIds: [] };
        render(<WiredExtraVariableEchoView />);

        fireEvent.click(screen.getByRole('radio', { name: 'context' }));
        act(() => mocks.select?.({ token: 'internal:@chat_type', displayLabel: '@chat_type' }));
        mocks.save?.();

        expect(mocks.setStringParam).toHaveBeenCalledWith('chat_type');
        // Habbo's id of @event.chat.type.
        expect(mocks.setVariableIds).toHaveBeenCalledWith(['-450']);
    });

    it('reads the JSON string of the earlier editor', () => {
        const state = readEchoEditor('{"variableName":"x","sourceTargetType":1,"sourceVariableToken":"internal:@state"}', [], {
            user: [],
            furni: [],
            global: [],
            context: []
        });

        expect(state).toEqual({ name: 'x', target: 'furni', token: 'internal:@state' });
    });

    it("writes the variable list's ids: Habbo's for a built-in, <target>:<box id> for a box's variable", () => {
        expect(writeEchoSourceId('user', 'internal:@position_x')).toBe('-230');
        expect(writeEchoSourceId('global', 'internal:@furni_count')).toBe('-300');
        expect(writeEchoSourceId('furni', 'internal:@opacity')).toBe('furni:@opacity');
        expect(writeEchoSourceId('user', 'custom:12')).toBe('user:12');
        // Earlier ids keep reading.
        expect(readEchoEditor('n', ['room:@furni_count'], { user: [], furni: [], global: [], context: [] }).target).toBe('global');
        expect(readEchoEditor('n', ['-300'], { user: [], furni: [], global: [], context: [] })).toEqual({ name: 'n', target: 'global', token: 'internal:@furni_count' });
        expect(readEchoEditor('n', ['furni:12'], { user: [], furni: [], global: [], context: [] })).toEqual({ name: 'n', target: 'furni', token: 'custom:12' });
        expect(flatVariableName('score.level')).toBe('score_level');
    });
});
