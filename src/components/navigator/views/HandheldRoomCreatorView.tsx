import { FC } from 'react';
import { IRoomModel, LocalizeText, localizeWithFallback } from '../../../api';
import vipIconBig from '../../../assets/images/navigator/air/icon-vip-big.png';
import vipIconSmall from '../../../assets/images/navigator/air/icon-vip-small.png';
import { BaseButton } from '../../../common/BaseButton';
import { DraggableWindow } from '../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Select } from '../../../common/Select';
import { ToggleButton } from '../../../common/ToggleButton';
import { HandheldRsError, HandheldRsField } from './room-settings/HandheldRoomSettingsParts';

interface HandheldRoomCreatorViewProps {
    name: string;
    description: string;
    namePlaceholder: string;
    descriptionPlaceholder: string;
    nameMaxLength: number;
    descriptionMaxLength: number;
    nameError: string | null;
    categories: string[];
    categoryIndex: number;
    visitors: string[];
    visitorsIndex: number;
    trades: string[];
    tradeIndex: number;
    models: IRoomModel[];
    selectedModelName: string;
    /** The player's HC level as the creator counts it (2 with HC switched off). */
    clubLevel: number;
    modelImage: (name: string) => string;
    showVipPromo: boolean;
    isCreating: boolean;
    onName: (value: string) => void;
    onNameFocus: () => void;
    onDescription: (value: string) => void;
    onDescriptionFocus: () => void;
    onCategory: (index: number) => void;
    onVisitors: (index: number) => void;
    onTrade: (index: number) => void;
    onSelectModel: (model: IRoomModel) => void;
    onVipPromo: () => void;
    onCreate: () => void;
    onClose: () => void;
}

/**
 * Creating a room on a phone: a sheet of its own over the navigator. The fields (16 px), the layouts as tiles with
 * their size and HC mark, and Cancel / Create in a bar at the bottom; on its side the fields sit left of the tiles.
 * NavigatorRoomCreatorView keeps the fields, the checks and the packet.
 */
export const HandheldRoomCreatorView: FC<HandheldRoomCreatorViewProps> = (props) => {
    const { categories, visitors, trades, models, selectedModelName, clubLevel } = props;
    const tileSize = LocalizeText('navigator.createroom.tilesize');

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="navigator-room-creator">
                <HandheldSheetFrame
                    className="octane-handheld-rs is-creator"
                    icon="icon-rooms"
                    title={LocalizeText('navigator.createroom.title')}
                    onClose={props.onClose}
                >
                    <div className="octane-handheld-rs__creator" data-testid="room-creator">
                        <div className="octane-handheld-rs__page octane-handheld-rs__creator-fields">
                            <div className="octane-handheld-rs__card">
                                <HandheldRsField htmlFor="octane-rc-name" label={LocalizeText('navigator.roomname')}>
                                    <input
                                        aria-invalid={!!props.nameError}
                                        className="octane-handheld-rs__input"
                                        enterKeyHint="next"
                                        id="octane-rc-name"
                                        maxLength={props.nameMaxLength}
                                        placeholder={props.namePlaceholder}
                                        type="text"
                                        value={props.name}
                                        onChange={(event) => props.onName(event.target.value)}
                                        onFocus={props.onNameFocus}
                                    />
                                    <HandheldRsError>{props.nameError}</HandheldRsError>
                                </HandheldRsField>
                                <HandheldRsField htmlFor="octane-rc-desc" label={LocalizeText('navigator.roomdesc')}>
                                    <textarea
                                        className="octane-handheld-rs__input is-area"
                                        id="octane-rc-desc"
                                        maxLength={props.descriptionMaxLength}
                                        placeholder={props.descriptionPlaceholder}
                                        value={props.description}
                                        onChange={(event) => props.onDescription(event.target.value)}
                                        onFocus={props.onDescriptionFocus}
                                    />
                                </HandheldRsField>
                                <HandheldRsField label={LocalizeText('navigator.category')}>
                                    <Select
                                        aria-label={LocalizeText('navigator.category')}
                                        className="octane-handheld-rs__select"
                                        value={props.categoryIndex}
                                        onChange={(event) => props.onCategory(Number(event.target.value))}
                                    >
                                        {categories.map((label, index) => (
                                            <option key={`${index}-${label}`} value={index}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                </HandheldRsField>
                                <div className="octane-handheld-rs__pair">
                                    <HandheldRsField label={LocalizeText('navigator.maxvisitors')}>
                                        <Select
                                            aria-label={LocalizeText('navigator.maxvisitors')}
                                            className="octane-handheld-rs__select"
                                            value={props.visitorsIndex}
                                            onChange={(event) => props.onVisitors(Number(event.target.value))}
                                        >
                                            {visitors.map((label, index) => (
                                                <option key={label} value={index}>
                                                    {label}
                                                </option>
                                            ))}
                                        </Select>
                                    </HandheldRsField>
                                    <HandheldRsField label={LocalizeText('navigator.tradesettings')}>
                                        <Select
                                            aria-label={LocalizeText('navigator.tradesettings')}
                                            className="octane-handheld-rs__select"
                                            value={props.tradeIndex}
                                            onChange={(event) => props.onTrade(Number(event.target.value))}
                                        >
                                            {trades.map((label, index) => (
                                                <option key={label} value={index}>
                                                    {label}
                                                </option>
                                            ))}
                                        </Select>
                                    </HandheldRsField>
                                </div>
                            </div>
                        </div>
                        <div className="octane-handheld-rs__page octane-handheld-rs__creator-models">
                            <h3 className="octane-handheld-rs__section-title">{LocalizeText('navigator.createroom.chooselayoutcaption')}</h3>
                            <div className="octane-handheld-rs__models" role="group" aria-label={LocalizeText('navigator.createroom.chooselayoutcaption')}>
                                {models.map((model) => {
                                    const selected = selectedModelName === model.name;
                                    const locked = model.clubLevel > 0 && clubLevel < model.clubLevel;

                                    return (
                                        <ToggleButton
                                            key={model.name}
                                            aria-label={`${model.tileSize} ${tileSize}`}
                                            className="octane-handheld-rs__model"
                                            data-locked={locked}
                                            pressed={selected}
                                            onClick={() => props.onSelectModel(model)}
                                        >
                                            <img alt="" className="octane-handheld-rs__model-picture" draggable={false} src={props.modelImage(model.name)} />
                                            <span className="octane-handheld-rs__model-size">{`${model.tileSize} ${tileSize}`}</span>
                                            {model.clubLevel > 0 && (
                                                <img alt="" className="octane-handheld-rs__model-club" height={10} src={vipIconSmall} width={19} />
                                            )}
                                        </ToggleButton>
                                    );
                                })}
                            </div>
                            {props.showVipPromo && (
                                <div className="octane-handheld-rs__promo">
                                    <img alt="" height={37} src={vipIconBig} width={37} />
                                    <span className="octane-handheld-rs__promo-text">{LocalizeText('navigator.createroom.vippromo.text')}</span>
                                    <BaseButton className="octane-handheld-rs__chip" onClick={props.onVipPromo}>
                                        {LocalizeText('navigator.createroom.vippromo.link')}
                                    </BaseButton>
                                </div>
                            )}
                        </div>
                        <div className="octane-handheld-rs__bar">
                            <BaseButton className="octane-handheld-rs__button is-secondary" onClick={props.onClose}>
                                {LocalizeText('generic.cancel')}
                            </BaseButton>
                            <BaseButton aria-busy={props.isCreating} className="octane-handheld-rs__button is-primary" onClick={props.onCreate}>
                                {props.isCreating
                                    ? localizeWithFallback('octane.handheld.room_settings.creating', 'Creating...')
                                    : LocalizeText('navigator.createroom.create')}
                            </BaseButton>
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
