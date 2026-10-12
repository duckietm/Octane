import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, SanitizeHtml: (html: string) => html }));
vi.mock('../../../../common', () => ({
    Button: (props: { children: ReactNode; onClick: () => void }) => <button onClick={props.onClick}>{props.children}</button>,
    LayoutNotificationAlertView: (props: { children: ReactNode; title: string; classNames: string[] }) => (
        <div className={props.classNames.join(' ')}>
            <h1>{props.title}</h1>
            {props.children}
        </div>
    )
}));

const { NotificationMotdAlertView } = await import('./NotificationMotdAlertView');

afterEach(cleanup);

describe('NotificationMotdAlertView', () => {
    it('lists each message in its own box and closes with the button', () => {
        const onClose = vi.fn();
        const item = { title: 'Messages for you', messages: ['First news', 'Second news'] } as never;

        const { container } = render(<NotificationMotdAlertView item={item} onClose={onClose} />);

        expect(container.querySelectorAll('.octane-motd-item')).toHaveLength(2);
        expect(screen.getByText('Messages for you')).toBeTruthy();

        fireEvent.click(screen.getByText('generic.close'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
