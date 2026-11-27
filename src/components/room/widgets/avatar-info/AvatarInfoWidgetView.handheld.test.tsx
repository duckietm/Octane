/* @vitest-environment jsdom */

import { RoomObjectCategory } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarInfoFurni, AvatarInfoPet, AvatarInfoRentableBot, AvatarInfoUser, IAvatarInfo } from '../../../../api';
import { useHandheldStore } from '../../../../state/handheldStore';
import { AvatarInfoWidgetView } from './AvatarInfoWidgetView';

const TEXTS: Record<string, string> = {
    'infostand.button.use': 'Use',
    'infostand.button.move': 'Move',
    'infostand.button.rotate': 'Rotate',
    'infostand.button.pickup': 'Pick up',
    'infostand.button.eject': 'Eject',
    'infostand.button.buy': 'Buy',
    'infostand.button.friend': 'Add friend',
    'infostand.button.trade': 'Trade',
    'infostand.button.whisper': 'Whisper',
    'infostand.button.respect': 'Respect (%count%)',
    'infostand.button.ignore': 'Ignore',
    'infostand.button.unignore': 'Listen',
    'infostand.button.report': 'Report',
    'infostand.link.relationship': 'Relationship',
    'infostand.link.moderate': 'Moderate',
    'infostand.button.kick': 'Kick',
    'infostand.button.mute': 'Mute',
    'infostand.button.ban': 'Ban',
    'infostand.button.ban_hour': 'Ban for an hour',
    'infostand.button.ban_day': 'Ban for a day',
    'infostand.button.perm_ban': 'Ban for good',
    'infostand.button.mute_2min': '2 minutes',
    'infostand.button.mute_5min': '5 minutes',
    'infostand.button.mute_10min': '10 minutes',
    'infostand.button.giverights': 'Give rights',
    'infostand.button.removerights': 'Remove rights',
    'infostand.button.petrespect': 'Scratch (%count%)',
    'infostand.button.train': 'Train',
    'infostand.button.buyfood': 'Buy food',
    'infostand.button.breed': 'Breed',
    'inventory.pets.pickup': 'Pick up',
    'infostand.link.expressions': 'Actions',
    'infostand.show.signs': 'Signs',
    'widget.memenu.myclothes': 'Change looks',
    'widget.memenu.dance': 'Dance',
    'widget.memenu.dance.stop': 'Stop dancing',
    'widget.memenu.dance1': 'Hap-Hop',
    'widget.memenu.dance2': 'Pogo Mogo',
    'widget.memenu.dance3': 'Duck Funk',
    'widget.memenu.dance4': 'The Rollie',
    'widget.memenu.wave': 'Wave',
    'widget.avatar.decorate': 'Decorate',
    'avatar.widget.change_bot_name': 'Change name',
    'avatar.widget.dress_up': 'Dress up',
    'avatar.widget.random_walk': 'Walk around',
    'avatar.widget.setup_chat': 'Set up speech',
    'avatar.widget.dance': 'Dance',
    'avatar.widget.pick_up': 'Pick up',
    'tooltip.roombuilding.rotate': 'Turn',
    'generic.back': 'Back',
    'widgets.pet.commands.title': 'Pet commands',
    'bot.skill.name.configuration.title': 'Bot name',
    'bot.skill.name.configuration.new.name': 'Choose a name:',
    'furni.owner': 'Owner: %name%',
    'infostand.text.petowner': 'Owner: %name%',
    'infostand.text.botowner': 'Owner: %name%',
    'infostand.text.achievement_score': 'Achievement score:',
    'pet.level': 'Level %level% / %maxlevel%',
    'pet.age': 'Age: %age% days',
    'infostand.text.petrespect': 'Scratched %count% times',
    'infostand.pet.text.happiness': 'Happiness',
    'infostand.pet.text.experience': 'Experience',
    'infostand.pet.text.energy': 'Energy',
    'pet.breed.0.3': 'Golden retriever',
    cancel: 'Cancel',
    save: 'Save'
};

const localize = (key: string, parameters: string[] = [], values: string[] = []) => {
    let text = TEXTS[key] ?? (/^pet\.command\./.test(key) ? ['Sit', 'Lie down', 'Follow', 'Beg', 'Play dead', 'Stay', 'Jump', 'Speak', 'Play', 'Silent'][Number(key.split('.')[2]) % 10] : key);

    parameters.forEach((parameter, index) => (text = text.replace(`%${parameter}%`, values[index])));

    return text;
};

const mocks = vi.hoisted(() => ({
    avatarInfo: null as unknown,
    handheld: true,
    canRequestFriend: true,
    showInspect: false,
    staff: false,
    linkTracker: null as { linkReceived: (url: string) => void } | null,
    messageHandlers: new Map<unknown, (event: unknown) => void>(),
    createLinkEvent: vi.fn(),
    dispatchUiEvent: vi.fn(),
    getUserProfile: vi.fn(),
    sendMessageComposer: vi.fn(),
    processRoomObjectOperation: vi.fn(),
    useRoomObject: vi.fn(),
    pickupRoomObject: vi.fn(),
    respectUser: vi.fn(),
    respectPet: vi.fn(),
    openInspectionForFurni: vi.fn(),
    roomSession: {
        roomId: 1,
        ownRoomIndex: 0,
        playTestMode: false,
        controllerLevel: 0,
        isRoomOwner: false,
        sendKickMessage: vi.fn(),
        sendBanMessage: vi.fn(),
        sendMuteMessage: vi.fn(),
        sendGiveRightsMessage: vi.fn(),
        sendTakeRightsMessage: vi.fn(),
        sendDanceMessage: vi.fn(),
        sendSignMessage: vi.fn(),
        sendExpressionMessage: vi.fn(),
        sendPostureMessage: vi.fn(),
        sendChatMessage: vi.fn(),
        requestPetCommands: vi.fn(),
        pickupPet: vi.fn(),
        userDataManager: { getPetData: () => ({ name: 'Rex', figure: '0 3 ffffff' }) }
    }
}));

vi.mock('@octane/renderer', async (importOriginal) => {
    const original = await importOriginal<Record<string, unknown>>();
    const roomObject = {
        type: 'chair_plasto',
        id: 7,
        getLocation: () => ({ x: 4, y: 6, z: 0 }),
        getDirection: () => ({ x: 90 }),
        getState: () => 1,
        model: { getValue: () => null as unknown }
    };

    // Events and composers the shared renderer stub does not carry: plain classes that keep what they were built with.
    const stubs = Object.fromEntries(
        [
            'RoomSessionDanceEvent',
            'FlatControllerAddedEvent',
            'FlatControllerRemovedEvent',
            'PetTrainingPanelMessageEvent',
            'BotCommandConfigurationEvent',
            'FurnitureFloorUpdateEvent',
            'NowPlayingEvent',
            'SongInfoReceivedEvent',
            'RelationshipStatusInfoEvent',
            'RoomSessionFavoriteGroupUpdateEvent',
            'RoomSessionUserBadgesEvent',
            'RoomSessionUserFigureUpdateEvent',
            'UserRelationshipsComposer',
            'TradingOpenComposer',
            'SetRelationshipStatusComposer',
            'RoomUnitGiveHandItemComposer',
            'RoomUnitDropHandItemComposer',
            'PetRespectComposer',
            'RoomUnitGiveHandItemPetComposer',
            'BotRemoveComposer',
            'BotSkillSaveComposer',
            'RequestBotCommandConfigurationComposer',
            'UpdateFurniturePositionComposer',
            'RoomRemoveBackgroundComposer'
        ].map((name) => [
            name,
            class {
                public args: unknown[];

                constructor(...args: unknown[]) {
                    this.args = args;
                }
            }
        ])
    );

    return {
        ...original,
        ...stubs,
        AvatarExpressionEnum: { WAVE: { ordinal: 1 }, BLOW: { ordinal: 2 }, LAUGH: { ordinal: 3 }, IDLE: { ordinal: 5 }, EXPRESSION_67: { ordinal: 67 } },
        CreateLinkEvent: mocks.createLinkEvent,
        AddLinkEventTracker: (tracker: { linkReceived: (url: string) => void }) => (mocks.linkTracker = tracker),
        RemoveLinkEventTracker: vi.fn(),
        RoomEnterEffect: { isRunning: () => false },
        RoomObjectOperationType: { OBJECT_MOVE: 'OBJECT_MOVE', OBJECT_ROTATE_POSITIVE: 'OBJECT_ROTATE_POSITIVE', OBJECT_PICKUP: 'OBJECT_PICKUP', OBJECT_EJECT: 'OBJECT_EJECT', OBJECT_SAVE_STUFF_DATA: 'OBJECT_SAVE_STUFF_DATA' },
        RoomWidgetFurniInfoUsagePolicyEnum: { NOBODY: 0, CONTROLLER: 1, EVERYBODY: 2 },
        RoomObjectVariable: { FURNITURE_TYPE_ID: 'type_id', FURNITURE_DATA: 'data', FIGURE_CARRY_OBJECT: 'carry', FIGURE_EFFECT: 'effect' },
        PetType: { DOG: 0, CAT: 1, TERRIER: 2, BEAR: 3, PIG: 4, HORSE: 15, MONSTERPLANT: 16 },
        GetRoomEngine: () => ({
            activeRoomId: 1,
            activeRoomHasFreeFurniMovementsMode: false,
            activeRoomHasHanditemControlBlocked: false,
            getRoomObject: () => roomObject,
            processRoomObjectOperation: mocks.processRoomObjectOperation,
            useRoomObject: mocks.useRoomObject,
            clearSelectedAvatar: vi.fn()
        }),
        GetSessionDataManager: () => ({
            userId: 1,
            userName: 'Octavia',
            tags: [],
            getFloorItemData: () => ({ className: 'chair_plasto', specialType: 0 }),
            getWallItemData: () => null,
            getUserTags: vi.fn(),
            ignoreUser: vi.fn(),
            unignoreUser: vi.fn(),
            hasSecurity: () => false
        }),
        GetSoundManager: () => ({ musicController: { getSongInfo: () => null, getRoomItemPlaylist: () => null } })
    };
});

vi.mock('../../../../api', async (importOriginal) => {
    const original = await importOriginal<Record<string, unknown>>();

    return {
        ...original,
        LocalizeText: (key: string, parameters?: string[], values?: string[]) => localize(key, parameters, values),
        localizeWithFallback: (_key: string, fallback: string) => fallback,
        GetConfigurationValue: (_key: string, fallback?: unknown) => fallback,
        GetOptionalConfigurationValue: (_key: string, fallback?: unknown) => fallback,
        isBuildersClubEnabled: () => false,
        isHousekeepingEnabled: () => false,
        SendMessageComposer: mocks.sendMessageComposer,
        DispatchUiEvent: mocks.dispatchUiEvent,
        GetUserProfile: mocks.getUserProfile,
        GetGroupInformation: vi.fn(),
        GetOwnRoomObject: () => ({ model: { getValue: () => 0 } }),
        GetOwnPosture: () => 'std',
        GetCanStandUp: () => false,
        HasHabboClub: () => true,
        HasHabboVip: () => true,
        IsRidingHorse: () => false,
        IsAnyRoomController: () => false,
        ensureBadgeLeaderboardLoaded: () => new Promise(() => {}),
        GetHotelSettings: () => null,
        resolveServerLength: (_settings: unknown, _key: string, fallback: number) => fallback
    };
});

vi.mock('../../../../common', async (importOriginal) => {
    const original = await importOriginal<Record<string, unknown>>();

    return {
        ...original,
        LayoutRoomObjectImageView: () => <i className="ph-furni octane-room-object-image" />,
        LayoutAvatarImageView: ({ headOnly }: { headOnly?: boolean }) => <i className={headOnly ? 'ph-head' : 'ph-avatar avatar-image'} />,
        LayoutPetImageView: ({ headOnly }: { headOnly?: boolean }) => <i className={headOnly ? 'ph-pet-head' : 'ph-pet'} />,
        LayoutBadgeImageView: () => <i className="ph-badge" />,
        LayoutFurniIconImageView: () => <i className="ph-furni" />,
        UserProfileIconView: () => <i className="octane-friends-spritesheet icon-profile-sm" />,
        DraggableWindow: ({ children }: { children: unknown }) => <div>{children as never}</div>
    };
});

vi.mock('./infostand/InfoStandBadgeSlotView', () => ({ InfoStandBadgeSlotView: ({ badgeCode }: { badgeCode?: string }) => <div className="relative h-[42px] w-[42px]">{badgeCode && <i className="ph-badge" />}</div> }));

vi.mock('../../../../hooks', () => ({
    useAvatarInfoWidget: () => ({
        avatarInfo: mocks.avatarInfo,
        setAvatarInfo: (info: unknown) => (mocks.avatarInfo = info),
        activeNameBubble: null,
        setActiveNameBubble: vi.fn(),
        nameBubbles: [],
        removeNameBubble: vi.fn(),
        productBubbles: [],
        confirmingProduct: null,
        updateConfirmingProduct: vi.fn(),
        removeProductBubble: vi.fn(),
        isDecorating: false,
        setIsDecorating: vi.fn()
    }),
    useIsHandheld: () => mocks.handheld,
    useFurniPickupGuard: () => ({ pickupRoomObject: mocks.pickupRoomObject }),
    useFurnitureRecolorWidget: () => ({ open: vi.fn() }),
    useHasPermission: () => mocks.staff,
    useRareValues: () => ({ getValue: () => null }),
    useRecolorableColorStore: Object.assign(() => null, { getState: () => ({ setColor: vi.fn() }) }),
    useWiredLabelStore: (selector: (state: unknown) => unknown) => selector({ labels: {}, openSettings: vi.fn() }),
    useWiredTools: () => ({ openInspectionForFurni: mocks.openInspectionForFurni, openInspectionForUser: vi.fn(), showInspectButton: mocks.showInspect, roomSettings: { canModify: true } }),
    useRoom: () => ({ roomSession: mocks.roomSession }),
    useFriends: () => ({ canRequestFriend: () => mocks.canRequestFriend }),
    useHelp: () => ({ report: vi.fn() }),
    useIsUserBlocked: () => false,
    useIsUserIgnored: () => false,
    useNotification: () => ({ showConfirm: vi.fn(), simpleAlert: vi.fn() }),
    usePurse: () => ({ getCurrencyAmount: () => 100 }),
    useSessionInfo: () => ({ userRespectRemaining: 3, respectReplenishesLeft: 0, respectUser: mocks.respectUser, replenishRespect: vi.fn(), petRespectRemaining: 3, respectPet: mocks.respectPet, chatStyleId: 0 }),
    useAvatarEffects: () => ({ effects: [], activeEffectType: 0 }),
    useBackgroundTone: () => null,
    useInventoryBadges: () => ({ badgeCodes: [], activeBadgeCodes: [], requestBadges: vi.fn() }),
    useOctaneEvent: vi.fn(),
    useUiEvent: vi.fn(),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.messageHandlers.set(type, handler)
}));

const stuffData = { isUnique: false, uniqueNumber: 0, uniqueSeries: 0, rarityLevel: -1 };

const furni = (changes: Partial<AvatarInfoFurni> = {}) =>
    Object.assign(new AvatarInfoFurni(AvatarInfoFurni.FURNI), {
        id: 7,
        category: 10,
        name: 'Stella tile',
        description: 'A warm tile for cold feet.',
        ownerId: 3,
        ownerName: 'bop',
        spriteId: 120,
        stuffData,
        ...changes
    });

const peer = (changes: Partial<AvatarInfoUser> = {}) =>
    Object.assign(new AvatarInfoUser(AvatarInfoUser.PEER), {
        name: 'Marlowe',
        motto: 'Collecting rubber ducks since 2009',
        webID: 42,
        roomIndex: 5,
        figure: 'hd-180-1',
        badges: ['ACH_1', 'ACH_2', 'ACH_3'],
        achievementScore: 1280,
        canTrade: true,
        ...changes
    });

const own = () => Object.assign(new AvatarInfoUser(AvatarInfoUser.OWN_USER), { name: 'Octavia', motto: 'Building the hotel, one tile at a time', webID: 1, roomIndex: 0, figure: 'hd-180-1', badges: ['ACH_1'], achievementScore: 640 });

const pet = (changes: Partial<AvatarInfoPet> = {}) =>
    Object.assign(new AvatarInfoPet(AvatarInfoPet.PET_INFO), {
        id: 5,
        roomIndex: 9,
        name: 'Rex',
        petType: 0,
        petBreed: 3,
        petFigure: '0 3 ffffff',
        level: 4,
        maximumLevel: 20,
        experience: 120,
        levelExperienceGoal: 400,
        energy: 80,
        maximumEnergy: 100,
        happyness: 60,
        maximumHappyness: 100,
        age: 12,
        respect: 7,
        isOwner: true,
        ownerId: 1,
        ownerName: 'Octavia',
        ...changes
    });

const bot = (changes: Partial<AvatarInfoRentableBot> = {}) =>
    Object.assign(new AvatarInfoRentableBot(AvatarInfoRentableBot.RENTABLE_BOT), {
        name: 'Barkeep',
        motto: 'What will it be?',
        webID: 77,
        roomIndex: 11,
        figure: 'hd-180-1',
        badges: ['BOT'],
        ownerId: 1,
        ownerName: 'Octavia',
        amIOwner: true,
        // BotSkillsEnum: dress up, set up chat, random walk, dance, change name
        botSkills: [1, 2, 3, 4, 5],
        ...changes
    });

const setOrientation = (orientation: 'portrait' | 'landscape') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

let view: ReturnType<typeof render>;

/** Selects an object (or nothing) the way the room does: the widget's hook hands the view a new info. */
const select = (info: IAvatarInfo | null) => {
    mocks.avatarInfo = info;

    if (view) view.rerender(<AvatarInfoWidgetView />);
    else view = render(<AvatarInfoWidgetView />);
};

const drawer = () => screen.getByRole('region', { name: 'Selected in the room' });
const actionNames = () => [...drawer().querySelectorAll('.octane-handheld-drawer__actions .octane-handheld-drawer__action')].map((button) => button.textContent);
const tap = (name: string) => fireEvent.click(within(drawer()).getByRole('button', { name }));

beforeEach(() => {
    // A phone: the primary pointer is a finger.
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    mocks.handheld = true;
    mocks.canRequestFriend = true;
    mocks.showInspect = false;
    mocks.staff = false;
    mocks.messageHandlers.clear();
    setOrientation('portrait');
});

afterEach(() => {
    cleanup();
    view = null;
    vi.clearAllMocks();
    act(() => useHandheldStore.setState({ layout: { active: false, orientation: 'landscape' } }));
});

describe('phone drawer: furni', () => {
    it('peeks with the picture, name, owner and the first four actions, and opens to every action in sections', () => {
        select(furni({ isOwner: true, isRoomOwner: true, usagePolicy: 2, purchaseOfferId: 900 }));

        expect(drawer()).toHaveAttribute('data-state', 'peek');
        expect(within(drawer()).getByRole('heading', { name: 'Stella tile' })).toBeInTheDocument();
        expect(drawer().querySelector('.octane-handheld-drawer__subtitle')).toHaveTextContent('Owner: bop');
        expect(actionNames()).toEqual(['Use', 'Move', 'Rotate', 'Pick up']);
        expect(drawer().querySelector('.octane-handheld-drawer__details')).not.toBeVisible();

        tap('Show everything');

        expect(drawer()).toHaveAttribute('data-state', 'open');
        expect([...drawer().querySelectorAll('.octane-handheld-drawer__section')].map((heading) => heading.textContent)).toEqual(['Item', 'Shop']);
        expect(actionNames()).toEqual(['Use', 'Move', 'Rotate', 'Pick up', 'Buy']);
        expect(within(drawer()).getByText('A warm tile for cold feet.')).toBeVisible();

        tap('Show less');

        expect(drawer()).toHaveAttribute('data-state', 'peek');
    });

    it('offers a visitor only what a visitor may do, and a rights holder to eject', () => {
        select(furni({ usagePolicy: 2, purchaseOfferId: 900 }));

        expect(actionNames()).toEqual(['Use', 'Buy']);

        select(furni({ isRoomOwner: true }));

        expect(actionNames()).toEqual(['Move', 'Rotate', 'Eject']);
        expect(within(drawer()).getByRole('button', { name: 'Eject' })).toHaveAttribute('data-tone', 'danger');
    });

    it('runs the desktop handlers: use, rotate, pick up stay; move and buy hand over and close the drawer', () => {
        select(furni({ isOwner: true, usagePolicy: 2, purchaseOfferId: 900 }));

        tap('Use');
        expect(mocks.useRoomObject).toHaveBeenCalledWith(7, 10);

        tap('Rotate');
        expect(mocks.processRoomObjectOperation).toHaveBeenCalledWith(7, 10, 'OBJECT_ROTATE_POSITIVE');

        tap('Pick up');
        expect(mocks.pickupRoomObject).toHaveBeenCalledWith(7, 10, 'OBJECT_PICKUP');
        expect(mocks.avatarInfo).not.toBeNull();

        tap('Move');
        expect(mocks.processRoomObjectOperation).toHaveBeenCalledWith(7, 10, 'OBJECT_MOVE');
        expect(mocks.avatarInfo).toBeNull();

        select(furni({ purchaseOfferId: 900 }));
        tap('Buy');

        expect(mocks.createLinkEvent).toHaveBeenCalledWith('catalog/open/offerId/900');
        expect(mocks.avatarInfo).toBeNull();
    });

    it('groups the wired and staff extras, and opens for the build tools', () => {
        mocks.showInspect = true;
        mocks.staff = true;
        select(furni({ isOwner: true, isAnyRoomController: true, roomControllerLevel: 5 }));
        tap('Show everything');

        expect([...drawer().querySelectorAll('.octane-handheld-drawer__section')].map((heading) => heading.textContent)).toEqual(['Item', 'Wired', 'Staff']);
        expect(actionNames()).toEqual(['Move', 'Rotate', 'Pick up', 'Inspect', 'Edit furni', 'Open Buildtools']);

        tap('Open Buildtools');

        expect(within(drawer()).getByRole('button', { name: 'Close Buildtools' })).toHaveAttribute('aria-pressed', 'true');
        expect(drawer().querySelector('.octane-infostand-buildtools')).not.toBeNull();
    });

    it('closes with the close button, and with a pull down on the peek; a pull up or a tap on the head opens it', () => {
        select(furni({ isOwner: true }));

        const head = drawer().querySelector('.octane-handheld-drawer__head');

        fireEvent.pointerDown(head, { pointerId: 1, isPrimary: true, clientY: 600 });
        fireEvent.pointerUp(head, { pointerId: 1, isPrimary: true, clientY: 540 });
        expect(drawer()).toHaveAttribute('data-state', 'open');

        fireEvent.pointerDown(head, { pointerId: 1, isPrimary: true, clientY: 300 });
        fireEvent.pointerUp(head, { pointerId: 1, isPrimary: true, clientY: 380 });
        expect(drawer()).toHaveAttribute('data-state', 'peek');
        expect(mocks.avatarInfo).not.toBeNull();

        // A tap on the head (the grip) opens and folds it.
        fireEvent.pointerDown(head, { pointerId: 1, isPrimary: true, clientY: 600 });
        fireEvent.pointerUp(head, { pointerId: 1, isPrimary: true, clientY: 601 });
        expect(drawer()).toHaveAttribute('data-state', 'open');

        fireEvent.pointerDown(head, { pointerId: 1, isPrimary: true, clientY: 300 });
        fireEvent.pointerUp(head, { pointerId: 1, isPrimary: true, clientY: 300 });
        expect(drawer()).toHaveAttribute('data-state', 'peek');

        fireEvent.pointerDown(head, { pointerId: 1, isPrimary: true, clientY: 600 });
        fireEvent.pointerUp(head, { pointerId: 1, isPrimary: true, clientY: 700 });
        expect(mocks.avatarInfo).toBeNull();

        select(furni());
        tap('Close');

        expect(mocks.avatarInfo).toBeNull();
    });

    it('swaps to another object without closing, keeps its state, and folds again once nothing is selected', () => {
        select(furni({ isOwner: true }));
        tap('Show everything');
        select(peer());

        expect(drawer()).toHaveAttribute('data-state', 'open');
        expect(within(drawer()).getByRole('heading', { name: 'Marlowe' })).toBeInTheDocument();

        select(null);
        expect(screen.queryByRole('region', { name: 'Selected in the room' })).toBeNull();

        select(furni({ isOwner: true }));
        expect(drawer()).toHaveAttribute('data-state', 'peek');
    });

    it('is always open on its side, with no fold button', () => {
        setOrientation('landscape');
        select(furni({ isOwner: true, purchaseOfferId: 900 }));

        expect(drawer()).toHaveAttribute('data-state', 'open');
        expect(within(drawer()).queryByRole('button', { name: 'Show less' })).toBeNull();
        expect(actionNames()).toEqual(['Move', 'Rotate', 'Pick up', 'Buy']);
    });
});

describe('phone drawer: players', () => {
    it('shows the menu of another player as buttons, the moderation as a sub-page', () => {
        select(peer({ canBeKicked: true, canBeBanned: true, canBeMuted: true, amIOwner: true }));

        expect(actionNames()).toEqual(['Profile', 'Add friend', 'Trade', 'Whisper', 'Respect (3)', 'Ignore', 'Report', 'Moderate']);
        expect(screen.queryByText('Actions', { selector: 'button' })).toBeNull();

        tap('Moderate');

        expect(drawer()).toHaveAttribute('data-state', 'open');
        expect(actionNames()).toEqual(['Profile', 'Kick', 'Mute', 'Ban', 'Give rights', 'Back']);
        expect(within(drawer()).getByRole('button', { name: 'Kick' })).toHaveAttribute('data-tone', 'danger');

        tap('Ban');
        expect(actionNames()).toEqual(['Profile', 'Ban for an hour', 'Ban for a day', 'Ban for good', 'Back']);

        tap('Ban for a day');
        expect(mocks.roomSession.sendBanMessage).toHaveBeenCalledWith(42, 'RWUAM_BAN_USER_DAY');
        expect(mocks.avatarInfo).toBeNull();
    });

    it('leaves out what the player may not do', () => {
        mocks.canRequestFriend = false;
        select(peer({ canTrade: false }));

        expect(actionNames()).toEqual(['Profile', 'Trade', 'Whisper', 'Respect (3)', 'Relationship', 'Ignore', 'Report']);
        // Trading is shown but refused, as in the desktop menu.
        expect(within(drawer()).getByRole('button', { name: 'Trade' })).toHaveAttribute('aria-disabled', 'true');

        tap('Trade');
        // No trade request went out (it would carry the player's room index).
        expect(mocks.sendMessageComposer.mock.calls.filter(([composer]) => composer.args[0] === 5)).toEqual([]);
        expect(mocks.avatarInfo).not.toBeNull();
    });

    it('whispers through the chat composer and closes, opens the profile, and respects', () => {
        select(peer());
        tap('Whisper');

        expect(mocks.dispatchUiEvent).toHaveBeenCalledTimes(1);
        expect(mocks.dispatchUiEvent.mock.calls[0][0]).toMatchObject({ chatMode: 'whisper', userName: 'Marlowe' });
        expect(mocks.avatarInfo).toBeNull();

        select(peer());
        tap('Profile');
        expect(mocks.getUserProfile).toHaveBeenCalledWith(42);

        tap('Respect (3)');
        expect(mocks.respectUser).toHaveBeenCalledWith(42);
    });

    it('opens on the actions when a long press asked for them', () => {
        select(null);
        act(() => mocks.linkTracker.linkReceived('avatar-info/handheld-actions'));
        select(peer());

        expect(drawer()).toHaveAttribute('data-state', 'open');
    });

    it('gives the player their own menu: looks, actions, dances, signs', () => {
        select(own());

        expect(actionNames()).toEqual(['Profile', 'Change looks', 'Actions', 'Dance', 'Signs', 'Custom nickname', 'Badge leaderboard']);

        tap('Dance');
        tap('Pogo Mogo');
        expect(mocks.roomSession.sendDanceMessage).toHaveBeenCalledWith(2);
        expect(mocks.avatarInfo).toBeNull();

        select(null);
        select(own());
        tap('Signs');
        tap('7');
        expect(mocks.roomSession.sendSignMessage).toHaveBeenCalledWith(7);

        select(null);
        select(own());
        tap('Change looks');
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('avatar-editor/show');
    });
});

describe('phone drawer: pets and bots', () => {
    it('shows a pet with its care buttons once, and its commands as a page with a way back', async () => {
        select(pet());

        expect(within(drawer()).getByRole('heading', { name: 'Rex' })).toBeInTheDocument();
        expect(drawer().querySelector('.octane-handheld-drawer__subtitle')).toHaveTextContent('Golden retriever');
        expect(actionNames()).toEqual(['Buy food', 'Scratch (3)', 'Train', 'Pick up', 'Breed']);
        expect(within(drawer()).getByRole('button', { name: 'Pick up' })).toHaveAttribute('data-tone', 'danger');

        const rex = mocks.avatarInfo;

        tap('Train');
        expect(mocks.roomSession.requestPetCommands).toHaveBeenCalledWith(5);

        select(null);

        const { PetTrainingPanelMessageEvent } = await import('@octane/renderer');

        act(() => mocks.messageHandlers.get(PetTrainingPanelMessageEvent)({ getParser: () => ({ petId: 5, commands: [0, 1, 2, 3], enabledCommands: [0, 1] }) }));

        const page = screen.getByRole('region', { name: 'Pet commands' });

        expect(page).toHaveAttribute('data-page');
        expect([...page.querySelectorAll('.octane-handheld-drawer__action')].map((button) => [button.textContent, button.getAttribute('aria-disabled')])).toEqual([
            ['Sit', null],
            ['Lie down', null],
            ['Follow', 'true'],
            ['Beg', 'true']
        ]);

        fireEvent.click(within(page).getByRole('button', { name: 'Follow' }));
        expect(mocks.roomSession.sendChatMessage).not.toHaveBeenCalled();

        fireEvent.click(within(page).getByRole('button', { name: 'Sit' }));
        expect(mocks.roomSession.sendChatMessage).toHaveBeenCalledWith('Rex Sit', 0);

        fireEvent.click(within(page).getByRole('button', { name: 'Back' }));
        expect(mocks.avatarInfo).toBe(rex);
    });

    it("shows another player's pet without the owner's buttons", () => {
        select(pet({ isOwner: false, ownerName: 'bop' }));

        expect(actionNames()).toEqual(['Buy food', 'Scratch (3)']);
    });

    it('shows a rentable bot with its skills, and moves it out of the way of the room', () => {
        select(bot({ roomControllerLevel: 4 }));

        expect(actionNames()).toEqual(['Move', 'Rotate', 'Change name', 'Dress up', 'Walk around', 'Set up speech', 'Dance', 'Pick up']);

        tap('Rotate');
        expect(mocks.processRoomObjectOperation).toHaveBeenCalledWith(11, RoomObjectCategory.UNIT, 'OBJECT_ROTATE_POSITIVE');
        expect(mocks.avatarInfo).not.toBeNull();

        tap('Move');
        expect(mocks.processRoomObjectOperation).toHaveBeenCalledWith(11, RoomObjectCategory.UNIT, 'OBJECT_MOVE');
        expect(mocks.avatarInfo).toBeNull();
    });

    it("leaves a visitor nothing to do with somebody else's bot", () => {
        select(bot({ amIOwner: false, ownerId: 9 }));

        expect(actionNames()).toEqual([]);
    });
});

describe('desktop', () => {
    it('keeps the infostand and its buttons, and no drawer', () => {
        mocks.handheld = false;
        window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
        act(() => useHandheldStore.setState({ layout: { active: false, orientation: 'landscape' } }));
        select(furni({ isOwner: true, usagePolicy: 2, purchaseOfferId: 900 }));

        expect(screen.queryByRole('region', { name: 'Selected in the room' })).toBeNull();
        expect(document.querySelector('.octane-infostand-area')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-drawer__action')).toBeNull();
        // The purchase row inside the panel, then the row of buttons under it; the stat cells between them copy their value.
        expect(
            screen
                .getAllByRole('button')
                .map((button) => button.textContent)
                .filter((text) => !/^\d+$/.test(text))
        ).toEqual(['Buy', 'Move', 'Rotate', 'Pick up', 'Use']);
    });
});
