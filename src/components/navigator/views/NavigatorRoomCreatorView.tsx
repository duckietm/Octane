import { CreateFlatMessageComposer } from '@octane/renderer';
import { FC, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, IRoomModel, LocalizeText, SendMessageComposer } from '../../../api';
import dropmenuArrow from '../../../assets/images/habbo-skin/slices/dropmenu-default-arrow.png';
import vipIconBig from '../../../assets/images/navigator/air/icon-vip-big.png';
import vipIconSmall from '../../../assets/images/navigator/air/icon-vip-small.png';
import popupArrowDown from '../../../assets/images/navigator/air/popup-arrow-down.png';
import tileIconBlack from '../../../assets/images/navigator/air/tile-icon-black.png';
import tileIconWhite from '../../../assets/images/navigator/air/tile-icon-white.png';
import { DraggableWindow } from '../../../common';
import { useNavigatorData, useNavigatorUiStore, useRoomCreateLimitAlert, useUserDataSnapshot, useUserPermissions } from '../../../hooks';
import { useRoomCreatorStore } from './navigatorRoomCreatorStore';
import { BaseButton } from '../../../common/BaseButton';
import { ListSelect } from '../../../common/ListSelect';
import { ToggleButton } from '../../../common/ToggleButton';

const AIR_TRADE_KEYS = ['navigator.roomsettings.trade_not_allowed', 'navigator.roomsettings.trade_not_with_Controller', 'navigator.roomsettings.trade_allowed'];

const ROOM_LIMIT_HC = 75;
const ROOM_LIMIT_NON_SUBSCRIBER = 50;

const buildVisitorOptions = (limit: number) => {
    const values: string[] = [];

    for (let value = 10; value <= limit; value += 5) values.push(String(value));

    return values;
};

interface RoomCreatorDropmenuProps {
    className: string;
    label: string;
    options: string[];
    value: number;
    onChange: (index: number) => void;
}

const RoomCreatorDropmenu: FC<RoomCreatorDropmenuProps> = (props) => {
    const { className, label, options, value, onChange } = props;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={rootRef} className={`octane-room-creator-air__dropmenu ${className}${open ? ' is-open' : ''}`}>
            <ListSelect
                aria-label={label}
                container={rootRef}
                itemClassName="octane-room-creator-air__dropmenu-option"
                options={options.map((option, index) => ({ value: String(index), label: option }))}
                popupClassName="octane-room-creator-air__dropmenu-list"
                sideOffset={-1}
                triggerClassName="octane-room-creator-air__dropmenu-button"
                value={String(value)}
                renderTrigger={(current) => (
                    <>
                        <span>{current?.label ?? ''}</span>
                        <img src={dropmenuArrow} alt="" width={16} height={16} />
                    </>
                )}
                onOpenChange={setOpen}
                onValueChange={(next) => onChange(Number(next))}
            />
        </div>
    );
};

export const NavigatorRoomCreatorView: FC = () => {
    const { categories } = useNavigatorData();
    const { clubLevel, securityLevel } = useUserDataSnapshot();
    const permissions = useUserPermissions();
    // acc_navigator_staff; a server that sends no keys keeps Flash's staff level (4).
    const isNavigatorStaff = permissions.size ? permissions.get('acc_navigator_staff') === 1 : securityLevel >= 4;
    const beginCreate = useRoomCreatorStore((state) => state.beginCreate);

    const hcDisabled = GetConfigurationValue<boolean>('hc.disabled', false);
    const effectiveClubLevel = hcDisabled ? 2 : clubLevel;

    useRoomCreateLimitAlert(effectiveClubLevel >= 2, () => useRoomCreatorStore.getState().endCreate());

    const [name, setName] = useState('');
    const [nameTouched, setNameTouched] = useState(false);
    const [description, setDescription] = useState('');
    const [descriptionTouched, setDescriptionTouched] = useState(false);
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [visitorsIndex, setVisitorsIndex] = useState(0);
    const [tradeIndex, setTradeIndex] = useState(0);
    const [nameError, setNameError] = useState<string>(null);
    const [roomModels] = useState<IRoomModel[]>(() => GetConfigurationValue<IRoomModel[]>('navigator.room.models') ?? []);
    const [selectedModelName, setSelectedModelName] = useState<string>(() => {
        const models = GetConfigurationValue<IRoomModel[]>('navigator.room.models');

        return models && models.length ? models[0].name : '';
    });

    const visibleModels = useMemo(() => roomModels.filter((model) => model.clubLevel >= 0 || isNavigatorStaff), [roomModels, isNavigatorStaff]);

    const selectableCategories = useMemo(
        () => (categories ?? []).filter((category) => category.visible && !category.automatic && (!category.staffOnly || isNavigatorStaff)),
        [categories, isNavigatorStaff]
    );

    const visitorOptions = useMemo(() => buildVisitorOptions(effectiveClubLevel >= 2 ? ROOM_LIMIT_HC : ROOM_LIMIT_NON_SUBSCRIBER), [effectiveClubLevel]);

    const safeCategoryIndex = categoryIndex < selectableCategories.length ? categoryIndex : 0;
    const safeVisitorsIndex = visitorsIndex < visitorOptions.length ? visitorsIndex : 0;

    const namePlaceholder = LocalizeText('navigator.createroom.roomnameinfo');
    const descriptionPlaceholder = LocalizeText('navigator.createroom.roomdescinfo');
    const tileSizeLabel = LocalizeText('navigator.createroom.tilesize');

    const getRoomModelImage = (modelName: string) => `${GetConfigurationValue<string>('images.url')}/navigator/models/model_${modelName}.png`;

    const closeCreator = () => useNavigatorUiStore.getState().closeCreator();

    const selectModel = (model: IRoomModel) => {
        if (model.clubLevel > 0 && effectiveClubLevel < model.clubLevel) {
            CreateLinkEvent('habboUI/open/hccenter');

            return;
        }

        if (model.clubLevel < 0 && !isNavigatorStaff) return;

        setSelectedModelName(model.name);
    };

    const createRoom = () => {
        const roomName = nameTouched ? name : '';

        if (roomName.trim().length <= 2) {
            setNameError(LocalizeText('navigator.createroom.nameerr'));

            return;
        }

        setNameError(null);

        if (useRoomCreatorStore.getState().isCreating) return;

        beginCreate();

        const category = selectableCategories[safeCategoryIndex];

        SendMessageComposer(
            new CreateFlatMessageComposer(
                roomName,
                descriptionTouched ? description : '',
                `model_${selectedModelName}`,
                category ? category.id : 0,
                Number(visitorOptions[safeVisitorsIndex] ?? 10),
                tradeIndex
            )
        );
    };

    const showVipPromo = effectiveClubLevel < 2 && !hcDisabled;

    return (
        <DraggableWindow uniqueKey="navigator-room-creator" handleSelector=".octane-room-creator-air__caption">
            <div className="octane-room-creator-air" data-air-frame="ubuntu-3">
                <div className="octane-room-creator-air__skin" aria-hidden="true" />
                <div className="octane-room-creator-air__caption">
                    <span className="octane-room-creator-air__title">{LocalizeText('navigator.createroom.title')}</span>
                    <BaseButton type="button" className="octane-room-creator-air__close" aria-label={LocalizeText('generic.close')} onClick={closeCreator} />
                </div>

                <span className="octane-room-creator-air__label octane-room-creator-air__label--name">{LocalizeText('navigator.roomname')}</span>
                <div className={`octane-room-creator-air__field octane-room-creator-air__field--name${nameError ? ' is-invalid' : ''}`}>
                    <input
                        className="octane-room-creator-air__input"
                        maxLength={25}
                        type="text"
                        value={nameTouched ? name : namePlaceholder}
                        onFocus={() => {
                            if (nameTouched) return;
                            setNameTouched(true);
                            setNameError(null);
                        }}
                        onChange={(event) => setName(event.target.value)}
                    />
                </div>
                {nameError && (
                    <div className="octane-room-creator-air__error" role="alert">
                        <div className="octane-room-creator-air__error-border">
                            <span>{nameError}</span>
                        </div>
                        <img className="octane-room-creator-air__error-arrow" src={popupArrowDown} alt="" width={11} height={11} />
                    </div>
                )}

                <span className="octane-room-creator-air__label octane-room-creator-air__label--desc">{LocalizeText('navigator.roomdesc')}</span>
                <div className="octane-room-creator-air__field octane-room-creator-air__field--desc">
                    <textarea
                        className="octane-room-creator-air__input octane-room-creator-air__input--multiline"
                        maxLength={128}
                        value={descriptionTouched ? description : descriptionPlaceholder}
                        onFocus={() => setDescriptionTouched(true)}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </div>

                <span className="octane-room-creator-air__label octane-room-creator-air__label--category">{LocalizeText('navigator.category')}</span>
                <RoomCreatorDropmenu
                    className="octane-room-creator-air__dropmenu--category"
                    label={LocalizeText('navigator.category')}
                    options={selectableCategories.map((category) => LocalizeText(category.name))}
                    value={safeCategoryIndex}
                    onChange={setCategoryIndex}
                />

                <span className="octane-room-creator-air__label octane-room-creator-air__label--visitors">{LocalizeText('navigator.maxvisitors')}</span>
                <RoomCreatorDropmenu
                    className="octane-room-creator-air__dropmenu--visitors"
                    label={LocalizeText('navigator.maxvisitors')}
                    options={visitorOptions}
                    value={safeVisitorsIndex}
                    onChange={setVisitorsIndex}
                />

                <span className="octane-room-creator-air__label octane-room-creator-air__label--trade">{LocalizeText('navigator.tradesettings')}</span>
                <RoomCreatorDropmenu
                    className="octane-room-creator-air__dropmenu--trade"
                    label={LocalizeText('navigator.tradesettings')}
                    options={AIR_TRADE_KEYS.map((key) => LocalizeText(key))}
                    value={tradeIndex}
                    onChange={setTradeIndex}
                />

                <BaseButton type="button" className="octane-room-creator-air__button octane-room-creator-air__button--create" onClick={createRoom}>
                    {LocalizeText('navigator.createroom.create')}
                </BaseButton>
                <BaseButton type="button" className="octane-room-creator-air__button octane-room-creator-air__button--cancel" onClick={closeCreator}>
                    {LocalizeText('generic.cancel')}
                </BaseButton>

                <span className="octane-room-creator-air__label octane-room-creator-air__label--layout">
                    {LocalizeText('navigator.createroom.chooselayoutcaption')}
                </span>
                <div className="octane-room-creator-air__layouts has-classic-scrollbar">
                    <div className="octane-room-creator-air__layout-rows">
                        {visibleModels.map((model) => {
                            const isSelected = selectedModelName === model.name;

                            return (
                                <ToggleButton
                                    key={model.name}
                                    type="button"
                                    className={`octane-room-creator-air__thumbnail${isSelected ? ' is-selected' : ''}`}
                                    pressed={isSelected}
                                    onClick={() => selectModel(model)}
                                >
                                    <span className="octane-room-creator-air__thumbnail-bg" aria-hidden="true" />
                                    <img className="octane-room-creator-air__thumbnail-pic" src={getRoomModelImage(model.name)} alt="" />
                                    <img
                                        className="octane-room-creator-air__thumbnail-tile-icon"
                                        src={isSelected ? tileIconWhite : tileIconBlack}
                                        alt=""
                                        width={18}
                                        height={10}
                                    />
                                    <span className="octane-room-creator-air__thumbnail-tiles">
                                        {model.tileSize} {tileSizeLabel}
                                    </span>
                                    {model.clubLevel > 0 && (
                                        <img className="octane-room-creator-air__thumbnail-club" src={vipIconSmall} alt="" width={19} height={10} />
                                    )}
                                </ToggleButton>
                            );
                        })}
                        {showVipPromo && (
                            <div className="octane-room-creator-air__vip-promo">
                                <img className="octane-room-creator-air__vip-promo-icon" src={vipIconBig} alt="" width={37} height={37} />
                                <span className="octane-room-creator-air__vip-promo-text">{LocalizeText('navigator.createroom.vippromo.text')}</span>
                                <BaseButton
                                    type="button"
                                    className="octane-room-creator-air__vip-promo-link"
                                    onClick={() => CreateLinkEvent('habboUI/open/hccenter')}
                                >
                                    {LocalizeText('navigator.createroom.vippromo.link')}
                                </BaseButton>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
