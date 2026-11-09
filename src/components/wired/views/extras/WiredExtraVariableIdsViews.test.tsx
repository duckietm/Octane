import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; userSourceTypes?: number[]; furniSourceTypes?: number[]; selectedItems?: number[] } | null =
    null;
let baseProps: { save: () => void } | null = null;
const variable = (itemId: number, name: string) => ({ itemId, name, availability: 0, hasValue: true, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score')],
    furniVariableDefinitions: [variable(7, 'height')],
    roomVariableDefinitions: [variable(8, 'round')],
    contextVariableDefinitions: [variable(10, 'answer')]
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    fromOfficialVariableTarget: (official: number) => (official === 0 ? 1 : official === -20 ? 2 : official === -10 ? 3 : 0),
    toOfficialVariableTarget: (ours: number) => (ours === 1 ? 0 : ours === 2 ? -20 : ours === 3 ? -10 : 1),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: () => null
}));
vi.mock('../../../../layout', () => ({ OctaneInput: () => <input /> }));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds: [], setFurniIds, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE: { value: 11, label: 'wiredfurni.params.sources.users.11' },
    CLICKED_USER_SOURCE_VALUE: 11,
    REACHED_USER_SOURCE_VALUE: 10,
    USER_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.users.0' }],
    WiredSourcesSelector: () => null,
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: () => null }));
vi.mock('./WiredPlaceholderPreview', () => ({ WiredPlaceholderPreview: () => null }));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        baseProps = { save: props.save };
        return <div>{props.children}</div>;
    }
}));

const { WiredExtraFilterByVariableView } = await import('./WiredExtraFilterByVariableView');
const { WiredExtraTextOutputVariableView } = await import('./WiredExtraTextOutputVariableView');
const { WiredExtraTextInputVariableView } = await import('./WiredExtraTextInputVariableView');
const { WiredExtraMovementCurveView } = await import('./WiredExtraMovementCurveView');

describe('variable add-ons send their variables as variable ids (AIR readVariableIdsFromForm)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setStringParam.mockClear();
        setVariableIds.mockClear();
        baseProps = null;
    });

    it('variable filter: [sorted variable, N variable], no string', () => {
        trigger = { stringData: '', intData: [3, 0, 1, -10], variableIds: ['furni:7', 'room:8'] };
        render(<WiredExtraFilterByVariableView target="furni" />);
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:7', 'room:8']);
    });

    it('variable filter: a box an older server sent with the tokens in the string', () => {
        trigger = { stringData: 'custom:7\tcustom:8', intData: [3, 0, 1, -10] };
        render(<WiredExtraFilterByVariableView target="furni" />);
        baseProps.save();

        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:7', 'room:8']);
    });

    it('variable placeholder: the name (and the delimiter for every holder) as the string, the variable as its id', () => {
        trigger = { stringData: 'points\t / ', intData: [1, 1, 0], variableIds: ['user:5'] };
        render(<WiredExtraTextOutputVariableView />);
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('points\t / ');
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);

        cleanup();
        trigger = { stringData: 'custom:5\tpoints\t, ', intData: [0, 1, 0] };
        render(<WiredExtraTextOutputVariableView />);
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('points');
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
    });

    it('variable capturer: the name as the string, the context variable as its id', () => {
        trigger = { stringData: '10\tanswer', intData: [0] };
        render(<WiredExtraTextInputVariableView />);
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('answer');
        expect(setVariableIds).toHaveBeenLastCalledWith(['ctx:10']);
    });

    it('jump strength: the variable as its id when the strength is a variable', () => {
        trigger = { stringData: '', intData: [1, 80, -10, 7, 100], variableIds: ['room:8'] };
        render(<WiredExtraMovementCurveView />);
        baseProps.save();

        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['room:8']);
    });
});
