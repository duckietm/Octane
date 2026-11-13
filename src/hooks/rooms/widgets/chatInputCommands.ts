/**
 * The chat commands the official client carries out itself (ChatInputWidgetHandler) that are more than a one-liner
 * in the chat hook: who may use each, and what it does. Everything it touches comes in through `env`, so the rules
 * can be tested without a room.
 */
export interface ChatCommandUser {
    webID: number;
}

export interface ChatCommandSession {
    isRoomOwner: boolean;
    controllerLevel: number;
    userDataManager?: { getUserDataByName(name: string): ChatCommandUser | null | undefined } | null;
    sendKickMessage(userId: number): void;
    sendMuteMessage(userId: number, minutes: number): void;
    sendAmbassadorAlertMessage(userId: number): void;
    sendRoomUsersClassificationMessage(type: string): void;
    sendPeerUsersClassificationMessage(type: string): void;
}

export interface ChatCommandEnv {
    session: ChatCommandSession | null;
    securityLevel: number;
    isAmbassador: boolean;
    isAnyRoomController: boolean;
    cameraAllowed: boolean;
    createLink(link: string): void;
    confirm(message: string, onConfirm: () => void, title: string): void;
    localize(key: string, fallback: string): string;
    specialCommand(text: string): void;
    dropHandItem(): void;
    ignoreUser(userId: number): void;
    unignoreUser(userId: number): void;
    visitUser(name: string): void;
    visitRoom(roomId: number): void;
    wiredRoomState(rollback: boolean): void;
    /** Closes the wired setup window and forgets what the client kept of it. */
    wiredReset(): void;
    /** Hides or shows the pointer and the room's tile cursor. */
    toggleMouse(): void;
    toggleFullscreen(): void;
    setFrameRate(fps: number): void;
    setLanguage(code: string): void;
}

/** Staff from this level up keep `:kick`, `:mute` and `:reload` as server commands. */
const STAFF_LEVEL = 4;
const ROOM_RIGHTS = 1;
const ROOM_OWNER = 4;
const MUTE_MINUTES = 2;
const MIN_FPS = 5;
const MAX_FPS = 10000;

const HANDLED = true;
const NOT_OURS = false;

/**
 * Carries out `command` (the first word, lower case) when it is one of the official client-side commands; returns
 * whether the line was consumed. A consumed line never reaches the room as chat, also when the player may not use
 * the command: that is how the official client swallows them.
 */
export const runOfficialChatCommand = (command: string, argument: string, parts: string[], env: ChatCommandEnv): boolean => {
    const { session } = env;
    const isStaff = env.securityLevel >= STAFF_LEVEL;
    const hasRights = (session?.controllerLevel ?? 0) >= ROOM_RIGHTS;
    const mayClearRoom = !!session && (session.isRoomOwner || env.isAnyRoomController || hasRights);
    const userByName = (name: string) => (name ? (session?.userDataManager?.getUserDataByName(name) ?? null) : null);
    const ambassador = env.isAmbassador || isStaff;

    switch (command) {
        case ':kick': {
            if (isStaff) return NOT_OURS;

            const user = hasRights ? userByName(argument) : null;

            if (user) session.sendKickMessage(user.webID);

            return HANDLED;
        }
        case ':shutup':
        case ':mute': {
            if (isStaff) return NOT_OURS;

            const user = hasRights ? userByName(argument) : null;

            if (user) session.sendMuteMessage(user.webID, MUTE_MINUTES);

            return HANDLED;
        }
        case ':ignore':
        case ':unignore': {
            const user = userByName(argument);

            if (user) (command === ':ignore' ? env.ignoreUser : env.unignoreUser)(user.webID);

            return HANDLED;
        }
        case ':drop':
        case ':dropitem':
            env.dropHandItem();
            return HANDLED;
        case ':cam':
        case ':camera':
            if (env.cameraAllowed) env.createLink('camera/show');
            return HANDLED;
        case ':wiredreset':
            env.wiredReset();
            return HANDLED;
        case ':hidemouse':
            env.toggleMouse();
            return HANDLED;
        case ':fs':
        case ':fullscreen':
            env.toggleFullscreen();
            return HANDLED;
        case ':fps': {
            const fps = parseInt(argument, 10);

            env.setFrameRate(Math.max(MIN_FPS, Math.min(MAX_FPS, Number.isFinite(fps) ? fps : 0)));
            return HANDLED;
        }
        case ':visit':
            if (argument) env.visitUser(argument);
            return HANDLED;
        case ':roomid': {
            const roomId = parseInt(argument, 10);

            if (Number.isFinite(roomId) && roomId > 0) env.visitRoom(roomId);
            return HANDLED;
        }
        case ':lang':
            if (argument) env.setLanguage(argument);
            return HANDLED;
        case ':donate':
            env.createLink('selfdonation/open');
            return HANDLED;
        case ':resetscores':
            if (mayClearRoom)
                env.confirm(
                    env.localize('room.confirm.resetscores', 'Reset all the scores in this room?'),
                    () => env.specialCommand(':resetscores'),
                    env.localize('generic.alert.title', 'Notice')
                );
            return HANDLED;
        case ':ejectpets':
            if (session && (session.isRoomOwner || env.isAnyRoomController)) env.specialCommand(':ejectpets');
            return HANDLED;
        case ':reload':
            // Staff keep the server's own :reload; the room's owner gets the wired reload, after a confirmation.
            if (isStaff) return NOT_OURS;

            if ((session?.controllerLevel ?? 0) >= ROOM_OWNER) {
                env.confirm(
                    env.localize('wiredmenu.settings.room_state.reload.warning', 'Reload all Wired in this room?'),
                    () => env.wiredRoomState(false),
                    env.localize('wiredmenu.settings.room_state.reload', 'Reload')
                );
            }

            return HANDLED;
        case ':rollback':
            if ((session?.controllerLevel ?? 0) >= ROOM_OWNER || env.securityLevel >= 5) {
                env.confirm(
                    env.localize(
                        'wiredmenu.settings.room_state.roll_back.warning',
                        'Roll back the wired of this room? Every box is re-read from storage and edits that were never saved are lost.'
                    ),
                    () => env.wiredRoomState(true),
                    env.localize('wiredmenu.settings.room_state.roll_back', 'Rollback')
                );
            }

            return HANDLED;
        case ':anew':
            if (ambassador) session?.sendRoomUsersClassificationMessage('new');
            return HANDLED;
        case ':avisit':
            if (ambassador) env.createLink(argument === 'group' ? 'navigator/goto/predefined_group_lobby' : 'navigator/goto/predefined_noob_lobby');
            return HANDLED;
        case ':aalert': {
            const user = ambassador ? userByName(argument) : null;

            if (user) session.sendAmbassadorAlertMessage(user.webID);

            return HANDLED;
        }
        case ':uc':
            if (isStaff && session) {
                if (argument === 'hotel') session.sendPeerUsersClassificationMessage(parts[2] ?? '');
                else session.sendRoomUsersClassificationMessage(argument);
            }

            return HANDLED;
    }

    return NOT_OURS;
};
