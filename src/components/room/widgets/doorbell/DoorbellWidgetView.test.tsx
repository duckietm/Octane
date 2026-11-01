import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const answer = vi.fn();
const waiting = { users: ['Alice', 'Bob'] };

vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../../../common', () => ({
    OctaneCardView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardContentView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardHeaderView: (props: { headerText: string; onCloseClick: () => void }) => (
        <h1>
            {props.headerText}
            <button type="button" onClick={props.onCloseClick}>
                close
            </button>
        </h1>
    )
}));
vi.mock('../../../../hooks', () => ({ useDoorbellState: () => waiting.users, useDoorbellActions: () => ({ answer }) }));

const { DoorbellWidgetView } = await import('./DoorbellWidgetView');

afterEach(cleanup);

describe('DoorbellWidgetView', () => {
    it('lets a visitor in with the check and turns them away with the cross', () => {
        render(<DoorbellWidgetView />);
        fireEvent.click(screen.getByRole('button', { name: 'generic.accept Alice' }));
        fireEvent.click(screen.getByRole('button', { name: 'generic.deny Bob' }));

        expect(answer).toHaveBeenNthCalledWith(1, 'Alice', true);
        expect(answer).toHaveBeenNthCalledWith(2, 'Bob', false);
    });

    it('hides the visitors waiting when closed, and shows the widget again when someone new rings', () => {
        waiting.users = ['Alice', 'Bob'];
        const { rerender } = render(<DoorbellWidgetView />);

        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        expect(screen.queryByText('Alice')).toBeNull();

        waiting.users = ['Alice', 'Bob', 'Carol'];
        rerender(<DoorbellWidgetView />);
        expect(screen.getByText('Carol')).toBeTruthy();
    });
});
