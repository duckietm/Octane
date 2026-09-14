import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { ModToolsTemplateSelect } from './ModToolsTemplateSelect';

afterEach(cleanup);

describe('ModToolsTemplateSelect', () => {
    it('renders nothing when the hotel has no templates', () => {
        const { container } = render(<ModToolsTemplateSelect templates={[]} onSelect={() => null} />);

        expect(container.querySelector('select')).toBeNull();
    });

    it('hands the chosen template to the caller and snaps back to the placeholder', () => {
        const onSelect = vi.fn();

        render(<ModToolsTemplateSelect templates={['Please stop.', 'Be nice.']} onSelect={onSelect} />);

        const select = screen.getByLabelText('Select from message templates') as HTMLSelectElement;

        fireEvent.change(select, { target: { value: '1' } });

        expect(onSelect).toHaveBeenCalledWith('Be nice.');
        expect(select.value).toBe('');
    });

    it('shortens long templates in the list without touching what is handed over', () => {
        const onSelect = vi.fn();
        const long = 'x'.repeat(90);

        render(<ModToolsTemplateSelect templates={[long]} onSelect={onSelect} />);

        expect(screen.getByRole('option', { name: `${'x'.repeat(67)}...` })).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Select from message templates'), { target: { value: '0' } });

        expect(onSelect).toHaveBeenCalledWith(long);
    });
});
