import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
const setVariableIds = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[]; variableIds?: string[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes, setVariableIds })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('../WiredVariablePickerData', () => ({
    getCustomVariableItemId: (token: string) => parseInt(token.replace('custom:', ''), 10) || 0
}));

vi.mock('../WiredValueOrVariableSection', () => ({
    variableTokenFromId: (id: string) => (parseInt(id, 10) > 0 ? `custom:${id}` : ''),
    WiredValueOrVariableSection: () => <div>value</div>
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { normalizeChestPopup } from './WiredActionChestRewardBaseView';
import { WiredActionGiveCurrencyFromChestView } from './WiredActionGiveCurrencyFromChestView';
import { WiredActionGiveFurniFromChestView } from './WiredActionGiveFurniFromChestView';

describe('chest reward wired actions', () => {
    afterEach(cleanup);

    beforeEach(() => {
        [setIntParams, setStringParam, setSourceTypes, setVariableIds].forEach((mock) => mock.mockClear());
        baseProps = null;
    });

    it('currency: a fresh box gives one, in the games category, and saves the official layout', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionGiveCurrencyFromChestView />);

        fireEvent.change(screen.getByLabelText('reward popup'), { target: { value: 'Well done!' } });
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0, 1, 0, -10, 0, 11]);
        expect(setStringParam).toHaveBeenCalledWith('Well done!');
        expect(setVariableIds).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [0] });
    });

    it('currency: reads back a variable amount and keeps its variable id', () => {
        trigger = { stringData: 'hi', intData: [0, 5, 1, -20, 1, 13], userSourceTypes: [200], variableIds: ['44'] };
        render(<WiredActionGiveCurrencyFromChestView />);

        expect(screen.getByRole('combobox', { name: 'chest extra' })).toHaveTextContent('Agency');
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([0, 5, 1, -20, 1, 13]);
        expect(setVariableIds).toHaveBeenCalledWith(['44']);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [200] });
    });

    it('furni: the iteration order is the sixth int', () => {
        trigger = { stringData: '', intData: [1, 1, 0, -10, 0, 2] };
        render(<WiredActionGiveFurniFromChestView />);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([1, 1, 0, -10, 0, 2]);
    });

    it('keeps the popup to three lines and 200 characters', () => {
        expect(normalizeChestPopup('a\nb\nc\nd')).toBe('a\nb\nc');
        expect(normalizeChestPopup('x'.repeat(250))).toHaveLength(200);
    });
});
