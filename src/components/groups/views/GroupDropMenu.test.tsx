import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupDropMenu } from './GroupNativeLayout';

vi.mock('../../../common/native-text/NativeText', () => ({
    NativeText: ({ text }: { text: string }) => <span>{text}</span>
}));

const OPTIONS = [
    { value: -1, label: 'Select a room' },
    { value: 7, label: 'Room seven' },
    { value: 9, label: 'Room nine' }
];

const renderMenu = (onSelect = vi.fn()) => {
    render(<GroupDropMenu height={26} label="Base room" options={OPTIONS} value={7} width={200} x={0} y={0} onSelect={onSelect} />);

    return onSelect;
};

describe('GroupDropMenu', () => {
    afterEach(() => cleanup());

    it('shows the chosen caption on the trigger and lists every option when opened', () => {
        renderMenu();

        const trigger = screen.getByRole('combobox', { name: 'Base room' });

        expect(trigger).toHaveTextContent('Room seven');

        fireEvent.click(trigger);

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Select a room', 'Room seven', 'Room nine']);
    });

    it('reports the numeric value of the picked option', () => {
        const onSelect = renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Base room' }));

        const option = screen.getByRole('option', { name: 'Room nine' });

        fireEvent.pointerDown(option);
        fireEvent.click(option);

        expect(onSelect).toHaveBeenCalledWith(9);
    });

    it('closes on Escape without picking', () => {
        const onSelect = renderMenu();
        const trigger = screen.getByRole('combobox', { name: 'Base room' });

        fireEvent.click(trigger);
        expect(screen.getAllByRole('option')).toHaveLength(3);

        fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Escape' });

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
