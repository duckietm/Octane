/**
 * Pure list logic of the AIR 13 personal word filter window
 * (WordFilterSettingsView.as): the client only mirrors what the server
 * confirms, it never masks chat itself — the emulator masks room chat
 * per recipient.
 */

/** ModifyCustomFilterResult codes (class_3554 constants). */
export const WORD_FILTER_RESULT_ADDED = 1;
export const WORD_FILTER_RESULT_REMOVED = 3;

/** The emulator caps a word at 25 characters, like the room word filter. */
export const WORD_FILTER_MAX_WORD_LENGTH = 25;

/** What the user typed, as the server will store it (trimmed, case-insensitive). */
export const normalizeWordFilterInput = (input: string): string => (input ?? '').trim();

const sameWord = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** CustomFilterResult: every word not yet listed is appended, order preserved. */
export const mergeWordFilterList = (current: readonly string[], incoming: readonly string[]): string[] => {
    const next = [...current];

    for (const word of incoming) {
        if (!next.some((listed) => sameWord(listed, word))) next.push(word);
    }

    return next;
};

/** ModifyCustomFilterResult: 1 appends the word, 3 drops it, anything else leaves the list as is. */
export const applyWordFilterModifyResult = (current: readonly string[], result: number, word: string): string[] => {
    if (result === WORD_FILTER_RESULT_ADDED) {
        return current.some((listed) => sameWord(listed, word)) ? [...current] : [...current, word];
    }

    if (result === WORD_FILTER_RESULT_REMOVED) {
        return current.filter((listed) => !sameWord(listed, word));
    }

    return [...current];
};

/** The Add button only sends a non-empty word that is not already listed. */
export const canAddWordFilterWord = (input: string, words: readonly string[]): boolean => {
    const word = normalizeWordFilterInput(input);

    return word.length > 0 && !words.some((listed) => sameWord(listed, word));
};

/** Row background of the official list: selected, hovered, then alternating rows. */
export const wordFilterRowColor = (index: number, selectedIndex: number, hovered: boolean): string => {
    if (index === selectedIndex) return '#9ab8d9';
    if (hovered) return '#b6d9ff';

    return index % 2 !== 0 ? '#ffffff' : '#e3e9e1';
};
