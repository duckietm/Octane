import { GetAvatarRenderManager, HabboClubLevelEnum, IAvatarFigureContainer, SaveWardrobeOutfitMessageComposer } from '@octane/renderer';
import { FC, useCallback, useMemo } from 'react';
import { GetClubMemberLevel, GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import hcIconSrc from '../../assets/images/avatareditor/air/wardrobe-hc.png';
import emptySlotSrc from '../../assets/images/avatareditor/wardrobe-empty-slot.png';
import { LayoutAvatarImageView } from '../../common';
import { useAvatarEditor } from '../../hooks';

const SLOTS_PER_COL = 7;
const HC_SLOT_LIMIT = 5;
const DEFAULT_SLOT_COUNT = 10;

const isWardrobeSlotEnabled = (slotId: number): boolean => {
    const level = GetClubMemberLevel();

    if (slotId <= HC_SLOT_LIMIT) return level >= HabboClubLevelEnum.CLUB;

    return level >= HabboClubLevelEnum.VIP;
};

export const AvatarEditorWardrobeView: FC<{}> = () => {
    const { savedFigures = [], setSavedFigures = null, loadAvatarData = null, getFigureString = null, gender = null } = useAvatarEditor();
    const maxSlots = GetConfigurationValue<number>('avatar.wardrobe.max.slots', DEFAULT_SLOT_COUNT);

    const slots = useMemo(() => {
        return Array.from({ length: maxSlots }, (_, index) => {
            const entry = savedFigures?.[index];

            if (!entry || !Array.isArray(entry)) return [null, null] as [IAvatarFigureContainer, string];

            return entry;
        });
    }, [maxSlots, savedFigures]);

    const columns = useMemo(() => {
        const next: [IAvatarFigureContainer, string][][] = [];

        for (let index = 0; index < slots.length; index += SLOTS_PER_COL) {
            next.push(slots.slice(index, index + SLOTS_PER_COL));
        }

        return next;
    }, [slots]);

    const wearFigureAtIndex = useCallback(
        (index: number) => {
            if (!isWardrobeSlotEnabled(index + 1) || index >= slots.length) return;

            const [figure] = slots[index];

            if (!figure) return;

            loadAvatarData(figure.getFigureString(), slots[index][1]);
        },
        [loadAvatarData, slots]
    );

    const saveFigureAtWardrobeIndex = useCallback(
        (index: number) => {
            if (!isWardrobeSlotEnabled(index + 1) || index >= slots.length) return;

            const newFigures = [...slots];
            const figure = getFigureString;

            newFigures[index] = [GetAvatarRenderManager().createFigureContainer(figure), gender];

            setSavedFigures(newFigures);
            SendMessageComposer(new SaveWardrobeOutfitMessageComposer(index + 1, figure, gender));
        },
        [gender, getFigureString, setSavedFigures, slots]
    );

    return (
        <aside className="octane-avatar-editor-wardrobe" aria-label={LocalizeText('avatareditor.wardrobe.title')}>
            <div className="octane-avatar-editor-wardrobe-header">
                <span className="octane-avatar-editor-wardrobe-title">{LocalizeText('avatareditor.wardrobe.title')}</span>
                <img src={hcIconSrc} alt="" draggable={false} className="octane-avatar-editor-wardrobe-hc" />
            </div>
            <div className="octane-avatar-editor-wardrobe-slots">
                {columns.map((column, columnIndex) => (
                    <div className="octane-avatar-editor-wardrobe-column" key={`wardrobe-col-${columnIndex}`}>
                        {column.map((item, rowIndex) => {
                            const index = columnIndex * SLOTS_PER_COL + rowIndex;
                            const [figureContainer, slotGender] = item;
                            const enabled = isWardrobeSlotEnabled(index + 1);
                            const figureString = figureContainer?.getFigureString() ?? '';

                            return (
                                <div className={`octane-avatar-editor-wardrobe-slot${enabled ? '' : ' is-locked'}`} key={`wardrobe-slot-${index}`}>
                                    <div className="octane-avatar-editor-wardrobe-slot-shade" />
                                    {enabled && (
                                        <button
                                            type="button"
                                            className="octane-avatar-editor-wardrobe-slot-set"
                                            aria-label={LocalizeText('avatareditor.wardrobe.save')}
                                            onClick={() => saveFigureAtWardrobeIndex(index)}
                                        />
                                    )}
                                    {enabled && figureContainer && (
                                        <button
                                            type="button"
                                            className="octane-avatar-editor-wardrobe-slot-get"
                                            aria-label={LocalizeText('widget.generic_usable.button.use')}
                                            onClick={() => wearFigureAtIndex(index)}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        className="octane-avatar-editor-wardrobe-slot-figure"
                                        disabled={!enabled || !figureContainer}
                                        aria-label={LocalizeText('widget.generic_usable.button.use')}
                                        onClick={() => wearFigureAtIndex(index)}
                                    >
                                        {figureContainer ? (
                                            <LayoutAvatarImageView direction={4} figure={figureString} gender={slotGender} fit />
                                        ) : (
                                            <img src={emptySlotSrc} alt="" draggable={false} className="octane-avatar-editor-wardrobe-empty" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </aside>
    );
};
