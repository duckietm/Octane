import { describe, expect, it } from 'vitest';
import { AvatarInfoRentableBot } from './AvatarInfoRentableBot';
import { BotSkillsEnum } from './BotSkillsEnum';
import { applyRentableBotSkillList, cloneRentableBotInfo, getRentableBotCommandButtons } from './RentableBotSkillCommands';

const makeBot = (): AvatarInfoRentableBot => {
    const info = new AvatarInfoRentableBot(AvatarInfoRentableBot.RENTABLE_BOT);

    info.webID = -5;
    info.name = 'Bob';
    info.botSkills = [1, 3, 4];

    return info;
};

describe('applyRentableBotSkillList', () => {
    it('replaces the skills with the pushed list and keeps the commands, on a new instance', () => {
        const info = makeBot();
        const next = applyRentableBotSkillList(info, [
            { id: BotSkillsEnum.DANCE, data: '' },
            { id: BotSkillsEnum.INCLIENT_LINK, data: 'Shop,catalog/open' }
        ]);

        expect(next).not.toBe(info);
        expect(next).toBeInstanceOf(AvatarInfoRentableBot);
        expect(next.name).toBe('Bob');
        expect(next.botSkills).toEqual([BotSkillsEnum.DANCE, BotSkillsEnum.INCLIENT_LINK]);
        expect(next.botSkillsWithCommands).toEqual([
            { id: BotSkillsEnum.DANCE, data: '' },
            { id: BotSkillsEnum.INCLIENT_LINK, data: 'Shop,catalog/open' }
        ]);
        expect(info.botSkills).toEqual([1, 3, 4]);
    });

    it('clones without sharing the skill arrays', () => {
        const info = makeBot();
        const clone = cloneRentableBotInfo(info);

        clone.botSkills.push(9);

        expect(info.botSkills).toEqual([1, 3, 4]);
    });
});

describe('getRentableBotCommandButtons', () => {
    it('builds link, navigator search and proceed buttons as AIR does', () => {
        expect(
            getRentableBotCommandButtons([
                { id: BotSkillsEnum.DANCE, data: '' },
                { id: BotSkillsEnum.INCLIENT_LINK, data: 'Open shop,catalog/open/frontpage' },
                { id: BotSkillsEnum.NAVIGATOR_SEARCH, data: 'Popular,popular' },
                { id: BotSkillsEnum.NUX_PROCEED, data: '' },
                { id: BotSkillsEnum.NUX_PROCEED, data: 'Next,2' },
                { id: BotSkillsEnum.INCLIENT_LINK, data: 'broken' }
            ])
        ).toEqual([
            { key: 'link:1', label: 'Open shop', link: 'catalog/open/frontpage' },
            { key: 'search:2', label: 'Popular', link: 'navigator/search/popular' },
            { key: 'proceed:3', label: null, proceedStep: '1' },
            { key: 'proceed:4', label: 'Next', proceedStep: '2' }
        ]);
    });
});
