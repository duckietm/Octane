import {
    AddCustomFilterWordMessageComposer,
    CustomFilterResultEvent,
    GetCustomFilterMessageComposer,
    ModifyCustomFilterResultEvent,
    RemoveCustomFilterWordMessageComposer
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../api';
import { useMessageEvent } from './events';

export const CUSTOM_FILTER_MAX_WORD_LENGTH = 25;
export const CUSTOM_FILTER_MAX_WORDS = 100;

const RESULT_ADDED = 1;
const RESULT_REMOVED = 3;

export const normalizeCustomFilterWord = (word: string): string => (word ?? '').trim().toLowerCase().substring(0, CUSTOM_FILTER_MAX_WORD_LENGTH);

export const useCustomWordFilter = (active: boolean) => {
    const [words, setWords] = useState<string[]>([]);
    const [lastFailed, setLastFailed] = useState(false);

    useEffect(() => {
        if (active) SendMessageComposer(new GetCustomFilterMessageComposer());
    }, [active]);

    useMessageEvent<CustomFilterResultEvent>(CustomFilterResultEvent, (event) => {
        setWords([...(event.getParser().words ?? [])]);
    });

    useMessageEvent<ModifyCustomFilterResultEvent>(ModifyCustomFilterResultEvent, (event) => {
        const { result, word } = event.getParser();

        setLastFailed(result !== RESULT_ADDED && result !== RESULT_REMOVED);

        if (result === RESULT_ADDED) setWords((previous) => (previous.includes(word) ? previous : [...previous, word]));
        else if (result === RESULT_REMOVED) setWords((previous) => previous.filter((existing) => existing !== word));
    });

    const addWord = (word: string): boolean => {
        const normalized = normalizeCustomFilterWord(word);

        if (!normalized || words.includes(normalized) || words.length >= CUSTOM_FILTER_MAX_WORDS) return false;

        SendMessageComposer(new AddCustomFilterWordMessageComposer(normalized));

        return true;
    };

    const removeWord = (word: string) => SendMessageComposer(new RemoveCustomFilterWordMessageComposer(word));

    return { words, addWord, removeWord, lastFailed, isFull: words.length >= CUSTOM_FILTER_MAX_WORDS };
};
