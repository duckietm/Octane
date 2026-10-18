import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IWiredContractContents } from '@octane/renderer';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({ LocalizeText: (key: string, _params?: string[], replacements?: string[]) => (replacements?.length ? `${ key }:${ replacements.join(',') }` : key) }));
vi.mock('../../../../common', () => ({
    OctaneCardView: ({ children, style }: PropsWithChildren<{ style?: object }>) => <div style={ style }>{ children }</div>,
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{ children }</div>,
    OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <h1>{ headerText }</h1>,
    LayoutFurniImageView: () => <span>furni image</span>
}));
vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{ text }</span> }));
vi.mock('../../../mod-tools/native/NativeSkin', () => ({ parseNativeSkin: () => ({}) }));
vi.mock('../../../mod-tools/native/NativeSkinView', () => ({ NativeSkinView: () => null }));

import { WiredContractEditorView } from './WiredContractEditorView';
import { WiredContractElementEditorView } from './WiredContractElementEditorView';

const payment = (): IWiredContractContents => ({
    contractId: 42,
    contractType: 0,
    definition: { youGiveRule: [ { nodes: [ { type: 0, amount: 7, itemType: null } ] } ], youGetRule: null },
    paymentMode: 1,
    receiveText: 'A cookie',
    layoutType: 'generic',
    rewardCategory: 11,
    showDialog: false,
    rewardText: ''
});

const renderEditor = (contents: IWiredContractContents, onSave = vi.fn(), canWrite = true, saving = false) =>
{
    render(<WiredContractEditorView contents={ contents } canWrite={ canWrite } saving={ saving } onSave={ onSave } onClose={ vi.fn() }
        renderElementEditor={ (_target, initial, apply, close) => <div data-testid="element-editor"><span>{ initial ? 'edit' : 'add' }</span><button type="button" onClick={ () => apply({ type: 0, amount: 3, itemType: null }) }>apply</button><button type="button" onClick={ close }>close</button></div> } />);

    return onSave;
};

const ready = () => screen.getByRole('button', { name: 'wiredfurni.ready' });

afterEach(cleanup);

describe('AIR payment / trade / reward contract editor', () =>
{
    it('edits the payment options; the layout section starts collapsed and donation disables the requirements', () =>
    {
        const onSave = renderEditor(payment());
        const layout = screen.getByRole('button', { name: 'wiredcontracts.payment_contract.layout_type' });

        expect(layout).toHaveAttribute('aria-expanded', 'false');
        fireEvent.change(screen.getByRole('textbox', { name: 'wiredcontracts.payment_contract.receive_text' }), { target: { value: 'Two cookies' } });
        fireEvent.click(layout);
        fireEvent.click(screen.getByRole('combobox', { name: 'wiredcontracts.payment_contract.layout_type' }));
        fireEvent.click(screen.getByRole('option', { name: 'wiredcontracts.payment_contract.layout_type.1' }));
        fireEvent.click(screen.getByRole('radio', { name: 'wiredcontracts.payment_contract.mode.0' }));

        expect(screen.getByRole('button', { name: 'wiredcontracts.payment_add_more' }).closest('fieldset')).toBeDisabled();

        fireEvent.click(ready());
        expect(onSave).toHaveBeenCalledWith({ ...payment(), paymentMode: 0, receiveText: 'Two cookies', layoutType: 'games' });
    });

    it('holds three payment options and five elements a rule, as AIR does', () =>
    {
        const initial = payment();

        initial.definition.youGiveRule[0].nodes = Array.from({ length: 5 }, () => ({ type: 0 as const, amount: 2, itemType: null }));
        renderEditor(initial);

        expect(screen.queryByRole('button', { name: 'wiredcontracts.add_element.title' })).toBeNull();

        const addMore = screen.getByRole('button', { name: 'wiredcontracts.payment_add_more' });

        fireEvent.click(addMore);
        fireEvent.click(addMore);
        expect(addMore).toBeDisabled();
        expect(screen.getByText('wiredcontracts.payment_rule:3')).toBeInTheDocument();
    });

    it('adds and edits elements through the element editor', () =>
    {
        const onSave = renderEditor(payment());

        fireEvent.click(screen.getByRole('button', { name: 'wiredcontracts.add_element.title' }));
        expect(within(screen.getByTestId('element-editor')).getByText('add')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'apply' }));
        expect(screen.queryByTestId('element-editor')).toBeNull();

        fireEvent.click(ready());
        expect(onSave.mock.lastCall[0].definition.youGiveRule[0].nodes).toEqual([ { type: 0, amount: 7, itemType: null }, { type: 0, amount: 3, itemType: null } ]);
    });

    it('keeps the reward options and disables the earnings category without a credit node', () =>
    {
        const initial: IWiredContractContents = { ...payment(), contractType: 2, definition: { youGiveRule: null, youGetRule: { nodes: [ { type: 0, amount: 9, itemType: null } ] } }, showDialog: true, rewardText: 'Well done' };
        const onSave = renderEditor(initial);
        const earnings = screen.getByRole('button', { name: 'wiredcontracts.reward_contract.earnings_category' });

        expect(earnings).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(earnings);
        fireEvent.click(screen.getByRole('combobox', { name: 'wiredcontracts.reward_contract.earnings_category' }));
        fireEvent.click(screen.getByRole('option', { name: 'wiredfurni.params.earnings_category.13' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'wiredcontracts.reward_contract.reward_popup.text' }), { target: { value: 'Excellent' } });
        fireEvent.click(ready());
        expect(onSave.mock.lastCall[0]).toMatchObject({ rewardCategory: 13, rewardText: 'Excellent', showDialog: true });

        fireEvent.click(screen.getByRole('button', { name: 'wiredcontracts.edit_element.title x', hidden: true }));
        expect(earnings.closest('fieldset')).toBeDisabled();
    });

    it('shows both rules for a trade and greys everything out without write rights', () =>
    {
        const initial: IWiredContractContents = { ...payment(), contractType: 1, definition: { youGiveRule: payment().definition.youGiveRule, youGetRule: { nodes: [ { type: 0, amount: 12, itemType: null } ] } } };
        const onSave = renderEditor(initial, vi.fn(), false);

        expect(screen.getAllByRole('button', { name: 'wiredcontracts.edit_element.title' })).toHaveLength(2);
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(ready()).toBeDisabled();
        fireEvent.click(ready());
        expect(onSave).not.toHaveBeenCalled();
    });
});

describe('AIR contract element editor', () =>
{
    const candidates = [
        { itemType: { isWallItem: false, typeId: 1, legacyPosterId: '' }, code: 'chair', name: 'Chair', tradeable: true },
        { itemType: { isWallItem: false, typeId: 2, legacyPosterId: '' }, code: 'rare', name: 'No Trade', tradeable: false }
    ];

    it('saves coins, refuses too many furni and untradeable furni with an alert', () =>
    {
        const onSave = vi.fn();
        const onInvalid = vi.fn();

        render(<WiredContractElementEditorView initial={ null } canWrite candidates={ candidates } onSave={ onSave } onClose={ vi.fn() } onInvalid={ onInvalid } />);

        expect(screen.getByRole('textbox', { name: 'wiredcontracts.element.itemtype.search' }).closest('fieldset')).toBeDisabled();

        const amount = screen.getByRole('spinbutton', { name: 'wiredcontracts.element.amount' });

        fireEvent.change(amount, { target: { value: '100000' } });
        fireEvent.click(ready());
        expect(onSave).toHaveBeenLastCalledWith({ type: 0, amount: 100000, itemType: null });

        fireEvent.click(screen.getByRole('radio', { name: 'wiredcontracts.element.type.1' }));
        fireEvent.click(screen.getByRole('option', { name: /Chair/ }));
        expect(screen.getByRole('textbox', { name: 'wiredcontracts.element.itemtype.furni_code' })).toHaveValue('chair');
        fireEvent.change(amount, { target: { value: '501' } });
        fireEvent.click(ready());
        expect(onInvalid).toHaveBeenLastCalledWith('wiredcontracts.element.too_many_items:500');

        fireEvent.change(amount, { target: { value: '500' } });
        fireEvent.click(ready());
        expect(onSave).toHaveBeenLastCalledWith({ type: 1, amount: 500, itemType: { isWallItem: false, typeId: 1, legacyPosterId: '' } });

        fireEvent.click(screen.getByRole('option', { name: /No Trade/ }));
        fireEvent.click(ready());
        expect(onInvalid).toHaveBeenLastCalledWith('wiredcontracts.element.item_not_allowed');
        expect(screen.getByText('wiredcontracts.element.show_count:2')).toBeInTheDocument();
    });

    it('draws only the rows in view of a long list', () =>
    {
        const many = Array.from({ length: 2000 }, (_, id) => ({ itemType: { isWallItem: false, typeId: id, legacyPosterId: '' }, code: `item${ id }`, name: `Item ${ id }`, tradeable: true }));

        render(<WiredContractElementEditorView initial={ { type: 1, amount: 1, itemType: null } } canWrite candidates={ many } onSave={ vi.fn() } onClose={ vi.fn() } onInvalid={ vi.fn() } />);

        expect(screen.getAllByRole('option').length).toBeLessThan(20);
        expect(screen.getByRole('listbox')).toHaveStyle({ height: '40000px' });
        fireEvent.scroll(screen.getByRole('listbox').parentElement, { target: { scrollTop: 200 } });
        expect(screen.getAllByRole('option')[0]).toHaveStyle({ top: '160px' });
        fireEvent.change(screen.getByRole('textbox', { name: 'wiredcontracts.element.itemtype.search' }), { target: { value: 'item1999' } });
        expect(within(screen.getByRole('listbox')).getByRole('option')).toHaveTextContent('Item 1999');
    });
});
