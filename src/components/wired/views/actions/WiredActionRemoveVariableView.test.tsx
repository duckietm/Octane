import { cleanup, render } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();
const setSourceTypes = vi.fn();
const setFurniIds = vi.fn();
const setActionDelay = vi.fn();
const noFurni: number[] = [];
let trigger: { stringData: string; intData: number[]; variableIds?: string[]; selectedItems?: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;
const variable = (itemId: number, name: string) => ({ itemId, name, availability: 0, hasValue: true, isReadOnly: false, variableType: 0 });
const tools = {
    userVariableDefinitions: [variable(5, 'score')],
    furniVariableDefinitions: [variable(7, 'height')],
    contextVariableDefinitions: []
};

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 3 }
}));
vi.mock('../../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { classNames?: string[] }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds: noFurni, actionDelay: 0, setActionDelay, setFurniIds, setIntParams, setStringParam, setSourceTypes, setVariableIds }),
    useWiredTools: () => tools
}));
vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE: { value: 11, label: 'wiredfurni.params.sources.users.11' },
    FURNI_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.furni.0' }],
    USER_SOURCES: [{ value: 0, label: 'wiredfurni.params.sources.users.0' }],
    sortWiredSourceOptions: (options: unknown[]) => options,
    useAvailableUserSources: (_trigger: unknown, options: unknown[]) => options
}));
vi.mock('./WiredActionDelaySection', () => ({ WiredActionDelaySection: () => null }));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

const { WiredActionRemoveVariableView } = await import('./WiredActionRemoveVariableView');

describe('WiredActionRemoveVariableView (AIR RemoveVariable)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
    });

    it('sends [target] and the variable as its variable id, no string', () => {
        trigger = { stringData: '', intData: [0], variableIds: ['furni:7'] };
        render(<WiredActionRemoveVariableView />);

        expect(baseProps.validate()).toBe(true);
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([0]);
        expect(setStringParam).toHaveBeenLastCalledWith('');
        expect(setVariableIds).toHaveBeenLastCalledWith(['furni:7']);
    });

    it('opens a box an older server sent with the id as the string', () => {
        trigger = { stringData: '5', intData: [1] };
        render(<WiredActionRemoveVariableView />);

        baseProps.save();
        expect(setVariableIds).toHaveBeenLastCalledWith(['user:5']);
    });
});
