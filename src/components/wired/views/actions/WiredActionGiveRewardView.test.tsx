import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let save: (() => void) | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes: vi.fn() })
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Slider: () => null,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../layout', () => ({
    OctaneInput: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => null
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

import { WiredActionGiveRewardView } from './WiredActionGiveRewardView';

describe('WiredActionGiveRewardView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        save = null;
    });

    it('takes a badge code and saves it as a badge reward', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionGiveRewardView />);

        selectOption(screen.getByRole('combobox', { name: 'Reward type' }), 'Badge');
        fireEvent.change(screen.getByLabelText('Badge code'), { target: { value: 'ADM' } });
        act(() => save());

        expect(setStringParam).toHaveBeenCalledWith('0,ADM,100');
    });

    it('shows a saved badge reward with its code and chance', () => {
        trigger = { stringData: '0,NL1,50', intData: [0, 0, 0, 0, 0] };
        render(<WiredActionGiveRewardView />);

        expect(screen.getByRole('combobox', { name: 'Reward type' })).toHaveTextContent('Badge');
        expect(screen.getByLabelText('Badge code')).toHaveValue('NL1');
        expect(screen.getByLabelText('Chance %')).toHaveValue(50);
    });
});
