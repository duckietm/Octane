import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
const setVariableIds = vi.fn();
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; selectedItems?: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    fromOfficialVariableTarget: (official: number) => (official === 0 ? 1 : official === -20 ? 2 : official === -10 ? 3 : 0),
    toOfficialVariableTarget: (ours: number) => (ours === 1 ? 0 : ours === 2 ? -20 : ours === 3 ? -10 : 1),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds: [], setFurniIds, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => ({ userVariableDefinitions: [], furniVariableDefinitions: [], contextVariableDefinitions: [] })
}));
vi.mock('../WiredSourcesSelector', () => ({
    FURNI_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.furni.0' }],
    USER_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.users.0' }],
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: () => null }));
vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredConditionHasVariableView } = await import('./WiredConditionHasVariableView');

describe('WiredConditionHasVariableView (AIR HasVariable)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
    });

    it('sends [target] and the variable as its variable id, no string', () => {
        trigger = { stringData: '', intData: [0], variableIds: ['furni:7'] };
        render(<WiredConditionHasVariableView />);

        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0]);
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:7']);
    });

    it("sends a built-in under Habbo's id and opens a box an older server sent with the token as the string", () => {
        trigger = { stringData: 'internal:@position_x\t{"existenceMode":0}', intData: [1] };
        render(<WiredConditionHasVariableView />);

        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['-230']);
    });
});
