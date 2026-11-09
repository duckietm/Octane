import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Native0Dropmenu } from './NativeWindow0';

vi.mock('../../../common/native-text/NativeText', () => ({
    NativeText: ({ text }: { text: string }) => <span>{text}</span>
}));

vi.mock('./NativeSkinView', () => ({
    NativeSkinView: () => <canvas />
}));

const ITEMS = ['Hello', 'Warning', 'Goodbye'];

const renderMenu = (onSelect = vi.fn()) => {
    render(<Native0Dropmenu caption="Templates" height={20} items={ITEMS} width={200} x={0} y={0} onSelect={onSelect} />);

    return onSelect;
};

const pick = (index: number) => {
    const option = screen.getAllByRole('option')[index];

    fireEvent.pointerDown(option);
    fireEvent.click(option);
};

describe('Native0Dropmenu', () => {
    afterEach(() => cleanup());

    it('lists every item when the face is opened, none of them selected', () => {
        renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Templates' }));

        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(screen.getAllByRole('option').map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false']);
    });

    it('reports the index of the picked item', () => {
        const onSelect = renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Templates' }));
        pick(1);

        expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('reports the same item again when it is picked twice', () => {
        const onSelect = renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Templates' }));
        pick(2);
        fireEvent.click(screen.getByRole('combobox', { name: 'Templates' }));
        pick(2);

        expect(onSelect).toHaveBeenCalledTimes(2);
        expect(onSelect).toHaveBeenNthCalledWith(2, 2);
    });

    it('closes on Escape without picking', () => {
        const onSelect = renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Templates' }));
        fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Escape' });

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
