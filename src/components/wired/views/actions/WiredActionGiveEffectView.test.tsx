import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[] } | null = null;
let baseProps: { save: () => void } | null = null;

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
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        baseProps = { save: props.save };
        return <div>{props.children}</div>;
    }
}));

import { WiredActionGiveEffectView } from './WiredActionGiveEffectView';

describe('WiredActionGiveEffectView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        [setIntParams, setStringParam, setSourceTypes].forEach((mock) => mock.mockClear());
        baseProps = null;
    });

    it('opens a fresh box on the official defaults: effect 13, priority 2, type 0', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionGiveEffectView />);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([13, 2, 0]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [0] });
    });

    it('reads a box saved with its effect id as text and clamps what is typed', () => {
        trigger = { stringData: '108', intData: [], userSourceTypes: [200] };
        render(<WiredActionGiveEffectView />);

        expect((screen.getByLabelText('Effect id') as HTMLInputElement).value).toBe('108');
        fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '9' } });
        fireEvent.click(screen.getAllByRole('radio')[1]);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([108, 2, 1]);
        expect(setStringParam).toHaveBeenCalledWith('');
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [], users: [200] });
    });
});
