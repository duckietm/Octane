import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const startPoll = vi.fn();
const rejectPoll = vi.fn();
const handlers: Record<string, (event: unknown) => void> = {};

vi.mock('../../../../api', () => ({
    buildPollAnswers: () => [],
    countPollPages: () => 1,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    nextPollQuestion: () => null,
    NotificationAlertType: { DEFAULT: 'default' },
    POLL_CHOICE_NO_BRANCH: 0,
    POLL_CURSOR_START: { index: 0 },
    POLL_QUESTION_CHECKBOX: 2,
    POLL_QUESTION_RADIO: 1,
    RoomWidgetPollUpdateEvent: { OFFER: 'offer', ERROR: 'error', CONTENT: 'content' }
}));
vi.mock('../../../../common', () => ({
    OctaneCardView: (props: { children: ReactNode; className: string }) => <div className={props.className}>{props.children}</div>,
    OctaneCardContentView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardHeaderView: (props: { headerText: string }) => <h1>{props.headerText}</h1>
}));
vi.mock('../../../../hooks', () => ({
    usePollActions: () => ({ startPoll, rejectPoll, answerPoll: vi.fn() }),
    useNotification: () => ({ simpleAlert: vi.fn(), showConfirm: vi.fn() }),
    useUiEvent: (type: string, handler: (event: unknown) => void) => {
        handlers[type] = handler;
    }
}));

const { PollWidgetView } = await import('./PollWidgetView');

afterEach(cleanup);

describe('PollWidgetView offer', () => {
    it('starts the poll from OK, and turns it down from the cancel link', () => {
        render(<PollWidgetView />);
        act(() => handlers.offer({ id: 9, headline: 'Our poll', summary: 'Tell us' }));

        expect(screen.getByText('Our poll')).toBeTruthy();
        expect(screen.getByText('Tell us')).toBeTruthy();

        fireEvent.click(screen.getByText('OK'));
        expect(startPoll).toHaveBeenCalledWith(9);

        cleanup();
        render(<PollWidgetView />);
        act(() => handlers.offer({ id: 4, headline: 'Another', summary: '' }));
        fireEvent.click(screen.getByText(/Cancel/));
        expect(rejectPoll).toHaveBeenCalledWith(4);
    });
});
