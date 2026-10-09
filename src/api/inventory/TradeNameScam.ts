const MAX_CASE_CHANGES = 2;
const MAX_SKIPPED_PUNCTUATION = 2;
const ALLOWED_PUNCTUATION = '_-=?!@:.,;';
const SMALL_PUNCTUATION = '.,:';
const EXTRA_LETTERS = 'ÅÄÖåäöŞÇÜĞşçıüğ';
const CONFUSABLE_GROUPS = ['0OoÖö', '1lI!', '.,', ';:', 'AÅÄaåä', 'CÇcç', 'GĞgğ', 'SŞsş', 'UÜuü'];

const confusableGroup = new Map<string, string>();

for (const group of CONFUSABLE_GROUPS) for (const char of group) confusableGroup.set(char, group);

const isAsciiLetter = (char: string) => /^[A-Za-z]$/.test(char);
const isLetter = (char: string) => isAsciiLetter(char) || EXTRA_LETTERS.includes(char);
const isAllowedChar = (char: string) => /^[0-9]$/.test(char) || isLetter(char) || ALLOWED_PUNCTUATION.includes(char);
const isCaseOnlyChange = (a: string, b: string) => a !== b && isLetter(a) && isLetter(b) && a.toLowerCase() === b.toLowerCase();
const areConfusable = (a: string, b: string) => a !== b && confusableGroup.has(a) && confusableGroup.get(a) === confusableGroup.get(b);

export const isLookalikeName = (name: string, other: string): boolean => {
    if (!name || !other || name === other) return false;

    const first = [...name];
    const second = [...other];

    if (!first.every(isAllowedChar) || !second.every(isAllowedChar)) return false;

    const memo = new Map<string, boolean>();

    const compare = (i: number, j: number, skipped: number, caseChanges: number): boolean => {
        if (skipped > MAX_SKIPPED_PUNCTUATION || caseChanges > MAX_CASE_CHANGES) return false;

        const key = `${i}|${j}|${skipped}|${caseChanges}`;
        const known = memo.get(key);

        if (known !== undefined) return known;

        let result = false;

        if (i === first.length && j === second.length) result = true;
        else if (i < first.length && j < second.length) {
            const a = first[i];
            const b = second[j];

            if (a === b) result = compare(i + 1, j + 1, skipped, caseChanges);
            else if (isCaseOnlyChange(a, b)) result = compare(i + 1, j + 1, skipped, caseChanges + 1);
            else if (areConfusable(a, b)) result = compare(i + 1, j + 1, skipped, caseChanges);
        }

        if (!result && i < first.length && SMALL_PUNCTUATION.includes(first[i])) result = compare(i + 1, j, skipped + 1, caseChanges);
        if (!result && j < second.length && SMALL_PUNCTUATION.includes(second[j])) result = compare(i, j + 1, skipped + 1, caseChanges);

        memo.set(key, result);

        return result;
    };

    return compare(0, 0, 0, 0);
};

export const findLookalikeNames = (name: string, candidates: Iterable<string>): string[] => {
    const matches: string[] = [];

    if (!name) return matches;

    for (const candidate of candidates) {
        if (!candidate || candidate === name || matches.includes(candidate)) continue;

        if (isLookalikeName(name, candidate)) matches.push(candidate);
    }

    return matches;
};
