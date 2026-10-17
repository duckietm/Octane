import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Native100Dropmenu } from './NativeDropmenu100';

vi.mock('../../../common/native-text/NativeText', () => ({
    NativeText: ({ text }: { text: string }) => <span>{text}</span>
}));

vi.mock('./NativeSkinView', () => ({
    NativeSkinView: () => <canvas />
}));

const ITEMS = ['Spam', 'Scam', 'Insult'];

const renderMenu = (props: { disabled?: boolean; selectedIndex?: number } = {}, onSelect = vi.fn()) => {
    render(<Native100Dropmenu caption="Topic" height={20} items={ITEMS} width={200} x={0} y={0} onSelect={onSelect} {...props} />);

    return onSelect;
};

describe('Native100Dropmenu', () => {
    afterEach(() => cleanup());

    it('lists every item when the face is opened', () => {
        renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Topic' }));

        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(screen.getAllByRole('option').map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false']);
    });

    it('marks the chosen item as selected', () => {
        renderMenu({ selectedIndex: 1 });

        fireEvent.click(screen.getByRole('combobox', { name: 'Topic' }));

        expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('reports the index of the picked item', () => {
        const onSelect = renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Topic' }));

        const option = screen.getAllByRole('option')[2];

        fireEvent.pointerDown(option);
        fireEvent.click(option);

        expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('closes on Escape without picking', () => {
        const onSelect = renderMenu();

        fireEvent.click(screen.getByRole('combobox', { name: 'Topic' }));
        fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Escape' });

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not open while disabled', () => {
        renderMenu({ disabled: true });

        fireEvent.click(screen.getByRole('combobox', { name: 'Topic' }));

        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });
});
