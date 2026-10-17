import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
import { ChestAppearanceFields } from './ChestSettingsFields';

afterEach(() => cleanup());

const previewLabel = 'wiredchests.settings.appearance.preview';
const countLabel = 'wiredchests.settings.appearance.preview_amount';

const Fixture = ({ save, isFurni = true }: { save: (value: number[]) => void; isFurni?: boolean }) => {
    const [state, setState] = useState(2), [previewMode, setPreviewMode] = useState(6), [previewAmount, setPreviewAmount] = useState(4);
    return <><ChestAppearanceFields isFurni={isFurni} state={state} previewMode={previewMode} previewAmount={previewAmount} onStateChange={setState} onPreviewModeChange={setPreviewMode} onPreviewAmountChange={setPreviewAmount} /><button onClick={() => save([state, previewMode, previewAmount])}>Save</button></>;
};

const choose = (label: string, value: number) => {
    const name = label === countLabel ? String(value) : `${label}.${value}`;

    if (!screen.queryByRole('option', { name })) fireEvent.click(screen.getByRole('combobox', { name: label }));

    const option = screen.getByRole('option', { name });

    fireEvent.pointerDown(option);
    fireEvent.click(option);
};

// After the Volt AIR chest settings test (GPL-3.0), on the client's own select.
describe('AIR chest appearance fields', () => {
    it('retains all eight loaded preview modes and changes them without reducing them to booleans', () => {
        const save = vi.fn(); render(<Fixture save={save} />);
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 6, 4]);
        fireEvent.click(screen.getByRole('combobox', { name: previewLabel }));
        expect(screen.getAllByRole('option')).toHaveLength(8);
        choose(previewLabel, 7);
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 7, 4]);
    });

    it('disables rather than hides or resets the preview amount when switched off', () => {
        const save = vi.fn(); render(<Fixture save={save} />);
        choose(previewLabel, 0);
        expect(screen.getByRole('combobox', { name: countLabel }).hasAttribute('data-disabled')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 0, 4]);
        choose(previewLabel, 5); choose(countLabel, 2);
        fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenLastCalledWith([2, 5, 2]);
    });

    it('omits furniture preview controls for coin storage', () => {
        render(<Fixture save={vi.fn()} isFurni={false} />);
        expect(screen.getAllByRole('combobox')).toHaveLength(1);
        expect(screen.queryByRole('combobox', { name: previewLabel })).toBeNull();
    });
});
