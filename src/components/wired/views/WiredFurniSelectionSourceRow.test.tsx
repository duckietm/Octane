/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { classNames?: string[] }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>{children}</button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

const { WiredFurniSelectionSourceRow, isWiredHolderSourceLabel } = await import('./WiredFurniSelectionSourceRow');

afterEach(cleanup);

const renderRow = (options: { value: number; label: string }[], onChange = vi.fn()) =>
{
    render(
        <WiredFurniSelectionSourceRow
            options={options}
            selectionActive={false}
            selectionCount={0}
            selectionEnabledValues={[]}
            selectionKind="primary"
            selectionLimit={0}
            showSelectionToggle={false}
            title="wiredfurni.params.sources.merged.title.variables"
            value={0}
            onChange={onChange}
        />
    );

    return onChange;
};

describe('WiredFurniSelectionSourceRow (AIR InputSourceControlPreset.updateUI)', () =>
{
    it('recognises the room and context holder labels only', () =>
    {
        expect(isWiredHolderSourceLabel('wiredfurni.params.sources.global')).toBe(true);
        expect(isWiredHolderSourceLabel('wiredfurni.params.sources.context')).toBe(true);
        expect(isWiredHolderSourceLabel('wiredfurni.params.sources.furni.0')).toBe(false);
        expect(isWiredHolderSourceLabel('wiredfurni.params.sources.users.0')).toBe(false);
    });

    it('disables both arrows on a global or context holder row', () =>
    {
        const onChange = renderRow([ { value: 0, label: 'wiredfurni.params.sources.context' } ]);
        const [ previous, next ] = screen.getAllByRole('button');

        expect(previous).toHaveProperty('disabled', true);
        expect(next).toHaveProperty('disabled', true);
        fireEvent.click(next);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps the arrows live for a furni row, even with a single option', () =>
    {
        const onChange = renderRow([ { value: 0, label: 'wiredfurni.params.sources.furni.0' } ]);
        const [ , next ] = screen.getAllByRole('button');

        expect(next).toHaveProperty('disabled', false);
        fireEvent.click(next);
        expect(onChange).toHaveBeenCalledWith(0);
    });
});
