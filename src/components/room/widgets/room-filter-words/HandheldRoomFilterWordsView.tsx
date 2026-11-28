import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { DraggableWindow } from '../../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { HandheldRsEmpty } from '../../../navigator/views/room-settings/HandheldRoomSettingsParts';

interface HandheldRoomFilterWordsViewProps {
    words: string[];
    word: string;
    maxLength: number;
    onWord: (word: string) => void;
    onAdd: () => void;
    onRemove: (word: string) => void;
    onClose: () => void;
}

/**
 * The room's word filter on a phone: a sheet in the Octane handheld look with the new word and Add at the top and the
 * filtered words as cards, each with its own Remove. RoomFilterWordsWidgetView keeps the list and sends the changes.
 */
export const HandheldRoomFilterWordsView: FC<HandheldRoomFilterWordsViewProps> = ({ words, word, maxLength, onWord, onAdd, onRemove, onClose }) => {
    const remove = LocalizeText('navigator.roomsettings.roomfilter.removeword');

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="room-filter-words">
                <HandheldSheetFrame
                    className="octane-handheld-rs is-filter"
                    icon="icon-rooms"
                    title={LocalizeText('navigator.roomsettings.roomfilter')}
                    onClose={onClose}
                >
                    <div className="octane-handheld-rs__page" data-testid="room-filter">
                        <form
                            className="octane-handheld-rs__add"
                            onSubmit={(event) => {
                                event.preventDefault();
                                onAdd();
                            }}
                        >
                            <input
                                aria-label={localizeWithFallback('octane.handheld.room_settings.filter.word', 'Word to filter')}
                                className="octane-handheld-rs__input"
                                enterKeyHint="done"
                                maxLength={maxLength}
                                type="text"
                                value={word}
                                onChange={(event) => onWord(event.target.value)}
                            />
                            <BaseButton className="octane-handheld-rs__button is-primary" disabled={!word} type="submit">
                                {LocalizeText('navigator.roomsettings.roomfilter.addword')}
                            </BaseButton>
                        </form>
                        <h3 className="octane-handheld-rs__section-title">
                            {localizeWithFallback('octane.handheld.room_settings.filter.count', 'Filtered words (%count%)', ['count'], [String(words.length)])}
                        </h3>
                        <div className="octane-handheld-rs__card octane-handheld-rs__words">
                            {words.length === 0 && (
                                <HandheldRsEmpty>
                                    {localizeWithFallback('octane.handheld.room_settings.filter.empty', 'No words are filtered in this room yet.')}
                                </HandheldRsEmpty>
                            )}
                            {words.map((filtered, index) => (
                                <div key={`${index}-${filtered}`} className="octane-handheld-rs__word">
                                    <span className="octane-handheld-rs__word-text">{filtered}</span>
                                    <BaseButton
                                        aria-label={`${remove}: ${filtered}`}
                                        className="octane-handheld-rs__person-action"
                                        data-tone="remove"
                                        onClick={() => onRemove(filtered)}
                                    >
                                        {remove}
                                    </BaseButton>
                                </div>
                            ))}
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
