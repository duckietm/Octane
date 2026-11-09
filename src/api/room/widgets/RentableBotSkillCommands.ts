import { AvatarInfoRentableBot, IRentableBotSkillCommand } from './AvatarInfoRentableBot';
import { BotSkillsEnum } from './BotSkillsEnum';

/** A data-driven button of the rentable bot menu (AIR RentableBotMenuView links and NUX proceed buttons). */
export interface RentableBotCommandButton {
    key: string;
    label: string | null;
    /** Link to open (in-client link or navigator search). */
    link?: string;
    /** NUX proceed step, sent back as the BotSkillSave data. */
    proceedStep?: string;
}

/** Copies a rentable bot info, keeping it a real AvatarInfoRentableBot so the menu still recognises it. */
export const cloneRentableBotInfo = (info: AvatarInfoRentableBot): AvatarInfoRentableBot => {
    const clone = new AvatarInfoRentableBot(info.type);

    Object.assign(clone, info);

    clone.botSkills = [...info.botSkills];
    clone.botSkillsWithCommands = [...info.botSkillsWithCommands];

    return clone;
};

/**
 * AIR class_2504.cloneAndSetSkillsWithCommands: the pushed list replaces the bot's skills, and the
 * commands are kept for the data-driven buttons.
 */
export const applyRentableBotSkillList = (info: AvatarInfoRentableBot, skillList: ReadonlyArray<IRentableBotSkillCommand>): AvatarInfoRentableBot => {
    const next = cloneRentableBotInfo(info);

    next.botSkills = skillList.map((skill) => skill.id);
    next.botSkillsWithCommands = skillList.map((skill) => ({ id: skill.id, data: skill.data ?? '' }));

    return next;
};

const splitPair = (data: string): [string, string] | null => {
    const parts = (data ?? '').split(',');

    if (parts.length !== 2) return null;

    return [parts[0] ?? '', parts[1] ?? ''];
};

/**
 * The extra menu buttons AIR's RentableBotMenuView adds for skills with data: in-client links
 * ("label,link"), navigator searches ("label,searchCode") and NUX proceed steps ("label,step", or
 * empty for the first step). A label of null means the default proceed text.
 */
export const getRentableBotCommandButtons = (commands: ReadonlyArray<IRentableBotSkillCommand>): RentableBotCommandButton[] => {
    const buttons: RentableBotCommandButton[] = [];

    commands.forEach((command, index) => {
        switch (command.id) {
            case BotSkillsEnum.INCLIENT_LINK: {
                const pair = splitPair(command.data);

                if (pair) buttons.push({ key: `link:${index}`, label: pair[0], link: pair[1] });
                return;
            }
            case BotSkillsEnum.NAVIGATOR_SEARCH: {
                const pair = splitPair(command.data);

                if (pair) buttons.push({ key: `search:${index}`, label: pair[0], link: `navigator/search/${pair[1]}` });
                return;
            }
            case BotSkillsEnum.NUX_PROCEED: {
                if (!command.data) {
                    buttons.push({ key: `proceed:${index}`, label: null, proceedStep: '1' });
                    return;
                }

                const pair = splitPair(command.data);

                if (pair) buttons.push({ key: `proceed:${index}`, label: pair[0], proceedStep: String(parseInt(pair[1], 10) || 1) });
                return;
            }
        }
    });

    return buttons;
};
