import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback }));
vi.mock('../../../../common', () => ({
    Button: (props: { children: ReactNode; onClick: () => void }) => <button onClick={props.onClick}>{props.children}</button>,
    LayoutNotificationAlertView: (props: { children: ReactNode; title: string; classNames: string[] }) => (
        <div className={props.classNames.join(' ')}>
            <h1>{props.title}</h1>
            {props.children}
        </div>
    )
}));

const { NotificationAbusiveAlertView } = await import('./NotificationAbusiveAlertView');

afterEach(cleanup);

describe('NotificationAbusiveAlertView', () => {
    it('shows the heading and the explanation and closes with its button', () => {
        const onClose = vi.fn();
        const item = { title: 'Your urgent request', messages: ['Too many calls.'] } as never;

        render(<NotificationAbusiveAlertView item={item} onClose={onClose} />);

        expect(screen.getByText('Bad news!')).toBeTruthy();
        expect(screen.getByText('Too many calls.')).toBeTruthy();

        fireEvent.click(screen.getByText('generic.close'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
