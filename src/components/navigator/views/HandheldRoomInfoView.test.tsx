import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';

const h = vi.hoisted(() => ({
    handlers: new Map<string, (event: unknown) => void>(),
    sent: [] as { constructor: { name: string }; args: unknown[] }[],
    links: [] as string[],
    confirms: [] as unknown[][],
    ownerId: 1,
    permissions: [] as string[]
}));

// Every packet is a named class that keeps its arguments, so a test can read what was sent.
vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    const target: Record<string, unknown> = {
        ...actual,
        CreateLinkEvent: (link: string) => h.links.push(link),
        RoomDataParser: { OPEN_STATE: 0, DOORBELL_STATE: 1, PASSWORD_STATE: 2, INVISIBLE_STATE: 3 },
        GetSessionDataManager: () => ({ userId: 1, hasSecurity: () => false, getGroupBadgeImage: () => null })
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

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../api')>('../../../api');

    return {
        ...actual,
        SendMessageComposer: (composer: { constructor: { name: string }; args: unknown[] }) => h.sent.push(composer),
        CreateLinkEvent: (link: string) => h.links.push(link),
        GetClubMemberLevel: () => 1,
        GetConfigurationValue: (key: string, fallback: unknown) =>
            key === 'navigator.room.models'
                ? [
                      { clubLevel: 0, tileSize: 104, name: 'a' },
                      { clubLevel: 0, tileSize: 36, name: 'c' },
                      { clubLevel: 1, tileSize: 416, name: 'i' }
                  ]
                : key === 'thumbnails.url'
                  ? 'thumb-%thumbnail%.png'
                  : fallback
    };
});
vi.mock('../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../../api/utils/localizeWithFallback', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback }));

vi.mock('../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../hooks')>('../../../hooks');

    return {
        ...actual,
        useMessageEvent: (type: { name: string }, handler: (event: unknown) => void) => {
            h.handlers.set(type.name, handler);
        },
        useNavigatorData: () => ({
            categories: [
                { id: 1, name: 'Chat', visible: true, automatic: false, staffOnly: false },
                { id: 2, name: 'Games', visible: true, automatic: false, staffOnly: false }
            ],
            navigatorData: {
                enteredGuestRoom: {
                    roomId: 77,
                    roomName: 'Beach',
                    ownerId: h.ownerId,
                    ownerName: 'Bas',
                    showOwner: true,
                    description: 'Sun',
                    officialRoomPicRef: '',
                    habboGroupId: 0,
                    groupBadgeCode: '',
                    groupName: '',
                    allInRoomMuted: false
                },
                homeRoomId: 0,
                currentRoomRating: 3,
                currentRoomIsStaffPick: false
            }
        }),
        useHasPermission: (permission: string) => h.permissions.includes(permission),
        useHelp: () => ({ report: (...args: unknown[]) => h.confirms.push(['report', ...args]) }),
        useRoom: () => ({ roomSession: { controllerLevel: 0 } }),
        useNavigatorFavourite: () => ({ isFavourite: false, toggle: () => h.links.push('favourite') }),
        useUserDataSnapshot: () => ({ clubLevel: 0, securityLevel: 0 }),
        useUserPermissions: () => new Map(),
        useRoomCreateLimitAlert: () => undefined
    };
});

import { useNavigatorUiStore } from '../../../hooks/navigator/navigatorUiStore';
import { NavigatorEnforceCategoryView } from './NavigatorEnforceCategoryView';
import { NavigatorRoomCreatorView } from './NavigatorRoomCreatorView';
import { NavigatorRoomInfoView } from './NavigatorRoomInfoView';
import { useRoomCreatorStore } from './navigatorRoomCreatorStore';

const fire = (name: string, parser: unknown) => act(() => h.handlers.get(name)?.({ getParser: () => parser }));
const sent = (name: string) => h.sent.filter((composer) => composer.constructor.name === name);
const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

afterEach(() => {
    cleanup();
    h.sent.length = 0;
    h.links.length = 0;
    h.confirms.length = 0;
    h.handlers.clear();
    h.ownerId = 1;
    h.permissions = [];
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('room info on a phone', () => {
    beforeEach(phone);

    it('gives the owner the settings, word filter, floor plan and mute rows, each sending what the desktop sends', () => {
        render(<NavigatorRoomInfoView onCloseClick={() => h.links.push('closed')} />);

        expect(screen.getByTestId('room-info')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'navigator.roomsettings' }));
        fireEvent.click(screen.getByRole('button', { name: 'navigator.roomsettings.roomfilter' }));
        fireEvent.click(screen.getByRole('button', { name: 'open.floor.plan.editor' }));
        fireEvent.click(screen.getByRole('button', { name: 'navigator.muteall_off' }));
        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));

        expect(sent('RoomSettingsComposer')[0].args).toEqual([77]);
        expect(sent('GetCustomRoomFilterMessageComposer')[0].args).toEqual([77]);
        expect(h.links).toEqual(expect.arrayContaining(['floor-editor/toggle', 'closed']));
        expect(sent('RoomMuteComposer')).toHaveLength(1);
        // The owner does not favourite his own room.
        expect(screen.queryByRole('button', { name: /navigator.room.popup.room.info.favorite/ })).toBeNull();
    });

    it('shows a visitor no owner tools, but the room link, favourite and report', () => {
        h.ownerId = 2;
        render(<NavigatorRoomInfoView onCloseClick={() => undefined} />);

        expect(screen.queryByRole('button', { name: 'navigator.roomsettings' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'navigator.thumbnail.camera.title' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /navigator.embed.caption/ }));
        fireEvent.click(screen.getByRole('button', { name: /navigator.room.popup.room.info.favorite/ }));
        fireEvent.click(screen.getByRole('button', { name: 'help.emergency.main.report.room' }));

        expect(h.links).toEqual(expect.arrayContaining(['navigator/toggle-room-link', 'favourite']));
        expect(h.confirms[0][0]).toBe('report');
    });

    it('sets the home room from the house toggle', () => {
        render(<NavigatorRoomInfoView onCloseClick={() => undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'navigator.room.popup.room.info.home' }));

        expect(sent('UpdateHomeRoomMessageComposer')[0].args).toEqual([77]);
    });

    it('lets staff pick the room', () => {
        h.permissions = ['acc_staff_pick'];
        render(<NavigatorRoomInfoView onCloseClick={() => undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'navigator.staffpicks.pick' }));

        expect(sent('ToggleStaffPickMessageComposer')[0].args).toEqual([77]);
    });
});

describe('room creator on a phone', () => {
    beforeEach(phone);

    it('checks the name, then creates the room with the picked layout', () => {
        useRoomCreatorStore.setState({ isCreating: false });
        render(<NavigatorRoomCreatorView />);

        fireEvent.click(screen.getByRole('button', { name: 'navigator.createroom.create' }));
        expect(screen.getByRole('alert').textContent).toBe('navigator.createroom.nameerr');
        expect(sent('CreateFlatMessageComposer')).toHaveLength(0);

        const name = screen.getByLabelText('navigator.roomname');

        fireEvent.focus(name);
        fireEvent.change(name, { target: { value: 'My room' } });
        fireEvent.click(screen.getByRole('button', { name: '36 navigator.createroom.tilesize' }));
        fireEvent.click(screen.getByRole('button', { name: 'navigator.createroom.create' }));

        const create = sent('CreateFlatMessageComposer')[0];

        expect(create.args[0]).toBe('My room');
        expect(create.args[2]).toBe('model_c');
        expect(create.args[3]).toBe(1);
        useRoomCreatorStore.getState().endCreate();
    });

    it('sends a player without HC to the HC centre for an HC layout, and cancel closes it', () => {
        const closeCreator = vi.spyOn(useNavigatorUiStore.getState(), 'closeCreator');

        render(<NavigatorRoomCreatorView />);
        fireEvent.click(screen.getByRole('button', { name: '416 navigator.createroom.tilesize' }));

        expect(h.links).toContain('habboUI/open/hccenter');
        expect(screen.getByRole('button', { name: '104 navigator.createroom.tilesize' }).getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));
        expect(closeCreator).toHaveBeenCalled();
    });
});

describe('category choice on a phone', () => {
    beforeEach(phone);

    it('is a card that sends the category and trade mode', () => {
        render(<NavigatorEnforceCategoryView />);
        fire('FlatCreatedEvent', { roomId: 88 });
        fire('ShowEnforceRoomCategoryDialogEvent', { selectionType: 1 });

        expect(screen.getByTestId('enforce-category')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'OK' }));

        expect(sent('UpdateRoomCategoryAndTradeSettingsComposer')[0].args).toEqual([88, 1, 0]);
        expect(screen.queryByTestId('enforce-category')).toBeNull();
    });
});

describe('the same windows on the desktop', () => {
    it('keep their desktop frames', () => {
        render(<NavigatorRoomInfoView onCloseClick={() => undefined} />);
        render(<NavigatorRoomCreatorView />);

        expect(document.querySelector('.octane-room-info')).not.toBeNull();
        expect(document.querySelector('.octane-room-creator-air')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-rs')).toBeNull();
    });
});
