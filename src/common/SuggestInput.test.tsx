/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SuggestInput } from './SuggestInput';

const OPTIONS = ['sound_alpha', 'sound_beta', 'other'];

const Demo = ({ onChange, disabled }: { onChange?: (value: string) => void; disabled?: boolean }) => {
    const [value, setValue] = useState('');

    return (
        <SuggestInput
            aria-label="Class"
            disabled={disabled}
            options={OPTIONS}
            value={value}
            onChange={(next) => {
                setValue(next);
                onChange?.(next);
            }}
        />
    );
};

describe('SuggestInput', () => {
    afterEach(() => cleanup());

    it('keeps free text and narrows the suggestions by substring', () => {
        const onChange = vi.fn();
        render(<Demo onChange={onChange} />);

        fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'sound' } });

        expect(onChange).toHaveBeenLastCalledWith('sound');
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['sound_alpha', 'sound_beta']);

        fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'brand_new' } });

        expect(screen.getByLabelText('Class')).toHaveValue('brand_new');
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('takes a picked suggestion as the value and closes the list', () => {
        const onChange = vi.fn();
        render(<Demo onChange={onChange} />);

        fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'sound' } });
        fireEvent.click(screen.getByRole('option', { name: 'sound_beta' }));

        expect(onChange).toHaveBeenLastCalledWith('sound_beta');
        expect(screen.getByLabelText('Class')).toHaveValue('sound_beta');
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('opens the full list on the arrow key and closes it on Escape', () => {
        render(<Demo />);

        const input = screen.getByLabelText('Class');
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(screen.getAllByRole('option')).toHaveLength(3);

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('lets Escape through while the list is not showing', () => {
        const onKeyDown = vi.fn();

        render(
            <div onKeyDown={(event) => onKeyDown(event.key)}>
                <Demo />
            </div>
        );
        fireEvent.keyDown(screen.getByLabelText('Class'), { key: 'Escape' });

        expect(onKeyDown).toHaveBeenCalledWith('Escape');
    });

    it('is not editable while disabled', () => {
        render(<Demo disabled />);

        expect(screen.getByLabelText('Class')).toBeDisabled();
    });
});
