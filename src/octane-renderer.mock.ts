/**
 * Stub of `@octane/renderer` for Vitest.
 *
 * The real package eagerly loads Pixi v8 + a few hundred Habbo message
 * parsers/composers at module import time, which jsdom cannot host:
 * any `tests/**` file that transitively pulls a renderer symbol throws
 * before a single assertion runs.
 *
 * This module replaces it via `resolve.alias` in `vitest.config.mts`.
 * We provide explicit named exports for the symbols a test currently
 * needs (logger, event dispatcher, doorbell event class); everything
 * else mentioned in the comments below is a generic stub kept just to
 * keep the side-effectful imports happy as `src/api/index.ts` and
 * friends are pulled in transitively by the barrel cascade.
 *
 * Grow this file as new tests require additional symbols. Prefer adding
 * a real (deterministic) stub over wiring `vi.fn()` — it keeps the
 * mocks readable and avoids state bleed between cases.
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

export const OctaneLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    enableContexts: vi.fn(),
    setDebug: vi.fn()
};

// ---------------------------------------------------------------------------
// Event dispatcher
// ---------------------------------------------------------------------------
//
// `GetEventDispatcher()` in the real SDK returns the renderer-wide event
// bus. Tests use `mockEventDispatcher.dispatchEvent(event)` to simulate
// a server push. `clearMockEventDispatcher()` resets the listener map
// between cases so subscriptions from a previous test don't leak.

type Listener = (event: any) => void;

// OctaneEvent listeners — registered via GetEventDispatcher() / useOctaneEvent.
// Cleared by clearMockEventDispatcher() between test cases.
const listeners = new Map<string, Set<Listener>>();

// MessageEvent listeners — registered via GetCommunication().registerMessageEvent
// (i.e. useMessageEvent). NOT cleared by clearMockEventDispatcher() so that
// Zustand-backed shared hooks (which register effects once and persist the
// source host across tests) keep their subscriptions alive throughout the
// suite. State isolation between tests is maintained by the shared source
// preserving initial values across renders (each test's renderHook
// reads the same Zustand store — tests that check a specific
// post-dispatch state rely on the event changing it, not on a reset).
const msgListeners = new Map<string, Set<Listener>>();

export const mockEventDispatcher = {
    addEventListener(type: string, handler: Listener) {
        let bucket = listeners.get(type);

        if (!bucket) {
            bucket = new Set();
            listeners.set(type, bucket);
        }

        bucket.add(handler);
    },
    removeEventListener(type: string, handler: Listener) {
        listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event: { type: string }) {
        // Fire OctaneEvent listeners first, then MessageEvent listeners.
        const bucket = listeners.get(event.type);
        if (bucket) for (const handler of bucket) handler(event);

        const msgBucket = msgListeners.get(event.type);
        if (msgBucket) for (const handler of msgBucket) handler(event);
    },
    hasListeners(type: string) {
        return (listeners.get(type)?.size ?? 0) > 0 || (msgListeners.get(type)?.size ?? 0) > 0;
    }
};

// Clears only the OctaneEvent listener map (GetEventDispatcher / useOctaneEvent
// registrations). MessageEvent listeners (useMessageEvent / GetCommunication)
// are intentionally preserved so shared source hooks stay subscribed.
export const clearMockEventDispatcher = () => {
    listeners.clear();
};

export const GetEventDispatcher = vi.fn(() => mockEventDispatcher);

// ---------------------------------------------------------------------------
// Event type enums (string-keyed Proxies)
// ---------------------------------------------------------------------------
//
// The real `*EventType` is a `class { static readonly FOO = '...'; … }`
// with stable wire strings. Tests only need each constant to be a
// unique string so dispatch + listener agree.

const makeEnumProxy = (label: string) =>
    new Proxy(
        {},
        {
            get: (_, prop) => (typeof prop === 'string' ? `mock:${label}:${prop}` : undefined)
        }
    ) as Record<string, string>;

export const OctaneEventType = makeEnumProxy('OctaneEventType');
export const MouseEventType = makeEnumProxy('MouseEventType');
export const TouchEventType = makeEnumProxy('TouchEventType');
export const RoomObjectPlacementSource = makeEnumProxy('RoomObjectPlacementSource');
export const RoomObjectType = makeEnumProxy('RoomObjectType');
export const RoomObjectVariable = makeEnumProxy('RoomObjectVariable');
export const RoomTradingLevelEnum = makeEnumProxy('RoomTradingLevelEnum');
export const HabboClubLevelEnum = makeEnumProxy('HabboClubLevelEnum');
export const FurnitureType = makeEnumProxy('FurnitureType');
export const PetType = makeEnumProxy('PetType');
export const AvatarFigurePartType = makeEnumProxy('AvatarFigurePartType');
export const AvatarScaleType = makeEnumProxy('AvatarScaleType');
export const AvatarSetType = makeEnumProxy('AvatarSetType');
export const AvatarAction = makeEnumProxy('AvatarAction');
export const RoomWidgetEnumItemExtradataParameter = makeEnumProxy('RoomWidgetEnumItemExtradataParameter');

// Numeric enums — values mirror the real renderer SDK so comparisons
// (`controllerLevel >= GUILD_ADMIN`, category branching) keep working.

export class RoomControllerLevel {
    static readonly NONE = 0;
    static readonly GUEST = 1;
    static readonly GUILD_MEMBER = 2;
    static readonly GUILD_ADMIN = 3;
    static readonly ROOM_OWNER = 4;
    static readonly MODERATOR = 5;
}

// Mirrors `packages/api/src/octane/session/enum/SecurityLevel.ts`. Kept
// around so any consumer that still imports the renderer enum
// (non-deprecated code path) compiles cleanly under the mock.
export class SecurityLevel {
    static readonly NONE = 0;
    static readonly CELEBRITY = 1;
    static readonly PARTNER = 2;
    static readonly BUS_PARTNER = 3;
    static readonly EMPLOYEE = 4;
    static readonly MODERATOR = 5;
    static readonly PLAYER_SUPPORT = 6;
    static readonly COMMUNITY = 7;
    static readonly ADMINISTRATOR = 8;
    static readonly SUPER_USER = 9;
}

export class RoomObjectCategory {
    static readonly MINIMUM = 0;
    static readonly ROOM = 10;
    static readonly UNIT = 20;
    static readonly FLOOR = 30;
    static readonly WALL = 40;
    static readonly MAXIMUM = 50;
}

// ---------------------------------------------------------------------------
// Doorbell event class
// ---------------------------------------------------------------------------

export class RoomSessionDoorbellEvent {
    // Wire strings copied from the real class so any consumer that
    // ignores the indirection through the `.DOORBELL` static still
    // matches.
    static readonly DOORBELL = 'RSDE_DOORBELL';
    static readonly RSDE_ACCEPTED = 'RSDE_ACCEPTED';
    static readonly RSDE_REJECTED = 'RSDE_REJECTED';

    // Mirrors the real constructor signature `(type, session, userName)`
    // so `tsgo` is happy. Tests can pass `null` for the session: the
    // SUT only reads `.userName` and `.type`.
    constructor(
        public readonly type: string,
        public readonly _session: unknown,
        public readonly userName: string
    ) {}
}

// ---------------------------------------------------------------------------
// Generic classes — placeholders for symbols that need to exist as
// constructors so module-level `new X(...)` calls don't crash during
// the barrel cascade, but whose behavior tests don't yet exercise.
// ---------------------------------------------------------------------------

class StubClass {
    constructor(..._args: unknown[]) {}
}

export class OctaneAlphaFilter extends StubClass {}
export class OctaneContainer extends StubClass {}
export class OctaneRectangle {
    constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
}
export class OctaneSprite extends StubClass {}
export class OctaneRenderTexture extends StubClass {}
export class OctaneTexture extends StubClass {}
export class OctaneSoundEvent extends StubClass {}
export class OctaneEvent extends StubClass {}

// MessageEvent — stores the handler so GetCommunication (below) can
// route dispatches through mockEventDispatcher. Each concrete subclass
// exposes a `.type` equal to its constructor name so dispatchEvent
// can match registered listeners.
export class MessageEvent {
    private _callBack: Function | null;

    constructor(callBack?: Function) {
        this._callBack = callBack ?? null;
    }

    public get callBack(): Function | null {
        return this._callBack;
    }

    // Each concrete subclass is identified by its class name.
    public get type(): string {
        return this.constructor.name;
    }

    // Concrete subclasses override this; the no-arg construction path used
    // by makeParserlessEvent in tests leaves it returning null — tests
    // override it with (ev as any).getParser = () => parser.
    public getParser(): any {
        return null;
    }
}

// ---------------------------------------------------------------------------
// IMessageEvent-based event classes used by useDoorState
//
// The real renderer classes take a `callBack` constructor arg and store it
// in MessageEvent._callBack. The communication manager later calls
// `event.callBack(event)` when the matching packet arrives.
//
// In tests we construct them with NO args (makeParserlessEvent does
// `new klass()`) and override `getParser`. GetCommunication (below)
// registers `event.callBack` on mockEventDispatcher under `event.type`
// (the class name). When the test calls
// `mockEventDispatcher.dispatchEvent(ev)`, listeners for that class name
// fire, receiving `ev` — and the implementation reads `ev.getParser()`.
// ---------------------------------------------------------------------------

export class DoorbellMessageEvent extends MessageEvent {}
export class RoomDoorbellAcceptedEvent extends MessageEvent {}
export class FlatAccessDeniedMessageEvent extends MessageEvent {}
export class GenericErrorEvent extends MessageEvent {}
export class GetGuestRoomResultEvent extends MessageEvent {}
export class ThumbnailStatusMessageEvent extends MessageEvent {}

// Mentions system — incoming events extend MessageEvent (they expose
// getParser()); the request/mark composers are symbol-only constructors.
export class MentionReceivedEvent extends MessageEvent {}
export class MentionsListEvent extends MessageEvent {}

// ---------------------------------------------------------------------------
// Navigator event classes — MessageEvent subclasses needed by useNavigatorStore
// ---------------------------------------------------------------------------

export class CanCreateRoomEventEvent extends MessageEvent {}
export class CategoriesWithVisitorCountEvent extends MessageEvent {}
export class FavouriteChangedEvent extends MessageEvent {}
export class FavouritesEvent extends MessageEvent {}
export class FlatCreatedEvent extends MessageEvent {}
export class NavigatorHomeRoomEvent extends MessageEvent {}
export class NavigatorMetadataEvent extends MessageEvent {}
export class AvatarEffectsEvent extends MessageEvent {}
export class AvatarEffectAddedEvent extends MessageEvent {}
export class AvatarEffectExpiredEvent extends MessageEvent {}
export class AvatarEffectActivatedEvent extends MessageEvent {}
export class AvatarEffectSelectedEvent extends MessageEvent {}
export class IsFirstLoginOfDayEvent extends MessageEvent {}
export class NavigatorOpenRoomCreatorEvent extends MessageEvent {}
export class NavigatorSearchesEvent extends MessageEvent {}
export class NavigatorSearchEvent extends MessageEvent {}
export class RoomEnterErrorEvent extends MessageEvent {}
export class RoomEntryInfoMessageEvent extends MessageEvent {}
export class RoomForwardEvent extends MessageEvent {}
export class RoomScoreEvent extends MessageEvent {}
export class RoomSettingsUpdatedEvent extends MessageEvent {}
export class UserEventCatsEvent extends MessageEvent {}
export class UserFlatCatsEvent extends MessageEvent {}
export class UserInfoEvent extends MessageEvent {}
export class UserPermissionsEvent extends MessageEvent {}

// ---------------------------------------------------------------------------
// Notification event classes — MessageEvent subclasses needed by
// useNotificationStore (called via useNotification() inside useNavigatorStore).
// The real renderer classes take a `callBack` constructor arg; the pattern
// here is the same as the Navigator event stubs above.
// ---------------------------------------------------------------------------

export class AchievementNotificationMessageEvent extends MessageEvent {}
export class ActivityPointNotificationMessageEvent extends MessageEvent {}
export class BadgeReceivedEvent extends MessageEvent {}
export class ChestNotificationEvent extends MessageEvent {}
export class ClubGiftNotificationEvent extends MessageEvent {}
export class ClubGiftSelectedEvent extends MessageEvent {}
export class ConnectionErrorEvent extends MessageEvent {}
export class HabboBroadcastMessageEvent extends MessageEvent {}
export class HotelClosedAndOpensEvent extends MessageEvent {}
export class HotelClosesAndWillOpenAtEvent extends MessageEvent {}
export class HotelWillCloseInMinutesEvent extends MessageEvent {}
export class InfoFeedEnableMessageEvent extends MessageEvent {}
export class MaintenanceStatusMessageEvent extends MessageEvent {}
export class ModeratorCautionEvent extends MessageEvent {}
export class ModeratorMessageEvent extends MessageEvent {}
export class MOTDNotificationEvent extends MessageEvent {}
export class NotificationDialogMessageEvent extends MessageEvent {}
export class PetLevelNotificationEvent extends MessageEvent {}
export class PetReceivedMessageEvent extends MessageEvent {}
export class RespectReceivedEvent extends MessageEvent {}
export class RoomEnterEvent extends MessageEvent {}
export class SimpleAlertMessageEvent extends MessageEvent {}
export class UserBannedMessageEvent extends MessageEvent {}
export class WiredRewardResultMessageEvent extends MessageEvent {
    static readonly PRODUCT_DONATED_CODE = 7;
    static readonly BADGE_DONATED_CODE = 8;
}

// RoomEnterEffect — used by useNotificationStore to check if the room-enter
// animation is still running before showing the mod disclaimer bubble.
export const RoomEnterEffect = {
    isRunning: () => false,
    totalRunningTime: 0
};

export class RoomEngineObjectEvent extends StubClass {}
export const CreateLinkEvent = vi.fn();
export class EventDispatcher extends StubClass {}
export class AdvancedMap extends StubClass {}
export class AvatarFigureContainer extends StubClass {}
export class Vector3d extends StubClass {}
export class ObjectDataFactory extends StubClass {}

// RoomDataParser — real static constants needed by useDoorState and its tests.
export class RoomDataParser {
    static readonly DOORBELL_STATE = 1;
    static readonly PASSWORD_STATE = 2;
}

export class RoomModerationSettings extends StubClass {}
export class StringDataType extends StubClass {}

// Navigator data/parser stubs
export class NavigatorCategoryDataParser extends StubClass {}
export class NavigatorEventCategoryDataParser extends StubClass {}
export class NavigatorSavedSearch extends StubClass {}
export class NavigatorSearchResultSet extends StubClass {}
export class NavigatorTopLevelContext extends StubClass {}
export class CantConnectMessageParser extends StubClass {
    static readonly REASON_FULL = 1;
    static readonly REASON_QUEUE_ERROR = 2;
    static readonly REASON_BANNED = 3;
}

export class LegacyExternalInterface {
    static readonly available = false;
    static call(..._args: unknown[]): void {}
}
export class SellablePetPaletteData extends StubClass {}
export class PetFigureData extends StubClass {}
export class PetData extends StubClass {}
export class NodeData extends StubClass {}
export class ItemDataStructure extends StubClass {}
export class HabboGroupEntryData extends StubClass {}
export class FriendParser extends StubClass {}
export class FriendCategoryData extends StubClass {}
export class FriendRequestData extends StubClass {}
export class FurnitureListItemParser extends StubClass {}
export class BotData extends StubClass {}
export class AchievementData extends StubClass {}
export class CatalogPageMessageProductData extends StubClass {}
export class GiftWrappingConfigurationParser extends StubClass {}
export class WiredFilter extends StubClass {}
export class HabboWebTools extends StubClass {}

// Composers — symbol-only constructors; only their identity matters in the
// codebase ("did the SUT call SendMessageComposer(new FooComposer(args))").
export class AddFavouriteRoomMessageComposer extends StubClass {}
export class AvatarEffectActivatedComposer extends StubClass {}
export class DeleteFavouriteRoomMessageComposer extends StubClass {}
export class FollowFriendMessageComposer extends StubClass {}
export class GetUserEventCatsMessageComposer extends StubClass {}
export class GetUserFlatCatsMessageComposer extends StubClass {}
export class NavigatorSearchComposer extends StubClass {}
export class RequestMentionsComposer extends StubClass {}
export class MarkMentionsReadComposer extends StubClass {}
export class DeleteMentionComposer extends StubClass {}
export class DesktopViewComposer extends StubClass {}
export class FurniturePlacePaintComposer extends StubClass {}
export class GetGuestRoomMessageComposer extends StubClass {}
export class GetProductOfferComposer extends StubClass {}
export class GroupFavoriteComposer extends StubClass {}
export class GroupInformationComposer extends StubClass {}
export class GroupJoinComposer extends StubClass {}
export class GroupUnfavoriteComposer extends StubClass {}
export class UserProfileComposer extends StubClass {}

// Catalog Studio — keep request arguments observable so provider tests can
// verify the renderer/emulator field order without loading Pixi.
class CatalogStudioComposerStub {
    private readonly data: unknown[];
    constructor(...args: unknown[]) { this.data = args; }
    public getMessageArray() { return this.data; }
}

export class CatalogStudioOpenSessionComposer extends CatalogStudioComposerStub {}
export class CatalogStudioAcquireLockComposer extends CatalogStudioComposerStub {}
export class CatalogStudioRenewLockComposer extends CatalogStudioComposerStub {}
export class CatalogStudioReleaseLockComposer extends CatalogStudioComposerStub {}
export class CatalogStudioHistoryComposer extends CatalogStudioComposerStub {}
export class CatalogStudioUndoComposer extends CatalogStudioComposerStub {}
export class CatalogStudioValidateComposer extends CatalogStudioComposerStub {}
export class CatalogStudioPublishComposer extends CatalogStudioComposerStub {}
export class CatalogStudioDiscardComposer extends CatalogStudioComposerStub {}
export class CatalogStudioRestoreComposer extends CatalogStudioComposerStub {}
export class CatalogStudioPreviewComposer extends CatalogStudioComposerStub {}
export class CatalogStudioExportComposer extends CatalogStudioComposerStub {}
export class CatalogStudioDocumentDryRunComposer extends CatalogStudioComposerStub {}
export class CatalogStudioDocumentApplyComposer extends CatalogStudioComposerStub {}
export class CatalogAdminDeletePageComposer extends CatalogStudioComposerStub {}
export class CatalogAdminMovePageComposer extends CatalogStudioComposerStub {}
export class CatalogAdminSetPageEnabledComposer extends CatalogStudioComposerStub {}
export class CatalogAdminSetPageVisibleComposer extends CatalogStudioComposerStub {}
export class CatalogAdminLoadOfferComposer extends CatalogStudioComposerStub {}
export class CatalogAdminLoadPageComposer extends CatalogStudioComposerStub {}
export class CatalogAdminSaveOfferComposer extends CatalogStudioComposerStub {}
export class CatalogAdminCreateOfferComposer extends CatalogStudioComposerStub {}
export class CatalogAdminDeleteOfferComposer extends CatalogStudioComposerStub {}
export class CatalogAdminReorderOffersComposer extends CatalogStudioComposerStub {}
export class CatalogAdminSavePageComposer extends CatalogStudioComposerStub {}
export class CatalogAdminCreatePageComposer extends CatalogStudioComposerStub {}

export class CatalogStudioSessionEvent extends MessageEvent {}
export class CatalogStudioAcquireLockEvent extends MessageEvent {}
export class CatalogStudioRenewLockEvent extends MessageEvent {}
export class CatalogStudioReleaseLockEvent extends MessageEvent {}
export class CatalogStudioHistoryEvent extends MessageEvent {}
export class CatalogStudioUndoEvent extends MessageEvent {}
export class CatalogStudioValidationEvent extends MessageEvent {}
export class CatalogStudioPublishEvent extends MessageEvent {}
export class CatalogStudioDiscardEvent extends MessageEvent {}
export class CatalogStudioRestoreEvent extends MessageEvent {}
export class CatalogStudioPreviewEvent extends MessageEvent {}
export class CatalogStudioDocumentResultEvent extends MessageEvent {}
// `ChooserSelectionFilter` is used as a string enum in some call sites.
export const ChooserSelectionFilter = makeEnumProxy('ChooserSelectionFilter');

// ---------------------------------------------------------------------------
// Floor plan constants
// ---------------------------------------------------------------------------

export const FloorAction = makeEnumProxy('FloorAction');

export const TILE_SIZE = 32;

export const HEIGHT_SCHEME = 'x0123456789abcdefghijklmnopq';

export const MAX_NUM_TILE_PER_AXIS = 64;

export const COLORMAP: object = {
    x: '101010',
    '0': '0065ff',
    '1': '0091ff',
    '2': '00bcff',
    '3': '00e8ff',
    '4': '00ffea',
    '5': '00ffbf',
    '6': '00ff93',
    '7': '00ff68',
    '8': '00ff3d',
    '9': '19ff00',
    a: '44ff00',
    b: '70ff00',
    c: '9bff00',
    d: 'f2ff00',
    e: 'ffe000',
    f: 'ffb500',
    g: 'ff8900',
    h: 'ff5e00',
    i: 'ff3200',
    j: 'ff0700',
    k: 'ff0023',
    l: 'ff007a',
    m: 'ff00a5',
    n: 'ff00d1',
    o: 'ff00fc',
    p: 'd600ff',
    q: 'aa00ff'
};

// ---------------------------------------------------------------------------
// Floor plan editor — composer stubs and event classes
// ---------------------------------------------------------------------------

// Composer stubs for floor-plan-editor message events
export class GetRoomEntryTileMessageComposer extends StubClass {}
export class GetOccupiedTilesMessageComposer extends StubClass {}
export class UpdateFloorPropertiesMessageComposer extends StubClass {
    public tilemap: string;
    public doorX: number;
    public doorY: number;
    public dir: number;
    public thicknessWall: number;
    public thicknessFloor: number;
    public wallHeight: number;
    constructor(tilemap: string, doorX: number, doorY: number, dir: number, thicknessWall: number, thicknessFloor: number, wallHeight: number) {
        super();
        this.tilemap = tilemap;
        this.doorX = doorX;
        this.doorY = doorY;
        this.dir = dir;
        this.thicknessWall = thicknessWall;
        this.thicknessFloor = thicknessFloor;
        this.wallHeight = wallHeight;
    }
}

// Event class stubs for useMessageEvent registration
export class FloorHeightMapEvent extends StubClass {}
export class RoomVisualizationSettingsEvent extends StubClass {}
export class RoomEntryTileMessageEvent extends StubClass {}
export class RoomOccupiedTilesMessageEvent extends StubClass {}
export const RoomEngineEvent = makeEnumProxy('RoomEngineEvent');

// Link tracker stubs
export type ILinkEventTracker = { linkReceived: (url: string) => void; eventUrlPrefix: string };
export const AddLinkEventTracker = vi.fn();
export const RemoveLinkEventTracker = vi.fn();

// Thickness conversion helpers — mirror the renderer's real mapping
export const convertNumbersForSaving = (v: number): number => {
    switch (v) {
        case 0:
            return -2;
        case 1:
            return -1;
        case 3:
            return 1;
        default:
            return 0;
    }
};

export const convertSettingToNumber = (v: number): number => {
    switch (v) {
        case 0.25:
            return 0;
        case 0.5:
            return 1;
        case 2:
            return 3;
        default:
            return 2;
    }
};

// ---------------------------------------------------------------------------
// Singleton getters
// ---------------------------------------------------------------------------

const stubManager = () => {
    const sentinel = new Proxy(() => undefined, {
        get(target, prop) {
            if (prop === 'then') return undefined;
            const cached = (target as any)[prop];
            if (cached !== undefined) return cached;
            // Most fields read from a real manager are either methods
            // (return functions) or sub-objects (return proxies). We
            // return another callable proxy so chained access works.
            const value = stubManager();
            (target as any)[prop] = value;
            return value;
        },
        apply() {
            return undefined;
        }
    });

    return sentinel;
};

export const GetAssetManager = vi.fn(stubManager);
export const GetAvatarRenderManager = vi.fn(stubManager);
// GetCommunication — routes IMessageEvent registration through the
// msgListeners map (separate from the OctaneEvent listeners map) so that
// clearMockEventDispatcher() does NOT wipe these subscriptions. This
// keeps shared source hooks (like useDoorState) subscribed across
// test cases without recreating the Zustand-backed source host.
//
// A WeakMap stores the wrapper fn keyed by the MessageEvent instance so
// that removeMessageEvent can remove the exact listener added by
// registerMessageEvent.
const _msgEventWrappers = new WeakMap<MessageEvent, (ev: any) => void>();

export const GetCommunication = vi.fn(() => ({
    registerMessageEvent(event: MessageEvent) {
        if (!event.callBack) return;
        const wrapper = (ev: any) => event.callBack!(ev);
        _msgEventWrappers.set(event, wrapper);
        let bucket = msgListeners.get(event.type);
        if (!bucket) {
            bucket = new Set();
            msgListeners.set(event.type, bucket);
        }
        bucket.add(wrapper);
    },
    removeMessageEvent(event: MessageEvent) {
        const wrapper = _msgEventWrappers.get(event);
        if (wrapper) msgListeners.get(event.type)?.delete(wrapper);
    },
    // Stub for SendMessageComposer and renderer-owned connection snapshots.
    connection: {
        send: vi.fn(),
        connectionState: Object.freeze({
            phase: 'disconnected',
            reconnectAttempt: 0,
            maxReconnectAttempts: 7,
            authenticated: false,
            closeCode: null,
            closeReason: ''
        })
    }
}));
export const GetConfiguration = vi.fn(stubManager);
export const GetLocalizationManager = vi.fn(stubManager);
export const GetRoomEngine = vi.fn(stubManager);
export const GetRoomMessageHandler = vi.fn(stubManager);
export const GetRoomSessionManager = vi.fn(stubManager);

// RoomGeometry — only the discrete zoom scale constants the room-zoom helper
// reads (SCALE_ZOOMED_IN = 64, SCALE_ZOOMED_OUT = 32).
export class RoomGeometry {
    static readonly SCALE_ZOOMED_IN = 64;
    static readonly SCALE_ZOOMED_OUT = 32;
}

// RoomPreviewer — only the bits the editor's FloorplanRoomPreview
// component touches. PREVIEW_COUNTER is a static field that the
// real renderer increments to allocate unique preview-room IDs;
// keeping it as a mutable static lets the editor mount/unmount
// repeatedly across tests without colliding.
export class RoomPreviewer {
    static PREVIEW_COUNTER = 0;

    constructor(
        public readonly _engine: unknown,
        public readonly _id: number
    ) {}

    public updatePreviewModel(_model: string, _wallHeight: number, _scale?: boolean): void {}
    public modifyRoomCanvas(_w: number, _h: number): void {}
    public getRoomCanvas(_w: number, _h: number): unknown {
        return null;
    }
    public getRenderingCanvas(): unknown {
        return null;
    }
    public updatePreviewRoomView(): void {}
    public changeRoomObjectDirection(): void {}
    public changeRoomObjectState(): void {}
    public dispose(): void {}
}
export const GetSessionDataManager = vi.fn(stubManager);
export const GetTickerTime = vi.fn(() => 0);
export const GetTicker = vi.fn(stubManager);
export const GetRenderer = vi.fn(stubManager);
export const GetDesiredResolution = vi.fn(() => 1);
export class OctaneTicker {}
// TextureUtils — a real-enough stub of the createRenderTexture
// roundtrip. Tests that mount LayoutRoomPreviewerView allocate a
// texture on mount and destroy it on unmount; without a real
// `.destroy` method the unmount cleanup throws.
export const TextureUtils = {
    createRenderTexture: (_w: number, _h: number) => ({
        destroy: (_options?: unknown) => undefined
    }),
    generateImage: () => null,
    generateTexture: () => ({
        destroy: (_options?: unknown) => undefined
    }),
    generateCanvas: () => null,
    writeToTexture: (container: unknown, target: unknown) => target
};
export const OctaneVersion = stubManager();

// ---------------------------------------------------------------------------
// Type-only re-exports (interfaces erase at compile time, but listing them
// here documents what the codebase imports through the type channel).
//
//   IAvatarFigureContainer · IEventDispatcher · IFigurePart · IFigurePartSet ·
//   IFurnitureData · IFurnitureItemData · IGraphicAsset · IMessageComposer ·
//   IMessageEvent · IObjectData · IPartColor · IPollQuestion · IProductData ·
//   IRoomEngine · IRoomModerationSettings · IRoomObject · IRoomObjectController ·
//   IRoomObjectSpriteVisualization · IRoomPetData · IRoomSession · IRoomUserData
//
// No need to alias them — TypeScript only consults them in the type
// system, and the production `tsconfig.json` resolves them against the
// real renderer via `node_modules/@octane/renderer/src`.

// ---------------------------------------------------------------------------
// Catch-all
// ---------------------------------------------------------------------------
//
// Anything else still resolves to `undefined`. If a test fails with
// "X is not a constructor" / "X.SOMETHING is not a function", add the
// missing symbol above with a real stub. Avoid the temptation to
// blanket-mock everything — explicit stubs surface intent and let
// failing tests pinpoint what behavior they actually rely on.

// ---------------------------------------------------------------------------
// SnowWar (SnowStorm) — events consumed by useSnowWar, composers sent by it.
// ---------------------------------------------------------------------------

export class SnowWarQueuePositionEvent extends MessageEvent {}
export class SnowWarStartLobbyCounterEvent extends MessageEvent {}
export class SnowWarGameEndedEvent extends MessageEvent {}
export class SnowWarGamesLeftEvent extends MessageEvent {}
export class SnowWarGamesInformationEvent extends MessageEvent {}
export class SnowWarGameStatusEvent extends MessageEvent {}
export class SnowWarFullGameStatusEvent extends MessageEvent {}
export class SnowWarOnStageStartEvent extends MessageEvent {}
export class SnowWarInitArenaEvent extends MessageEvent {}
export class SnowWarRejoinPreviousRoomEvent extends MessageEvent {}
export class SnowWarLevelDataEvent extends MessageEvent {}
export class SnowWarOnGameEndingEvent extends MessageEvent {}
export class SnowWarUserChatEvent extends MessageEvent {}
export class SnowWarOnStageRunningEvent extends MessageEvent {}
export class SnowWarOnStageEndingEvent extends MessageEvent {}
export class SnowWarPlayerExitedArenaEvent extends MessageEvent {}
export class SnowWarGenericErrorEvent extends MessageEvent {}
export class SnowWarUserRematchedEvent extends MessageEvent {}

export class SnowWarLoadStageReadyComposer extends StubClass {}
export class SnowWarEditRoomComposer extends StubClass {}
export class SnowWarExitGameComposer extends StubClass {}
export class SnowWarWalkComposer extends StubClass {}
export class SnowWarThrowAtLocationComposer extends StubClass {}
export class SnowWarThrowAtPlayerComposer extends StubClass {}
export class SnowWarCreateSnowballComposer extends StubClass {}
export class SnowWarRequestFullGameStatusComposer extends StubClass {}
export class SnowWarPlayAgainComposer extends StubClass {}
export class SnowWarGameChatComposer extends StubClass {}
export class SnowWarJoinQueueComposer extends StubClass {}
export class SnowWarLeaveQueueComposer extends StubClass {}
