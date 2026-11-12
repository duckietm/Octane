import { describe, expect, it } from 'vitest';
import { ChatCommandEnv, runOfficialChatCommand } from './chatInputCommands';

const makeEnv = (over: Partial<ChatCommandEnv> = {}, sessionOver: Record<string, unknown> = {}) => {
    const calls: string[] = [];
    const log =
        (name: string) =>
        (...args: unknown[]) =>
            void calls.push([name, ...args].join(' '));
    const env: ChatCommandEnv = {
        session: {
            isRoomOwner: false,
            controllerLevel: 0,
            userDataManager: { getUserDataByName: (name: string) => (name === 'Frank' ? { webID: 7 } : null) },
            sendKickMessage: log('kick'),
            sendMuteMessage: log('mute'),
            sendAmbassadorAlertMessage: log('aalert'),
            sendRoomUsersClassificationMessage: log('roomClass'),
            sendPeerUsersClassificationMessage: log('peerClass'),
            ...sessionOver
        },
        securityLevel: 0,
        isAmbassador: false,
        isAnyRoomController: false,
        cameraAllowed: false,
        createLink: log('link'),
        confirm: (message, onConfirm, title) => {
            calls.push(`confirm ${title}`);
            onConfirm();
        },
        localize: (key) => key,
        specialCommand: log('special'),
        dropHandItem: log('drop'),
        ignoreUser: log('ignore'),
        unignoreUser: log('unignore'),
        visitUser: log('visitUser'),
        visitRoom: log('visitRoom'),
        wiredRoomState: log('wired'),
        toggleFullscreen: log('fullscreen'),
        setFrameRate: log('fps'),
        setLanguage: log('lang'),
        ...over
    };
    const run = (line: string) => {
        const parts = line.split(' ');

        return runOfficialChatCommand(parts[0].toLowerCase(), parts[1] ?? '', parts, env);
    };

    return { calls, run };
};

describe('official client-side chat commands', () => {
    it('kicks and mutes by name for rights holders, and swallows the line for anyone else', () => {
        const guest = makeEnv();

        expect(guest.run(':kick Frank')).toBe(true);
        expect(guest.calls).toEqual([]);

        const rights = makeEnv({}, { controllerLevel: 1 });

        expect(rights.run(':kick Frank')).toBe(true);
        expect(rights.run(':mute Frank')).toBe(true);
        expect(rights.run(':shutup Nobody')).toBe(true);
        expect(rights.calls).toEqual(['kick 7', 'mute 7 2']);
    });

    it('leaves :kick, :mute and :reload to the server for staff', () => {
        const staff = makeEnv({ securityLevel: 4 }, { controllerLevel: 4 });

        expect(staff.run(':kick Frank')).toBe(false);
        expect(staff.run(':mute Frank')).toBe(false);
        expect(staff.run(':reload')).toBe(false);
        expect(staff.calls).toEqual([]);
    });

    it('ignores and unignores a user in the room by name', () => {
        const { calls, run } = makeEnv();

        run(':ignore Frank');
        run(':unignore Frank');
        run(':ignore Nobody');
        expect(calls).toEqual(['ignore 7', 'unignore 7']);
    });

    it('opens the camera only with the camera perk', () => {
        const without = makeEnv();
        const withPerk = makeEnv({ cameraAllowed: true });

        expect(without.run(':cam')).toBe(true);
        withPerk.run(':camera');
        expect(without.calls).toEqual([]);
        expect(withPerk.calls).toEqual(['link camera/show']);
    });

    it('clamps the frame rate between 5 and 10000', () => {
        const { calls, run } = makeEnv();

        run(':fps 1');
        run(':fps 60');
        run(':fps 999999');
        run(':fps abc');
        expect(calls).toEqual(['fps 5', 'fps 60', 'fps 10000', 'fps 5']);
    });

    it('runs the simple commands', () => {
        const { calls, run } = makeEnv();

        run(':drop');
        run(':fs');
        run(':visit Frank');
        run(':roomid 12');
        run(':roomid x');
        run(':lang nl');
        run(':donate');
        expect(calls).toEqual(['drop', 'fullscreen', 'visitUser Frank', 'visitRoom 12', 'lang nl', 'link selfdonation/open']);
    });

    it('asks before resetting scores, and only for those who may clear the room', () => {
        const guest = makeEnv();
        const rights = makeEnv({}, { controllerLevel: 1 });

        expect(guest.run(':resetscores')).toBe(true);
        rights.run(':resetscores');
        expect(guest.calls).toEqual([]);
        expect(rights.calls).toEqual(['confirm generic.alert.title', 'special :resetscores']);
    });

    it('ejects pets only for the owner or a room controller', () => {
        const rights = makeEnv({}, { controllerLevel: 1 });
        const owner = makeEnv({}, { isRoomOwner: true });

        rights.run(':ejectpets');
        owner.run(':ejectpets');
        expect(rights.calls).toEqual([]);
        expect(owner.calls).toEqual(['special :ejectpets']);
    });

    it('reloads and rolls back the room wired for the owner after a confirmation', () => {
        const rights = makeEnv({}, { controllerLevel: 1 });
        const owner = makeEnv({}, { controllerLevel: 4 });

        rights.run(':reload');
        rights.run(':rollback');
        owner.run(':reload');
        owner.run(':rollback');
        expect(rights.calls).toEqual([]);
        expect(owner.calls).toEqual([
            'confirm wiredmenu.settings.room_state.reload',
            'wired false',
            'confirm wiredmenu.settings.room_state.roll_back',
            'wired true'
        ]);
    });

    it('keeps the ambassador commands to ambassadors and staff', () => {
        const player = makeEnv();
        const ambassador = makeEnv({ isAmbassador: true });

        for (const line of [':anew', ':avisit', ':aalert Frank']) expect(player.run(line)).toBe(true);
        expect(player.calls).toEqual([]);

        ambassador.run(':anew');
        ambassador.run(':avisit');
        ambassador.run(':avisit group');
        ambassador.run(':aalert Frank');
        expect(ambassador.calls).toEqual([
            'roomClass new',
            'link navigator/goto/predefined_noob_lobby',
            'link navigator/goto/predefined_group_lobby',
            'aalert 7'
        ]);
    });

    it('classifies users for staff only', () => {
        const player = makeEnv();
        const staff = makeEnv({ securityLevel: 4 });

        player.run(':uc new');
        staff.run(':uc new');
        staff.run(':uc hotel new');
        expect(player.calls).toEqual([]);
        expect(staff.calls).toEqual(['roomClass new', 'peerClass new']);
    });

    it('does not touch ordinary chat or commands handled elsewhere', () => {
        const { calls, run } = makeEnv();

        for (const line of ['hello', ':pickall', ':sign 3', ':kicker']) expect(run(line)).toBe(false);
        expect(calls).toEqual([]);
    });
});
