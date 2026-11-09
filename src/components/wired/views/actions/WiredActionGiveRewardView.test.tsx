import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let save: (() => void) | null = null;
let validate: (() => boolean) | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes: vi.fn() })
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick, disabled }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
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
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        save = props.save;
        validate = props.validate ?? null;
        return <div>{props.children}</div>;
    }
}));

import { validateRewards, WiredActionGiveRewardView } from './WiredActionGiveRewardView';

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

    it('saves the official ints, also without rewards', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionGiveRewardView />);

        act(() => save());

        expect(setStringParam).toHaveBeenCalledWith('');
        expect(setIntParams).toHaveBeenCalledWith([0, 0, 0, 1]);
    });

    it('reads n only for a repeating interval and keeps the limit in the checkbox', () => {
        trigger = { stringData: '1,furni#12,100', intData: [2, 0, 25, 6] };
        render(<WiredActionGiveRewardView />);

        expect(screen.getByLabelText('n =')).toHaveValue('6');
        expect(screen.getByLabelText('Prize limit')).toHaveValue(25);
        expect(screen.getByRole('checkbox', { name: 'Reward limit' })).toHaveAttribute('aria-checked', 'true');
        act(() => save());
        expect(setIntParams).toHaveBeenCalledWith([2, 0, 25, 6]);

        cleanup();
        trigger = { stringData: '', intData: [0, 0, 0, 6] };
        render(<WiredActionGiveRewardView />);
        expect(screen.getByLabelText('n =')).toHaveValue('1');
        expect(screen.getByLabelText('n =')).toBeDisabled();
    });

    it('validates the probabilities as the official box does', () => {
        const reward = (probability: number) => ({ rewardType: 'furni' as const, rewardValue: '12', probability, pointsType: 5 });

        expect(validateRewards([reward(60), reward(40)], false)).toBeNull();
        expect(validateRewards([reward(60), reward(50)], false)).toBe('The sum of probabilities cannot exceed 100. You now have 110.');
        expect(validateRewards([reward(0)], false)).toBe('Make sure all probabilities are numbers between 1 and 100.');
        expect(validateRewards([reward(0)], true)).toBeNull();
        expect(validateRewards([{ ...reward(10), rewardType: 'badge', rewardValue: 'A'.repeat(101) }], false)).toContain('more than 100');
    });

    it('accepts only whole positive amounts and item ids the server can read', () => {
        const reward = (rewardType: 'credits' | 'furni' | 'badge', rewardValue: string) => ({ rewardType, rewardValue, probability: 10, pointsType: 5 });
        const message = 'Amounts and item ids must be whole numbers from 1 to 2147483647.';

        expect(validateRewards([reward('credits', '25')], false)).toBeNull();
        expect(validateRewards([reward('furni', '2147483647')], false)).toBeNull();
        expect(validateRewards([reward('credits', '0')], false)).toBe(message);
        expect(validateRewards([reward('credits', '-5')], false)).toBe(message);
        expect(validateRewards([reward('credits', '1.5')], false)).toBe(message);
        expect(validateRewards([reward('furni', '2147483648')], false)).toBe(message);
        expect(validateRewards([reward('badge', 'ACH_1')], false)).toBeNull();
    });

    it('blocks the save on an invalid probability', () => {
        trigger = { stringData: '1,furni#12,100;1,furni#13,50', intData: [0, 0, 0, 1] };
        render(<WiredActionGiveRewardView />);

        let valid = true;

        act(() => {
            valid = validate();
        });

        expect(valid).toBe(false);
        expect(screen.getByText('The sum of probabilities cannot exceed 100. You now have 150.')).toBeInTheDocument();
    });
});
