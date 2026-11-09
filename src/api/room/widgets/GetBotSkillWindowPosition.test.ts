import { describe, expect, it } from 'vitest';
import { GetBotSkillWindowPosition } from './GetBotSkillWindowPosition';

describe('GetBotSkillWindowPosition', () => {
    it('centres the window on the bot with its bottom on the bot head', () => {
        expect(GetBotSkillWindowPosition({ x: 400, y: 300, width: 64 }, 209, 119, 1280, 720)).toEqual({ x: 328, y: 181 });
    });

    it('keeps the whole window on screen', () => {
        expect(GetBotSkillWindowPosition({ x: 10, y: 50, width: 40 }, 278, 369, 1280, 720)).toEqual({ x: 0, y: 0 });
        expect(GetBotSkillWindowPosition({ x: 1270, y: 2000, width: 40 }, 278, 369, 1280, 720)).toEqual({ x: 1002, y: 351 });
    });

    it('centres on screen without bot bounds', () => {
        expect(GetBotSkillWindowPosition(null, 209, 119, 1280, 720)).toEqual({ x: 536, y: 301 });
    });
});
