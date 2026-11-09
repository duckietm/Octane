import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    links: [] as string[],
    sent: [] as unknown[],
    openUrl: vi.fn(),
    safetyLocked: false,
    config: {} as Record<string, unknown>
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => mocks.links.push(link),
    GetSessionDataManager: () => ({ isSafetyLocked: mocks.safetyLocked })
}));

vi.mock('../../../api', async (importOriginal) => {
    const value = (key: string, fallback: unknown) => (key in mocks.config ? mocks.config[key] : fallback);

    return {
        ...(await importOriginal<typeof import('../../../api')>()),
        GetConfigurationValue: value,
        GetOptionalConfigurationValue: value,
        localizeWithFallback: (_key: string, fallback: string) => fallback,
        OpenUrl: mocks.openUrl,
        SendMessageComposer: (composer: unknown) => mocks.sent.push(composer)
    };
});

vi.mock('../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler)
}));

import { AccountSafetyLockStatusChangeMessageEvent, ClubGiftInfoEvent, ClubGiftNotificationEvent, GetClubGiftInfo, UserInfoEvent } from '@octane/renderer';
import { PurseNoticesView } from './PurseNoticesView';

const fire = (type: unknown, parser: unknown) => act(() => mocks.handlers.get(type)?.({ getParser: () => parser }));

describe('PurseNoticesView (AIR SingularNotificationController notices)', () => {
    beforeEach(() => {
        mocks.config = { 'catalog.links': { 'hc.hc_gifts': 'club_gifts' } };
        mocks.safetyLocked = false;
    });

    afterEach(() => {
        cleanup();
        mocks.handlers.clear();
        mocks.links.length = 0;
        mocks.sent.length = 0;
        mocks.openUrl.mockClear();
    });

    it('asks for the club gift info and shows the gift notice while gifts wait', () => {
        render(<PurseNoticesView />);

        expect(mocks.sent.some((composer) => composer instanceof GetClubGiftInfo)).toBe(true);
        expect(screen.queryByText('Choose your gift')).toBeNull();

        fire(ClubGiftInfoEvent, { giftsAvailable: 2 });
        fireEvent.click(screen.getByRole('button', { name: 'Choose your gift' }));

        expect(mocks.links).toEqual(['catalog/open/club_gifts']);
        expect(screen.queryByText('Choose your gift')).toBeNull();
    });

    it('stays away for the session after "Not now"', () => {
        render(<PurseNoticesView />);

        fire(ClubGiftNotificationEvent, { numGifts: 1 });
        fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
        fire(ClubGiftNotificationEvent, { numGifts: 1 });

        expect(screen.queryByText('Choose your gift')).toBeNull();
    });

    it('goes when the last gift is picked', () => {
        render(<PurseNoticesView />);

        fire(ClubGiftNotificationEvent, { numGifts: 1 });
        fire(ClubGiftInfoEvent, { giftsAvailable: 0 });

        expect(screen.queryByText('Choose your gift')).toBeNull();
    });

    it('warns about a safety locked account until it is unlocked', () => {
        mocks.config['link.format.safetylock_unlock'] = 'https://hotel/unlock';
        render(<PurseNoticesView />);

        expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();

        fire(UserInfoEvent, { userInfo: { safetyLocked: true } });
        fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
        expect(mocks.openUrl).toHaveBeenCalledWith('https://hotel/unlock');

        fire(AccountSafetyLockStatusChangeMessageEvent, { status: 1 });
        expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();
    });

    it('starts from the session when the login data came first', () => {
        mocks.safetyLocked = true;
        render(<PurseNoticesView />);

        expect(screen.getByText(/safety lock of this account is on/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();
    });
});
