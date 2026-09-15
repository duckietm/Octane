import {
    AddCustomFilterWordMessageComposer,
    AddLinkEventTracker,
    CustomFilterResultEvent,
    GetCustomFilterMessageComposer,
    ILinkEventTracker,
    ModifyCustomFilterResultEvent,
    RemoveCustomFilterWordMessageComposer,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { FC, KeyboardEvent, useCallback, useEffect, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { DraggableWindow } from '../../../common';
import { useMessageEvent } from '../../../hooks';
import {
    applyWordFilterModifyResult,
    canAddWordFilterWord,
    mergeWordFilterList,
    normalizeWordFilterInput,
    WORD_FILTER_MAX_WORD_LENGTH,
    wordFilterRowColor
} from './wordFilterList';

/**
 * AIR 13 WordFilterSettingsView (custom_word_filter_settings_xml, 242x248):
 * title, divider, [input | Add], word list, Remove, Back. Opened from the
 * ME menu settings "Word filter" row and from the purse settings menu.
 * Link: `word-filter/show|hide|toggle`.
 */
export const WordFilterSettingsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [words, setWords] = useState<string[]>([]);
    const [input, setInput] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [hoveredIndex, setHoveredIndex] = useState(-1);

    const close = useCallback(() => {
        setIsVisible(false);
        setInput('');
        setSelectedIndex(-1);
        setHoveredIndex(-1);
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        close();
                        return;
                    case 'toggle':
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'word-filter/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [close]);

    // The official view asks for the list every time the window is built.
    useEffect(() => {
        if (!isVisible) return;

        setWords([]);
        SendMessageComposer(new GetCustomFilterMessageComposer());
    }, [isVisible]);

    useMessageEvent<CustomFilterResultEvent>(
        CustomFilterResultEvent,
        useCallback((event: CustomFilterResultEvent) => {
            const parser = event.getParser();

            setWords((current) => mergeWordFilterList(current, parser.words));
        }, [])
    );

    useMessageEvent<ModifyCustomFilterResultEvent>(
        ModifyCustomFilterResultEvent,
        useCallback((event: ModifyCustomFilterResultEvent) => {
            const parser = event.getParser();

            setWords((current) => applyWordFilterModifyResult(current, parser.result, parser.word));
        }, [])
    );

    const addWord = useCallback(() => {
        if (!canAddWordFilterWord(input, words)) return;

        SendMessageComposer(new AddCustomFilterWordMessageComposer(normalizeWordFilterInput(input)));
        setInput('');
        setSelectedIndex(-1);
    }, [input, words]);

    const removeWord = useCallback(() => {
        if (selectedIndex < 0) return;

        const word = words[selectedIndex];

        if (word === undefined) return;

        setSelectedIndex(-1);
        SendMessageComposer(new RemoveCustomFilterWordMessageComposer(word));
    }, [selectedIndex, words]);

    const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        addWord();
    };

    if (!isVisible) return null;

    const title = localizeWithFallback('word_filter.settings.title', 'Word filter');
    const addLabel = localizeWithFallback('navigator.roomsettings.roomfilter.addword', 'Add');
    const removeLabel = localizeWithFallback('navigator.roomsettings.roomfilter.removeword', 'Remove');
    const backLabel = localizeWithFallback('widget.memenu.back', localizeWithFallback('generic.back', 'Back'));

    return (
        <DraggableWindow handleSelector=".air-settings-window__title" uniqueKey="word-filter-settings">
            <section
                aria-label={title}
                className="user-settings-window air-settings-window air-settings-window--wordfilter max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                role="dialog"
            >
                <div aria-hidden="true" className="air-settings-window__chrome" />
                <h2 className="air-settings-window__title">{title}</h2>
                <div aria-hidden="true" className="air-settings-window__divider" />
                <div className="air-wordfilter__add-row">
                    <div className="air-wordfilter__input-border">
                        <input
                            aria-label={addLabel}
                            className="air-wordfilter__input"
                            maxLength={WORD_FILTER_MAX_WORD_LENGTH}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={onInputKeyDown}
                            type="text"
                            value={input}
                        />
                    </div>
                    <button className="air-settings-button air-wordfilter__add" onClick={addWord} type="button">
                        {addLabel}
                    </button>
                </div>
                <div className="air-wordfilter__list-border">
                    <ul aria-label={title} className="air-wordfilter__list" role="listbox">
                        {words.map((word, index) => (
                            <li
                                aria-selected={index === selectedIndex}
                                className="air-wordfilter__row"
                                key={word}
                                onClick={() => setSelectedIndex(index)}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex((current) => (current === index ? -1 : current))}
                                role="option"
                                style={{ backgroundColor: wordFilterRowColor(index, selectedIndex, hoveredIndex === index) }}
                            >
                                {word}
                            </li>
                        ))}
                    </ul>
                </div>
                <button className="air-settings-button air-wordfilter__remove" onClick={removeWord} type="button">
                    {removeLabel}
                </button>
                <button className="air-settings-button air-settings-window__back" onClick={close} type="button">
                    {backLabel}
                </button>
            </section>
        </DraggableWindow>
    );
};
