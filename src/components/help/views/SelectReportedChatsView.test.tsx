import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setActiveReport = vi.fn();
const chat = { id: 1, webId: 7, name: 'Alice', look: 'hd-180-1', message: 'hello', type: 0, entityType: 1, roomId: 1 };

vi.mock('@octane/renderer', () => ({ RoomObjectType: { USER: 1 } }));
vi.mock('../../../api', () => ({
    ChatEntryPlainText: (entry: { text?: string; message?: string }) => entry.text ?? entry.message,
    ChatEntryType: { TYPE_CHAT: 0, TYPE_IM: 1 },
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    LocalizeText: (key: string) => key,
    ReportState: { SELECT_USER: 1, SELECT_CHATS: 2, SELECT_TOPICS: 3 },
    ReportType: { BULLY: 1, EMERGENCY: 2, IM: 3 }
}));
vi.mock('../../../common', () => ({
    AutoGrid: (props: { children: ReactNode }) => <div>{props.children}</div>,
    Button: (props: { children: ReactNode; onClick?: () => void }) => <button onClick={props.onClick}>{props.children}</button>,
    Column: (props: { children: ReactNode }) => <div>{props.children}</div>,
    Flex: (props: { children: ReactNode }) => <div>{props.children}</div>,
    LayoutAvatarImageView: () => <span data-testid="head" />,
    LayoutGridItem: (props: { children: ReactNode }) => <div>{props.children}</div>,
    Text: (props: { children: ReactNode }) => <span>{props.children}</span>
}));
vi.mock('../../../hooks', () => ({
    useChatHistory: () => ({ chatHistory: [chat], messengerHistory: [] }),
    useFriendsState: () => ({ friends: [] }),
    useMessenger: () => ({ messageThreads: [] }),
    useHelp: () => ({ activeReport: { reportType: 1, reportedUserId: 7, currentStep: 2 }, setActiveReport })
}));

const { SelectReportedChatsView } = await import('./SelectReportedChatsView');

afterEach(cleanup);

describe('SelectReportedChatsView', () => {
    it('names the user picked and sends back to the list from its link', () => {
        render(<SelectReportedChatsView />);

        expect(screen.getByText('Selected user')).toBeTruthy();
        expect(screen.getByText('Alice')).toBeTruthy();

        fireEvent.click(screen.getByText('Select another user'));

        const update = setActiveReport.mock.calls[0][0] as (value: object) => { currentStep: number; reportedUserId: number };

        expect(update({ currentStep: 2 })).toMatchObject({ currentStep: 1, reportedUserId: -1 });
    });
});
