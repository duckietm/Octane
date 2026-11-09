import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    GetRoomSession: () => ({ roomId: 1 })
}));
vi.mock('../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));

const { readWiredValueText, isWiredSameHolderEligible, WiredValueOrVariableInput } = await import('./WiredValueOrVariableInput');
const { buildWiredVariablePickerEntries } = await import('./WiredVariablePickerData');

const variable = (itemId: number, name: string, hasValue = true) => ({ itemId, name, variableType: 0, availability: 0, hasValue, isReadOnly: false });
const entries = buildWiredVariablePickerEntries('user', 'change-reference', [variable(1, 'score'), variable(2, 'Score'), variable(3, 'coins'), variable(4, 'flag', false)]);
const coins = entries.find((entry) => entry.displayLabel === 'coins');

afterEach(cleanup);

describe('readWiredValueText (AIR ValueOrVariableSection.onInputTextChanged)', () => {
    it('reads decimal, hex and binary numbers within the range as literals', () => {
        expect(readWiredValueText('-12', entries, -100, 100)).toEqual({ kind: 'literal', valid: true, value: -12 });
        expect(readWiredValueText('0x1f', entries, -100, 100)).toEqual({ kind: 'literal', valid: true, value: 31 });
        expect(readWiredValueText('0b101', entries, -100, 100)).toEqual({ kind: 'literal', valid: true, value: 5 });
        expect(readWiredValueText('101', entries, -100, 100)).toEqual({ kind: 'literal', valid: false });
        expect(readWiredValueText('-', entries, -100, 100)).toEqual({ kind: 'literal', valid: false });
    });

    it('reads other text as a variable name, in any case, valid only for one eligible match', () => {
        expect(readWiredValueText('COINS', entries, 0, 1)).toMatchObject({ kind: 'variable', valid: true, entry: coins });
        expect(readWiredValueText('score', entries, 0, 1)).toMatchObject({ kind: 'variable', valid: false, ambiguous: true });
        expect(readWiredValueText('nothing', entries, 0, 1)).toMatchObject({ kind: 'variable', valid: false, ambiguous: false });
    });

    it('allows the same holder only on the destination furni or user type', () => {
        expect(isWiredSameHolderEligible('user', 'user')).toBe(true);
        expect(isWiredSameHolderEligible('furni', 'furni')).toBe(true);
        expect(isWiredSameHolderEligible('user', 'furni')).toBe(false);
        expect(isWiredSameHolderEligible('global', 'global')).toBe(false);
        expect(isWiredSameHolderEligible('context', 'context')).toBe(false);
    });
});

const renderInput = (props: Partial<Parameters<typeof WiredValueOrVariableInput>[0]> = {}) => {
    const handlers = {
        onIsVariableChange: vi.fn(),
        onLiteralChange: vi.fn(),
        onTargetChange: vi.fn(),
        onTokenChange: vi.fn(),
        onValidityChange: vi.fn(),
        onSameHolderChange: vi.fn()
    };

    render(
        <WiredValueOrVariableInput
            entries={entries}
            isVariable={false}
            label="reference"
            literal="3"
            primaryTarget="user"
            target="user"
            targets={['furni', 'user', 'global', 'context']}
            token=""
            {...handlers}
            {...props}
        />
    );

    return handlers;
};

const field = () => screen.getByRole('textbox', { name: 'reference' });
const openPopup = () => fireEvent.click(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' }));

describe('WiredValueOrVariableInput (AIR ValueOrVariableInputPreset)', () => {
    it('takes a typed number as the literal and a typed name as the variable', () => {
        const handlers = renderInput();

        expect(field()).toHaveValue('3');
        fireEvent.change(field(), { target: { value: '0x10' } });
        expect(handlers.onIsVariableChange).toHaveBeenLastCalledWith(false);
        expect(handlers.onLiteralChange).toHaveBeenLastCalledWith('16');
        expect(field()).toHaveValue('0x10');

        fireEvent.change(field(), { target: { value: 'Coins' } });
        expect(handlers.onIsVariableChange).toHaveBeenLastCalledWith(true);
        expect(handlers.onTokenChange).toHaveBeenLastCalledWith(coins.token);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('marks an unknown or ambiguous name invalid with the official texts', () => {
        const handlers = renderInput();

        fireEvent.change(field(), { target: { value: 'score' } });
        expect(screen.getByRole('alert')).toHaveTextContent('wiredfurni.params.variables.reference_value.ambiguous');
        expect(handlers.onValidityChange).toHaveBeenLastCalledWith(false);

        fireEvent.change(field(), { target: { value: 'missing' } });
        expect(screen.getByRole('alert')).toHaveTextContent('wiredfurni.params.variables.reference_value.invalid');
    });

    it('shows a saved variable by name with the target indicator, and a missing one as invalid', () => {
        renderInput({ isVariable: true, token: coins.token });

        expect(field()).toHaveValue('coins');
        expect(screen.getByTitle('wiredfurni.params.sourcetype.users')).toBeTruthy();
        cleanup();

        renderInput({ isVariable: true, token: '' });
        expect(screen.getByRole('alert')).toBeTruthy();
        cleanup();

        renderInput({ isVariable: false, targets: ['user'] });
        expect(screen.queryByTitle('wiredfurni.params.sourcetype.users')).toBeNull();
    });

    it('a disabled section greys the field, shows no error and keeps the popup shut', () => {
        const handlers = renderInput({ disabled: true, isVariable: true, token: '' });

        expect(field()).toBeDisabled();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(handlers.onValidityChange).toHaveBeenLastCalledWith(true);
        expect(screen.getByRole('button', { name: 'wiredfurni.params.variables.reference_value.popup' })).toBeDisabled();
    });
});

describe('WiredValueOrVariableInput popup (AIR ValueOrVariablePopupPreset)', () => {
    it('lays out the claimed source, the same-holder checkbox and then the picker', () => {
        renderInput({
            renderSource: ({ typeSelector, locked }) => (
                <div data-testid="source" data-locked={String(locked)}>
                    wiredfurni.params.sources.merged.title.variables{typeSelector}
                </div>
            )
        });
        openPopup();

        const popup = screen.getByRole('dialog', { name: 'reference' });
        const text = popup.textContent;

        expect(within(popup).getByTestId('source')).toHaveAttribute('data-locked', 'false');
        expect(text.indexOf('wiredfurni.params.sources.merged.title.variables')).toBeLessThan(text.indexOf('wiredfurni.params.variables.reference_value.same_holder'));
        // The checkbox group comes before the picker's tab row.
        const checkbox = within(popup).getByRole('checkbox');
        const firstTab = within(popup).getByRole('button', { name: 'wiredfurni.variable_picker.tab.all' });

        expect(checkbox.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(within(popup).getAllByRole('button', { name: /wiredfurni\.params\.sourcetype\./ })).toHaveLength(4);
    });

    it('locks the source and the type selector while the same holder is used', () => {
        const handlers = renderInput({
            isVariable: true,
            token: coins.token,
            sameHolder: true,
            renderSource: ({ typeSelector, locked }) => (
                <div data-testid="source" data-locked={String(locked)}>
                    {typeSelector}
                </div>
            )
        });
        openPopup();

        const popup = screen.getByRole('dialog');

        expect(within(popup).getByTestId('source')).toHaveAttribute('data-locked', 'true');
        for (const button of within(popup).getAllByRole('button', { name: /wiredfurni\.params\.sourcetype\./ })) expect(button).toBeDisabled();
        fireEvent.click(within(popup).getByRole('checkbox'));
        expect(handlers.onSameHolderChange).toHaveBeenCalledWith(false);
    });

    it('keeps the stored checkbox state but disables it on another holder type, and checking it picks the variable mode', () => {
        renderInput({ target: 'global', sameHolder: true });
        openPopup();
        expect(within(screen.getByRole('dialog')).getByRole('checkbox')).toBeChecked();
        expect(within(screen.getByRole('dialog')).getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
        cleanup();

        const handlers = renderInput({ target: 'user', sameHolder: false });
        openPopup();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
        expect(handlers.onSameHolderChange).toHaveBeenCalledWith(true);
        expect(handlers.onIsVariableChange).toHaveBeenCalledWith(true);
    });

    it('a type change clears the variable; a pick sets it and closes the popup', () => {
        const handlers = renderInput();

        openPopup();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'wiredfurni.params.sourcetype.furni' }));
        expect(handlers.onTargetChange).toHaveBeenCalledWith('furni');
        expect(handlers.onTokenChange).toHaveBeenLastCalledWith('');

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'wiredfurni.variable_picker.tab.all' }));
        fireEvent.click(screen.getAllByRole('option').find((option) => option.textContent === 'coins'));
        expect(handlers.onIsVariableChange).toHaveBeenLastCalledWith(true);
        expect(handlers.onTokenChange).toHaveBeenLastCalledWith(coins.token);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('closes on an outside click and on Escape', () => {
        renderInput();
        openPopup();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('dialog')).toBeNull();

        openPopup();
        fireEvent.keyDown(within(screen.getByRole('dialog')).getByRole('textbox'), { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
