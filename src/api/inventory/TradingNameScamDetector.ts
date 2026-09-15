/**
 * Port of the official look-alike name detector (inventory/trading/namescam/class_3691.as,
 * AIR 13). A name is a potential scam of the trading partner's name when the two differ only by
 * up to two case changes, confusable characters (0/O/o, 1/l/I/!, ...), or up to two dropped or
 * added small punctuation marks (`.,:`). Names with characters outside the allowed set are
 * never compared.
 */
export interface ITradingNameScamDetectionResult {
    similarInRoom: string[];
    similarInFriends: string[];
    nameScamDetected: boolean;
}

/** TradingNameScamWarningData.as: what the warning window shows about the trading partner. */
export interface ITradingNameScamWarning {
    tradedUserId: number;
    tradedUserName: string;
    tradedUserFigure: string;
    similarInRoom: string[];
    similarInFriends: string[];
}

const MAX_CASE_CHANGES = 2;
const MAX_SMALL_PUNCTUATION_DEVIATIONS = 2;
const ALLOWED_PUNCTUATION = '_-=?!@:.,;';
const SMALL_PUNCTUATION = '.,:';
const EXTRA_ALLOWED_LETTERS = 'ÅÄÖåäöŞÇÜĞşçıüğ';
const CONFUSABLE_GROUPS = ['0OoÖö', '1lI!', '.,', ';:', 'AÅÄaåä', 'CÇcç', 'GĞgğ', 'SŞsş', 'UÜuü'];

let confusableGroupByCharacter: Map<string, string> = null;

const getConfusableGroupByCharacter = (): Map<string, string> => {
    if (!confusableGroupByCharacter) {
        confusableGroupByCharacter = new Map<string, string>();

        for (const group of CONFUSABLE_GROUPS) {
            for (const character of group) confusableGroupByCharacter.set(character, group);
        }
    }

    return confusableGroupByCharacter;
};

const isAllowedCharacter = (character: string): boolean => {
    if (!character || character.length !== 1) return false;

    const code = character.charCodeAt(0);

    if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return true;

    return ALLOWED_PUNCTUATION.includes(character) || EXTRA_ALLOWED_LETTERS.includes(character);
};

const isAllowedName = (name: string): boolean => {
    for (const character of name) {
        if (!isAllowedCharacter(character)) return false;
    }

    return true;
};

const isLetter = (character: string): boolean => {
    if (!character || character.length !== 1) return false;

    const code = character.charCodeAt(0);

    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || EXTRA_ALLOWED_LETTERS.includes(character);
};

const isCaseOnlyChange = (a: string, b: string): boolean => {
    if (!isLetter(a) || !isLetter(b) || a === b) return false;

    return a.toLowerCase() === b.toLowerCase() && a.toUpperCase() === b.toUpperCase();
};

const isSmallPunctuation = (character: string): boolean => SMALL_PUNCTUATION.includes(character);

const areConfusable = (a: string, b: string): boolean => {
    if (!a || !b || a === b) return false;

    const groups = getConfusableGroupByCharacter();
    const groupA = groups.get(a);
    const groupB = groups.get(b);

    return !!groupA && groupA === groupB;
};

const compareNames = (
    a: string,
    b: string,
    indexA: number,
    indexB: number,
    punctuationDeviations: number,
    caseChanges: number,
    memo: Map<string, boolean>
): boolean => {
    if (punctuationDeviations > MAX_SMALL_PUNCTUATION_DEVIATIONS || caseChanges > MAX_CASE_CHANGES) return false;

    const memoKey = `${indexA}|${indexB}|${punctuationDeviations}|${caseChanges}`;

    if (memo.has(memoKey)) return memo.get(memoKey);

    let result = false;

    if (indexA === a.length && indexB === b.length) {
        result = true;
    } else if (indexA < a.length && indexB < b.length) {
        const charA = a.charAt(indexA);
        const charB = b.charAt(indexB);

        if (charA === charB) {
            result = compareNames(a, b, indexA + 1, indexB + 1, punctuationDeviations, caseChanges, memo);
        } else if (isCaseOnlyChange(charA, charB)) {
            result = compareNames(a, b, indexA + 1, indexB + 1, punctuationDeviations, caseChanges + 1, memo);
        } else if (areConfusable(charA, charB)) {
            result = compareNames(a, b, indexA + 1, indexB + 1, punctuationDeviations, caseChanges, memo);
        }
    }

    if (!result && indexA < a.length && isSmallPunctuation(a.charAt(indexA))) {
        result = compareNames(a, b, indexA + 1, indexB, punctuationDeviations + 1, caseChanges, memo);
    }

    if (!result && indexB < b.length && isSmallPunctuation(b.charAt(indexB))) {
        result = compareNames(a, b, indexA, indexB + 1, punctuationDeviations + 1, caseChanges, memo);
    }

    memo.set(memoKey, result);

    return result;
};

export const isPotentialTradingScamName = (tradedName: string, candidate: string): boolean => {
    if (!tradedName || !candidate) return false;

    if (tradedName === candidate) return false;

    if (!isAllowedName(tradedName) || !isAllowedName(candidate)) return false;

    return compareNames(tradedName, candidate, 0, 0, 0, 0, new Map<string, boolean>());
};

const collectMatchingNames = (tradedName: string, candidates: readonly string[]): string[] => {
    const matches: string[] = [];

    if (!candidates || !tradedName) return matches;

    const seen = new Set<string>();

    for (const candidate of candidates) {
        if (!candidate || candidate === tradedName || seen.has(candidate)) continue;

        if (isPotentialTradingScamName(tradedName, candidate)) {
            seen.add(candidate);
            matches.push(candidate);
        }
    }

    return matches;
};

export const detectTradingNameScam = (
    tradedName: string,
    roomUserNames: readonly string[],
    friendNames: readonly string[]
): ITradingNameScamDetectionResult => {
    const similarInRoom = collectMatchingNames(tradedName, roomUserNames);
    const similarInFriends = collectMatchingNames(tradedName, friendNames);

    return { similarInRoom, similarInFriends, nameScamDetected: similarInRoom.length > 0 || similarInFriends.length > 0 };
};
