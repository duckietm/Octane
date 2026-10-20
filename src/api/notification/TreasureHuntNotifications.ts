/**
 * The treasure hunt texts of the official notifications controller (AIR 15, the controller that
 * registers TreasureHuntUpdate / TreasureHuntFail / TreasureHuntFirstWinner and turns each into a
 * `treasure_hunt` styled notification). Pure: the caller passes the localizer, which returns the
 * key itself for a missing text, like `LocalizeText`.
 */
export type TreasureHuntLocalizer = (key: string, parameters?: string[], replacements?: string[]) => string;

const FALLBACKS: Record<string, string> = {
    'treasure_hunt.progress.desc': 'Well done! You have completed %current%/%total% steps of the %hunt_name%!',
    'treasure_hunt.won.desc': 'Congratulations, you have completed the %hunt_name%!',
    'treasure_hunt.level_fail.desc': 'You need to be at least level %level% to complete this hunt, or level %level_paying% as a paying Habbo',
    'treasure_hunt.winner.desc': '%user_name% is the first Habbo to win the %hunt_name%!'
};

const fill = (text: string, parameters: string[], replacements: string[]): string =>
    parameters.reduce((value, parameter, index) => value.split(`%${parameter}%`).join(replacements[index] ?? ''), text);

const localizeOrFallback = (localize: TreasureHuntLocalizer, key: string, parameters: string[], replacements: string[]): string => {
    const value = localize(key, parameters, replacements);

    if (value && value !== key) return value;

    return fill(FALLBACKS[key] ?? '', parameters, replacements);
};

/** `getHuntName`: `treasure_hunt.<code>.name`, the hunt code itself when the text is missing. */
export const getTreasureHuntName = (huntCode: string, localize: TreasureHuntLocalizer): string => {
    const key = `treasure_hunt.${huntCode}.name`;
    const value = localize(key);

    return value && value !== key ? value : huntCode;
};

/** TreasureHuntUpdate: `won.desc` once the hunt is completed, `progress.desc` before. */
export const getTreasureHuntUpdateText = (
    huntCode: string,
    stepsCompleted: number,
    totalSteps: number,
    completed: boolean,
    localize: TreasureHuntLocalizer
): string => {
    const huntName = getTreasureHuntName(huntCode, localize);

    if (completed) return localizeOrFallback(localize, 'treasure_hunt.won.desc', ['hunt_name'], [huntName]);

    return localizeOrFallback(localize, 'treasure_hunt.progress.desc', ['current', 'total', 'hunt_name'], [String(stepsCompleted), String(totalSteps), huntName]);
};

/** TreasureHuntFail: the level the hunt asks for, regular and Habbo Club. */
export const getTreasureHuntFailText = (requiredLevel: number, requiredLevelPaying: number, localize: TreasureHuntLocalizer): string =>
    localizeOrFallback(localize, 'treasure_hunt.level_fail.desc', ['level', 'level_paying'], [String(requiredLevel), String(requiredLevelPaying)]);

/** TreasureHuntFirstWinner: the first Habbo who completed the hunt. */
export const getTreasureHuntWinnerText = (userName: string, huntCode: string, localize: TreasureHuntLocalizer): string =>
    localizeOrFallback(localize, 'treasure_hunt.winner.desc', ['user_name', 'hunt_name'], [userName, getTreasureHuntName(huntCode, localize)]);
