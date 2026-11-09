import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as pointer from '../../../../api/wired/WiredPointerVariable';

const mocks = vi.hoisted(() => ({
    setIntParams: vi.fn(),
    setStringParam: vi.fn(),
    setVariableIds: vi.fn(),
    save: null as null | (() => void),
    validate: null as null | (() => boolean),
    pickerEntries: [] as Array<{ token: string; label: string }>,
    pickerSelect: null as null | ((entry: { token: string }) => void)
}));

let trigger: { intData: number[]; stringData: string; variableIds: string[] } | null = null;
let contextVariableDefinitions: Array<Record<string, unknown>> = [];

vi.mock('../../../../api', () => ({
    ...pointer,
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams: mocks.setIntParams, setStringParam: mocks.setStringParam, setVariableIds: mocks.setVariableIds }),
    useWiredTools: () => ({ contextVariableDefinitions })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input aria-label="name" {...props} />
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: (props: { entries: Array<{ token: string; label: string }>; onSelect: (entry: { token: string }) => void }) => {
        mocks.pickerEntries = props.entries;
        mocks.pickerSelect = props.onSelect;

        return <div data-testid="picker" />;
    }
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save, validate }: PropsWithChildren<{ save: () => void; validate: () => boolean }>) => {
        mocks.save = save;
        mocks.validate = validate;

        return <div>{children}</div>;
    }
}));

import { WiredExtraPointerVariableView } from './WiredExtraPointerVariableView';

describe('WiredExtraPointerVariableView', () => {
    beforeEach(() => {
        trigger = { intData: [ -10 ], stringData: 'ptr', variableIds: [ '5' ] };
        contextVariableDefinitions = [
            { itemId: 5, name: 'target', hasValue: true, availability: 0, isTextConnected: false },
            { itemId: 6, name: 'flag', hasValue: false, availability: 0, isTextConnected: false },
            { itemId: 7, name: 'other_ptr', hasValue: true, availability: 0, isTextConnected: false, requiresExecutionContext: true }
        ];
        mocks.setIntParams.mockClear();
        mocks.setStringParam.mockClear();
        mocks.setVariableIds.mockClear();
    });

    afterEach(() => cleanup());

    it('offers only context variables with a value that need no running stack as accessor', () => {
        render(<WiredExtraPointerVariableView />);

        expect(mocks.pickerEntries.map((entry) => entry.label)).toEqual([ 'target' ]);
        expect(screen.getByText('wiredfurni.params.variables.pointer.accessor')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.variables.pointer.usage_info')).toBeTruthy();
    });

    it('opens on the stored layout and saves AIR\'s ints, name and variable ids', () => {
        render(<WiredExtraPointerVariableView />);

        expect(screen.getByRole('radio', { name: 'global' }).getAttribute('aria-checked')).toBe('true');
        fireEvent.click(screen.getByRole('radio', { name: 'context' }));
        mocks.save();

        expect(mocks.setIntParams).toHaveBeenCalledWith([ -20 ]);
        expect(mocks.setStringParam).toHaveBeenCalledWith('ptr');
        expect(mocks.setVariableIds).toHaveBeenCalledWith([ '5' ]);
    });

    it('needs a name and an accessor before it saves', () => {
        trigger = { intData: [], stringData: '', variableIds: [] };
        render(<WiredExtraPointerVariableView />);

        expect(screen.getByRole('radio', { name: 'furni' }).getAttribute('aria-checked')).toBe('true');
        expect(mocks.validate()).toBe(false);
    });
});
