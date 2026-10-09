import { FC, FormEvent, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { CUSTOM_FILTER_MAX_WORD_LENGTH, useCustomWordFilter } from '../../hooks';

/** Personal word filter (official custom_word_filter_settings): words masked in the chat you receive. */
export const WordFilterSettingsView: FC<{}> = () => {
    const [newWord, setNewWord] = useState('');
    const { words, addWord, removeWord, lastFailed, isFull } = useCustomWordFilter(true);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (addWord(newWord)) setNewWord('');
    };

    return (
        <div className="air-settings-wordfilter">
            <p className="air-settings-chat__info">
                {localizeWithFallback('memenu.settings.wordfilter.info', 'Words on this list are hidden in the chat you see.')}
            </p>
            <form className="air-settings-wordfilter__add" onSubmit={submit}>
                <input
                    aria-label={localizeWithFallback('memenu.settings.wordfilter.word', 'Word to hide')}
                    disabled={isFull}
                    maxLength={CUSTOM_FILTER_MAX_WORD_LENGTH}
                    placeholder={localizeWithFallback('memenu.settings.wordfilter.word', 'Word to hide')}
                    type="text"
                    value={newWord}
                    onChange={(event) => setNewWord(event.target.value)}
                />
                <button className="air-settings-button" disabled={isFull || !newWord.trim()} type="submit">
                    {localizeWithFallback('memenu.settings.wordfilter.add', 'Add')}
                </button>
            </form>
            {lastFailed && <p className="air-settings-wordfilter__error">{localizeWithFallback('memenu.settings.wordfilter.failed', 'That word could not be changed.')}</p>}
            {isFull && <p className="air-settings-wordfilter__error">{localizeWithFallback('memenu.settings.wordfilter.full', 'Your word list is full.')}</p>}
            <ul className="air-settings-wordfilter__list">
                {!words.length && <li className="air-settings-wordfilter__empty">{localizeWithFallback('memenu.settings.wordfilter.empty', 'No words yet.')}</li>}
                {words.map((word) => (
                    <li key={word}>
                        <span>{word}</span>
                        <button
                            aria-label={localizeWithFallback('memenu.settings.wordfilter.remove', 'Remove') + ' ' + word}
                            className="air-settings-wordfilter__remove"
                            onClick={() => removeWord(word)}
                            type="button"
                        >
                            ×
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
