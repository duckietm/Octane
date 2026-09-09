import { RoomControllerLevel } from '@octane/renderer';

/**
 * Pure pieces of the official `ChatInputWidgetHandler` (AIR 13, `:178-541`) so the gates and the
 * formats can be tested without a renderer.
 */

// `RoomSessionChatEvent.CHAT_TYPE_PING`: the official constant (session/events, `= 11`) that the
// renderer's event class does not carry yet.
export const CHAT_TYPE_PING = 11;

// Official `:fps <n>`: `class_2724.clamp(int(arg), 5, 10000)`.
export const FPS_COMMAND_MIN = 5;
export const FPS_COMMAND_MAX = 10000;

export const OFFICIAL_SECURITY_STAFF = 4;
export const OFFICIAL_SECURITY_FURNI_CHOOSER = 2;

export interface ChatCommandActor {
    controllerLevel: number;
    securityLevel: number;
    isAmbassador: boolean;
}

// `:kick` / `:mute` / `:shutup` run client-side for room controllers only; staff (security 4)
// let the line reach the server so its own command handler answers.
export const canUseRoomModerationCommand = (actor: ChatCommandActor): 'client' | 'server' | 'none' => {
    if (actor.securityLevel >= OFFICIAL_SECURITY_STAFF) return 'server';

    return actor.controllerLevel >= RoomControllerLevel.GUEST ? 'client' : 'none';
};

// `:furni` (`:320`): controller >= 1, security 2 or ambassador.
export const canOpenFurniChooser = (actor: ChatCommandActor): boolean =>
    actor.controllerLevel >= RoomControllerLevel.GUEST || actor.securityLevel >= OFFICIAL_SECURITY_FURNI_CHOOSER || actor.isAmbassador;

// `:chooser` (`:313`): allowed unless the room disabled the chooser and the user has no rights.
export const canOpenUserChooser = (actor: ChatCommandActor, roomHasChooserDisabled: boolean): boolean =>
    !roomHasChooserDisabled || actor.controllerLevel >= RoomControllerLevel.GUEST;

// `:aalert` / `:anew` / `:avisit` (`:401-442`): ambassadors and staff.
export const canUseAmbassadorCommand = (actor: ChatCommandActor): boolean => actor.isAmbassador || actor.securityLevel >= OFFICIAL_SECURITY_STAFF;

// `:uc` (`:401`): staff only.
export const canUseClassificationCommand = (actor: ChatCommandActor): boolean => actor.securityLevel >= OFFICIAL_SECURITY_STAFF;

export const clampFpsCommandValue = (value: string): number | null => {
    const parsed = parseInt(value, 10);

    if (!Number.isFinite(parsed)) return null;

    return Math.min(FPS_COMMAND_MAX, Math.max(FPS_COMMAND_MIN, parsed));
};

// `:avisit [group]` (`:420-431`): the group lobby when asked for, the noob lobby otherwise.
export const getAmbassadorVisitLink = (argument: string): string =>
    argument === 'group' ? 'navigator/goto/predefined_group_lobby' : 'navigator/goto/predefined_noob_lobby';

const pad = (value: number) => value.toString();

/**
 * `:screenshot` (`:455-462`): the file is named after the entered room; without a name the official
 * falls back to `Habbo <yyyy-M-d> <H.m.s>` (JavaScript month index, exactly like the AS3 Date).
 */
export const getScreenshotFileName = (roomName: string | null | undefined, now: Date = new Date()): string => {
    const trimmed = (roomName || '').trim();

    if (trimmed.length) return `${trimmed}.png`;

    const date = [now.getFullYear(), now.getMonth(), now.getDate()].map(pad).join('-');
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(pad).join('.');

    return `Habbo ${date} ${time}.png`;
};

// `ChatBubbleFactory` (freeflowchat, chat type 11): hardcoded English in the official client too.
export const getPingBubbleText = (latencyMs: number): string => (latencyMs >= 0 ? `Ping: ${latencyMs} ms` : 'Ping: measuring...');

/**
 * AIR 13 `SpecialSystemChat` (1971): the only special system type
 * `ChatBubbleFactory.applySpecialChatContent` renders (`extraParam - 67 == 0`).
 */
export const SPECIAL_SYSTEM_CHAT_TYPE_SIXES = 67;
