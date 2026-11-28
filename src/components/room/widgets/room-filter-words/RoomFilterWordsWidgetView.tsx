import { UpdateRoomFilterMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFilterWordsWidget, useNavigatorData } from '../../../../hooks';
import { classNames, OctaneInput } from '../../../../layout';
import { BaseButton } from '../../../../common/BaseButton';
import '../../../../css/room/RoomWidgetsSweepAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { HANDHELD_TOUCH_FRAME_SCALE } from '../../../../api/handheld/handheldWindowFit';
import { useIsHandheld } from '../../../../hooks/handheld/useHandheldLayout';
import { HandheldRoomFilterWordsView } from './HandheldRoomFilterWordsView';

/** The longest word the server keeps (RoomWordFilterModifyEvent cuts anything longer). */
export const MAX_WORD_LENGTH = 25;

export const RoomFilterWordsWidgetView: FC<{}> = (props) => {
    const [word, setWord] = useState<string>('bobba');
    const [selectedWord, setSelectedWord] = useState<string>('');
    const [isSelectingWord, setIsSelectingWord] = useState<boolean>(false);
    const { wordsFilter = [], isVisible = null, setWordsFilter, onClose = null } = useFilterWordsWidget();
    const { navigatorData } = useNavigatorData();
    const isHandheld = useIsHandheld();

    /** Sends one word to add or remove and changes the list as the server will. */
    const sendFilterChange = (isAddingWord: boolean, value: string) => {
        if (!value) return;

        SendMessageComposer(new UpdateRoomFilterMessageComposer(navigatorData.enteredGuestRoom.roomId, isAddingWord, value));
        setSelectedWord('');
        setWord('bobba');
        setIsSelectingWord(false);

        if (isAddingWord && wordsFilter.includes(value)) return;

        setWordsFilter((prevValue) => {
            const newWords = [...prevValue];

            isAddingWord ? newWords.push(value) : newWords.splice(newWords.indexOf(value), 1);

            return newWords;
        });
    };

    const processAction = (isAddingWord: boolean) => sendFilterChange(isAddingWord, isSelectingWord ? selectedWord : word);

    const onTyping = (word: string) => {
        setWord(word);
        setIsSelectingWord(false);
    };

    const onSelectedWord = (word: string) => {
        setSelectedWord(word);
        setIsSelectingWord(true);
    };

    if (!isVisible) return null;

    if (isHandheld) {
        return (
            <HandheldRoomFilterWordsView
                maxLength={MAX_WORD_LENGTH}
                word={word}
                words={wordsFilter ?? []}
                onAdd={() => sendFilterChange(true, word)}
                onClose={() => onClose()}
                onRemove={(value) => sendFilterChange(false, value)}
                onWord={onTyping}
            />
        );
    }

    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_TOUCH_FRAME_SCALE} uniqueKey="room-filter-words"
                isResizable={false}
                className="octane-room-filter-words min-w-0 w-[min(340px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                theme="primary-slim"
            >
                <OctaneCardHeaderView headerText={LocalizeText('navigator.roomsettings.roomfilter')} onCloseClick={() => onClose()} />
                <OctaneCardContentView className="text-black">
                    <Grid className="flex items-center gap-2 justify-end">
                        <OctaneInput maxLength={MAX_WORD_LENGTH} type="text" value={word} onChange={(event) => onTyping(event.target.value)} />
                        <Button variant="secondary" onClick={() => processAction(true)}>{LocalizeText('navigator.roomsettings.roomfilter.addword')}</Button>
                    </Grid>
                    <Column
                        className="min-h-[calc(1.5em+ .5rem+2px)] px-[.5rem] py-[.25rem] rounded-[.2rem] form-control-sm"
                        gap={0}
                        overflow="auto"
                        style={{ height: '100px' }}
                    >
                        {wordsFilter &&
                            wordsFilter.length > 0 &&
                            wordsFilter.map((word, index) => {
                                return (
                                    <Flex component={BaseButton} type="button"
                                        key={index}
                                        pointer
                                        alignItems="center"
                                        className={classNames('rounded p-1', selectedWord === word && 'bg-muted')}
                                        onClick={(event) => onSelectedWord(word)}
                                    >
                                        <Text truncate>{word}</Text>
                                    </Flex>
                                );
                            })}
                    </Column>
                    <Grid className="flex items-center gap-2 justify-end">
                        <Button disabled={wordsFilter.length === 0 || !isSelectingWord} variant="secondary" onClick={() => processAction(false)}>
                            {LocalizeText('navigator.roomsettings.roomfilter.removeword')}
                        </Button>
                    </Grid>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
