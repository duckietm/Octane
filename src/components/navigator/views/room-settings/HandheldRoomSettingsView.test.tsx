import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const h = vi.hoisted(() => ({
    handlers: new Map<string, (event: unknown) => void>(),
    sent: [] as { constructor: { name: string }; args: unknown[] }[],
    links: [] as string[],
    confirms: [] as unknown[][]
}));

// Every packet is a named class that keeps its arguments, so a test can read what was sent.
vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    const target: Record<string, unknown> = {
        ...actual,
        CreateLinkEvent: (link: string) => h.links.push(link),
        RoomDataParser: { OPEN_STATE: 0, DOORBELL_STATE: 1, PASSWORD_STATE: 2, INVISIBLE_STATE: 3 },
        GetSessionDataManager: () => ({ userId: 1, hasSecurity: () => false })
    };

    return new Proxy(target, {
        has: (t, k) => (typeof k === 'string' && k !== 'then' ? true : k in t),
        get: (t, k) => {
            if (typeof k !== 'string' || k === 'then') return t[k as string];
            if (!(k in t)) {
                t[k] = {
                    [k]: class {
                        args: unknown[];
                        constructor(...args: unknown[]) {
                            this.args = args;
                        }
                    }
                }[k];
            }

            return t[k];
        }
    });
});

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        SendMessageComposer: (composer: { constructor: { name: string }; args: unknown[] }) => h.sent.push(composer),
        CreateLinkEvent: (link: string) => h.links.push(link),
        GetClubMemberLevel: () => 1
    };
});
vi.mock('../../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../../api/utils/localizeWithFallback', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));

vi.mock('../../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');

    return {
        ...actual,
        useMessageEvent: (type: { name: string }, handler: (event: unknown) => void) => {
            h.handlers.set(type.name, handler);
        },
        useNavigatorData: () => ({
            categories: [{ id: 1, name: 'Chat', visible: true, automatic: false }],
            navigatorData: { enteredGuestRoom: null, homeRoomId: 0 }
        }),
        useNotification: () => ({ showConfirm: (...args: unknown[]) => h.confirms.push(args) }),
        useSoundboard: () => ({ roomMode: 1, setRoomMode: () => undefined }),
        useFriends: () => ({ onlineFriends: [{ id: 5, name: 'Lotte' }], offlineFriends: [] })
    };
});

import { NavigatorRoomSettingsView } from './NavigatorRoomSettingsView';

const ROOM = {
    roomId: 77,
    name: 'Beach',
    description: 'Sun',
    categoryId: 1,
    maximumVisitorsLimit: 25,
    tags: ['sun'],
    tradeMode: 2,
    allowWalkThrough: true,
    allowUnderpass: false,
    muteAllPets: false,
    leaveOnDoorTileEnabled: true,
    idleSleepEnabled: false,
    idleSleepTimeoutSeconds: 0,
    idleAutokickEnabled: false,
    idleAutokickTimeoutSeconds: 0,
    doorMode: 0,
    allowPets: true,
    allowFoodConsume: false,
    hideWalls: false,
    wallThickness: 0,
    floorThickness: 0,
    chatSettings: { mode: 0, weight: 0, speed: 1, distance: 14, protection: 1 },
    roomModerationSettings: { allowMute: 1, allowKick: 1, allowBan: 1 },
    hiddenByBc: false
};

const fire = (name: string, parser: unknown) => act(() => h.handlers.get(name)?.({ getParser: () => parser }));
const sent = (name: string) => h.sent.filter((composer) => composer.constructor.name === name);
const openTab = (key: string) => fireEvent.click(screen.getByRole('tab', { name: key }));

const open = () => {
    render(<NavigatorRoomSettingsView />);
    fire('RoomSettingsDataEvent', { data: ROOM });
};

describe('room settings on a phone', () => {
    beforeEach(() => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } })));

    afterEach(() => {
        cleanup();
        h.sent.length = 0;
        h.links.length = 0;
        h.confirms.length = 0;
        h.handlers.clear();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('is a sheet with the five tabs as pills and the room in its strip', () => {
        open();

        expect(document.querySelector('.octane-handheld-rs')).not.toBeNull();
        expect(screen.getAllByRole('tab')).toHaveLength(5);
        expect(screen.getByTestId('rs-status').textContent).toContain('Beach');
        expect(screen.getByTestId('rs-status').getAttribute('data-state')).toBe('idle');
    });

    it('sends the whole settings on a change and shows when the server took it', () => {
        open();
        fireEvent.click(screen.getByRole('checkbox', { name: 'navigator.roomsettings.allow_walk_through' }));

        const saves = sent('SaveRoomSettingsComposer');

        expect(saves).toHaveLength(1);
        expect(saves[0].args[0]).toBe(77);
        expect(screen.getByTestId('rs-status').getAttribute('data-state')).toBe('saving');

        fire('RoomSettingsSavedEvent', { roomId: 77 });

        expect(screen.getByTestId('rs-status').getAttribute('data-state')).toBe('saved');
    });

    it('asks before deleting the room in a card, and deletes only on confirm', () => {
        open();
        fireEvent.click(screen.getByRole('button', { name: /navigator.roomsettings.delete/ }));

        const card = screen.getByRole('alertdialog');

        expect(h.confirms).toHaveLength(0);
        fireEvent.click(within(card).getByRole('button', { name: 'generic.cancel' }));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(sent('RoomDeleteComposer')).toHaveLength(0);

        fireEvent.click(screen.getByRole('button', { name: /navigator.roomsettings.delete/ }));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

        expect(sent('RoomDeleteComposer')[0].args).toEqual([77]);
        expect(h.links).toContain('navigator/search/myworld_view');
        expect(screen.queryByTestId('rs-status')).toBeNull();
    });

    it('sets the door mode from its rows and sends the password only when both fields match', () => {
        open();
        openTab('navigator.roomsettings.tab.2');
        fireEvent.click(screen.getByRole('radio', { name: 'navigator.roomsettings.doormode.doorbell' }));

        expect(sent('SaveRoomSettingsComposer').at(-1).args[3]).toBe(1);

        fireEvent.click(screen.getByRole('radio', { name: 'navigator.roomsettings.doormode.password' }));

        const lock = screen.getByRole('button', { name: 'Lock with this password' });

        fireEvent.change(screen.getByLabelText('navigator.roomsettings.password'), { target: { value: 'abc' } });
        fireEvent.change(screen.getByLabelText('navigator.roomsettings.passwordconfirm'), { target: { value: 'abd' } });
        expect(lock).toBeDisabled();
        expect(screen.getByText('navigator.roomsettings.invalidconfirm')).not.toBeNull();

        fireEvent.change(screen.getByLabelText('navigator.roomsettings.passwordconfirm'), { target: { value: 'abc' } });
        fireEvent.click(lock);

        const save = sent('SaveRoomSettingsComposer').at(-1);

        expect(save.args[3]).toBe(2);
        expect(save.args[4]).toBe('abc');
    });

    it('takes and gives rights from the cards, and clears all', () => {
        open();
        openTab('navigator.roomsettings.tab.3');
        fire('FlatControllersEvent', { roomId: 77, users: new Map([[9, 'Sanne']]) });

        fireEvent.click(screen.getByRole('button', { name: 'Remove: Sanne' }));
        fireEvent.click(screen.getByRole('button', { name: 'Give rights: Lotte' }));
        fireEvent.click(screen.getByRole('button', { name: 'navigator.flatctrls.clear' }));

        expect(sent('RoomTakeRightsComposer')[0].args).toEqual([9]);
        expect(sent('RoomGiveRightsComposer')[0].args).toEqual([5]);
        expect(sent('RemoveAllRightsMessageComposer')[0].args).toEqual([77]);
        // Rights are no room setting: the strip does not speak of saving there.
        expect(screen.getByTestId('rs-status').getAttribute('data-state')).toBe('none');
    });

    it('unbans straight from a banned user card', () => {
        open();
        openTab('navigator.roomsettings.tab.5');
        fire('BannedUsersFromRoomEvent', { roomId: 77, bannedUsers: [{ userId: 20, userName: 'Troll' }] });

        fireEvent.click(screen.getByRole('button', { name: 'navigator.roomsettings.moderation.unban: Troll' }));

        expect(sent('RoomUnbanUserComposer')[0].args).toEqual([20, 77]);
        expect(screen.queryByTestId('rs-person-20')).toBeNull();
    });

    it('offers the chat help on the chat tab only', () => {
        open();
        expect(screen.queryByRole('button', { name: 'Help' })).toBeNull();

        openTab('navigator.roomsettings.tab.4');
        fireEvent.click(screen.getByRole('button', { name: 'Help' }));

        expect(h.links).toContain('habbopages/chat/options');
    });
});

describe('room settings on the desktop', () => {
    afterEach(() => {
        cleanup();
        h.sent.length = 0;
        h.confirms.length = 0;
    });

    it('keeps its window and asks the delete question through the confirm window', () => {
        render(<NavigatorRoomSettingsView />);
        fire('RoomSettingsDataEvent', { data: ROOM });

        expect(document.querySelector('.octane-room-settings')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-rs')).toBeNull();

        fireEvent.click(screen.getByText('navigator.roomsettings.delete'));

        expect(h.confirms).toHaveLength(1);
        expect(h.confirms[0][5]).toBe('navigator.roomsettings.deleteroom.confirm.title');
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });
});
