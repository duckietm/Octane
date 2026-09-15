import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryTradeNameScamWarningView, NAME_SCAM_CLOSE_LOCK_SECONDS } from './InventoryTradeNameScamWarningView';

const getUserProfile = vi.fn();

vi.mock('../../../../api', () => ({
    GetUserProfile: (userId: number) => getUserProfile(userId),
    localizeWithFallback: (_key: string, fallback: string, parameters: string[] = [], replacements: string[] = []) =>
        parameters.reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements[index]), fallback)
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    LayoutAvatarImageView: ({ figure }: any) => <div data-testid="avatar" data-figure={figure} />,
    OctaneCardView: ({ children }: any) => <div role="dialog">{children}</div>,
    OctaneCardHeaderView: ({ headerText, onCloseClick }: any) => (
        <div>
            <span>{headerText}</span>
            <button aria-label="close" type="button" onClick={onCloseClick}>
                x
            </button>
        </div>
    ),
    OctaneCardContentView: ({ children }: any) => <div>{children}</div>
}));

const warning = {
    tradedUserId: 42,
    tradedUserName: 'Habb0',
    tradedUserFigure: 'hr-100',
    similarInRoom: ['Habbo', 'habbo'],
    similarInFriends: [] as string[]
};

beforeEach(() => {
    vi.useFakeTimers();
    getUserProfile.mockClear();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('trading name-scam warning (inventory_trading_name_scam_warning.xml)', () => {
    it('names the partner, lists the look-alikes and opens the profile', () => {
        render(<InventoryTradeNameScamWarningView warning={warning} onClose={() => undefined} />);

        expect(screen.getByTestId('namescam-warning-text')).toHaveTextContent('The name of Habb0 looks very similar');
        expect(screen.getByTestId('namescam-trader-name')).toHaveTextContent('Habb0');
        expect(screen.getByTestId('avatar')).toHaveAttribute('data-figure', 'hr-100');
        expect(screen.getByTestId('namescam-room-matches')).toHaveTextContent('Habbo');
        expect(screen.queryByTestId('namescam-friend-matches')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
        expect(getUserProfile).toHaveBeenCalledWith(42);
    });

    it('locks both close buttons for six seconds with a countdown (CLOSE_LOCK_SECONDS)', () => {
        const onClose = vi.fn();

        render(<InventoryTradeNameScamWarningView warning={warning} onClose={onClose} />);

        const closeButton = screen.getByRole('button', { name: 'Close' });

        expect(closeButton).toBeDisabled();
        expect(screen.getByTestId('namescam-close-countdown')).toHaveTextContent(`${NAME_SCAM_CLOSE_LOCK_SECONDS}s`);

        fireEvent.click(screen.getByRole('button', { name: 'close' }));
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(NAME_SCAM_CLOSE_LOCK_SECONDS * 1000);
        });

        expect(closeButton).toBeEnabled();
        expect(screen.queryByTestId('namescam-close-countdown')).toBeNull();

        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledOnce();
    });
});
