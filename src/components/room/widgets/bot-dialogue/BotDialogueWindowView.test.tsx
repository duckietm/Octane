import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    sendMessageComposer: vi.fn(),
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('@octane/renderer', () => {
    class Keep {
        public args: unknown[];

        constructor(...args: unknown[]) {
            this.args = args;
        }
    }

    return {
        BotDialogueWindowEvent: class {},
        BotDialogueWindowChooseComposer: class extends Keep {}
    };
});

vi.mock('../../../../api', () => ({
    GetConfigurationValue: () => 'http://icons/%libname%%param%_icon.png',
    GetRoomSession: () => ({ userDataManager: { getRentableBotData: () => ({ figure: '' }) } }),
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: mocks.sendMessageComposer
}));

vi.mock('../../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler)
}));

vi.mock('../../../../common', () => ({
    LayoutAvatarImageView: () => null,
    OctaneCardView: ({ children }: { children: ReactNode }) => <div data-testid="window">{children}</div>,
    OctaneCardHeaderView: ({ headerText, onCloseClick }: { headerText: string; onCloseClick: () => void }) => (
        <div>
            <span>{headerText}</span>
            <button type="button" onClick={onCloseClick}>
                close
            </button>
        </div>
    ),
    OctaneCardContentView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    OctaneCardTabsView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    OctaneCardTabsItemView: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    )
}));

vi.mock('../../../../common/native-text/NativeTextTree', () => ({
    NativeTextTree: ({ children }: { children: ReactNode }) => <>{children}</>
}));

import { BotDialogueWindowChooseComposer, BotDialogueWindowEvent } from '@octane/renderer';
import { BotDialogueWindowView } from './BotDialogueWindowView';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.handlers.clear();
});

const items = [
    { label: 'Bread', icon: 'Breadbasket', price: 4, detail: '+25 hunger', tab: 0, maxAmount: 10 },
    { label: 'Coffee', icon: 'coffeecup1', price: 5, detail: '+30 energy', tab: 1, maxAmount: 1 }
];

const show = (botId: number, nonce: number, extra: Record<string, unknown> = {}) => {
    act(() =>
        mocks.handlers.get(BotDialogueWindowEvent)?.({
            getParser: () => ({
                botId,
                nonce,
                closed: nonce === 0,
                title: 'Clerk',
                text: 'What do you need?',
                action: 'Buy',
                tabs: ['Food', 'Drinks'],
                items,
                footer: ['Cash: 120'],
                ...extra
            })
        })
    );
};

const choices = () =>
    mocks.sendMessageComposer.mock.calls
        .map(([composer]) => composer)
        .filter((composer) => composer instanceof (BotDialogueWindowChooseComposer as never))
        .map((composer: any) => composer.args);

describe('BotDialogueWindowView', () => {
    it('shows nothing until a window arrives', () => {
        render(<BotDialogueWindowView />);

        expect(screen.queryByTestId('window')).toBeNull();
    });

    it('shows the bot, the tab items with their furni icon and the footer', () => {
        const { container } = render(<BotDialogueWindowView />);
        show(-7, 42);

        expect(screen.getByText('What do you need?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Bread/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Coffee/ })).toBeNull();
        expect(container.querySelector('img')?.getAttribute('src')).toBe('http://icons/Breadbasket_icon.png');
        expect(screen.getByText('Cash: 120')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Drinks' }));

        expect(screen.getByRole('button', { name: /Coffee/ })).toBeInTheDocument();
    });

    it('takes the selected item with the amount and the window code, once until the next window', () => {
        render(<BotDialogueWindowView />);
        show(-7, 42);

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        fireEvent.click(screen.getByRole('button', { name: /Buy · 12/ }));
        fireEvent.click(screen.getByRole('button', { name: /Buy/ }));

        expect(choices()).toEqual([[-7, 42, 0, 3]]);

        show(-7, 43);
        fireEvent.click(screen.getByRole('button', { name: /Buy · 4/ }));

        expect(choices()).toEqual([
            [-7, 42, 0, 3],
            [-7, 43, 0, 1]
        ]);
    });

    it('hides the amount for an item taken one at a time', () => {
        render(<BotDialogueWindowView />);
        show(-7, 42);
        fireEvent.click(screen.getByRole('button', { name: 'Drinks' }));

        expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Buy · 5/ }));

        expect(choices()).toEqual([[-7, 42, 1, 1]]);
    });

    it('closes when its bot closes it, not for another bot', () => {
        render(<BotDialogueWindowView />);
        show(-7, 42);
        show(-8, 0);

        expect(screen.getByTestId('window')).toBeInTheDocument();

        show(-7, 0);

        expect(screen.queryByTestId('window')).toBeNull();
    });
});
