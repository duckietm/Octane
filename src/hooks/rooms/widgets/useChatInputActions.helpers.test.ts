import { describe, expect, it } from 'vitest';
import {
    canOpenFurniChooser,
    canOpenUserChooser,
    canUseAmbassadorCommand,
    canUseClassificationCommand,
    canUseRoomModerationCommand,
    clampFpsCommandValue,
    getAmbassadorVisitLink,
    getPingBubbleText,
    getScreenshotFileName
} from './useChatInputActions.helpers';

const visitor = { controllerLevel: 0, securityLevel: 0, isAmbassador: false };
const controller = { controllerLevel: 1, securityLevel: 0, isAmbassador: false };
const staff = { controllerLevel: 0, securityLevel: 4, isAmbassador: false };
const ambassador = { controllerLevel: 0, securityLevel: 0, isAmbassador: true };

describe('chat command gates (ChatInputWidgetHandler.as:178-541)', () => {
    it('lets room controllers kick and mute client-side and staff fall through to the server', () => {
        expect(canUseRoomModerationCommand(visitor)).toBe('none');
        expect(canUseRoomModerationCommand(controller)).toBe('client');
        expect(canUseRoomModerationCommand(staff)).toBe('server');
    });

    it('opens the furni chooser for controllers, security 2 and ambassadors only', () => {
        expect(canOpenFurniChooser(visitor)).toBe(false);
        expect(canOpenFurniChooser(controller)).toBe(true);
        expect(canOpenFurniChooser({ ...visitor, securityLevel: 2 })).toBe(true);
        expect(canOpenFurniChooser(ambassador)).toBe(true);
    });

    it('keeps the user chooser open unless the room disabled it for people without rights', () => {
        expect(canOpenUserChooser(visitor, false)).toBe(true);
        expect(canOpenUserChooser(visitor, true)).toBe(false);
        expect(canOpenUserChooser(controller, true)).toBe(true);
    });

    it('reserves the ambassador commands to ambassadors and staff, :uc to staff', () => {
        expect(canUseAmbassadorCommand(visitor)).toBe(false);
        expect(canUseAmbassadorCommand(ambassador)).toBe(true);
        expect(canUseAmbassadorCommand(staff)).toBe(true);
        expect(canUseClassificationCommand(ambassador)).toBe(false);
        expect(canUseClassificationCommand(staff)).toBe(true);
    });
});

describe('chat command formats', () => {
    it('clamps :fps to the official 5..10000 range and rejects non-numbers', () => {
        expect(clampFpsCommandValue('1')).toBe(5);
        expect(clampFpsCommandValue('60')).toBe(60);
        expect(clampFpsCommandValue('99999')).toBe(10000);
        expect(clampFpsCommandValue('abc')).toBeNull();
    });

    it('sends :avisit to the noob lobby and :avisit group to the group lobby', () => {
        expect(getAmbassadorVisitLink('')).toBe('navigator/goto/predefined_noob_lobby');
        expect(getAmbassadorVisitLink('group')).toBe('navigator/goto/predefined_group_lobby');
    });

    it('names the screenshot after the room or the official Habbo date stamp', () => {
        expect(getScreenshotFileName('My Room')).toBe('My Room.png');
        expect(getScreenshotFileName('', new Date(2026, 8, 8, 9, 5, 7))).toBe('Habbo 2026-8-8 9.5.7.png');
        expect(getScreenshotFileName(null, new Date(2026, 0, 1, 0, 0, 0))).toBe('Habbo 2026-0-1 0.0.0.png');
    });

    it('renders the ping bubble like the official ChatBubbleFactory', () => {
        expect(getPingBubbleText(42)).toBe('Ping: 42 ms');
        expect(getPingBubbleText(-1)).toBe('Ping: measuring...');
    });
});
