import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UbuntuDropmenuView } from './UbuntuDropmenuView';

const options = [ { value: 11, label: 'Games' }, { value: 13, label: 'Agency' } ];

afterEach(cleanup);

describe('AIR dropmenu style 3', () =>
{
    it('shows the selected caption, opens its rows and selects one', () =>
    {
        const onSelect = vi.fn();

        render(<UbuntuDropmenuView label="Category" value={ 11 } options={ options } onSelect={ onSelect } />);

        const field = screen.getByRole('combobox', { name: 'Category' });

        expect(field).toHaveTextContent('Games');
        expect(screen.queryByRole('listbox')).toBeNull();

        fireEvent.click(field);
        expect(field).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('option', { name: 'Games' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('option', { name: 'Games' })).toHaveClass('ubuntu-dropmenu__item');

        fireEvent.click(screen.getByRole('option', { name: 'Agency' }));
        expect(onSelect).toHaveBeenCalledWith(13);
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('works from the keyboard and stays shut while disabled', () =>
    {
        const onSelect = vi.fn();
        const view = render(<UbuntuDropmenuView label="Category" value={ 11 } options={ options } onSelect={ onSelect } />);
        const field = screen.getByRole('combobox', { name: 'Category' });

        fireEvent.keyDown(field, { key: 'ArrowDown' });
        fireEvent.keyDown(field, { key: 'ArrowDown' });
        fireEvent.keyDown(field, { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith(13);

        view.rerender(<UbuntuDropmenuView label="Category" value={ 11 } options={ options } onSelect={ onSelect } disabled />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Category' }));
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});
