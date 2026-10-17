import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { WiredActionWriteToLogsView } from './WiredActionWriteToLogsView';

describe('WiredActionWriteToLogsView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
    });

    it('opens a fresh box at the first level, as the official dropdown does', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionWriteToLogsView />);

        expect(screen.getByRole('combobox')).toHaveTextContent('Debug');
    });

    it('shows what the box stored and saves the level, the message as typed and the user source slot', () => {
        trigger = { stringData: 'door opened', intData: [2], userSourceTypes: [5] };
        render(<WiredActionWriteToLogsView />);

        expect(screen.getByRole('combobox')).toHaveTextContent('Warning');
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('door opened');

        selectOption(screen.getByRole('combobox'), 'Error');
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  boss escaped  ' } });
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([3]);
        expect(setStringParam).toHaveBeenCalledWith('  boss escaped  ');
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [5] });
    });
});
