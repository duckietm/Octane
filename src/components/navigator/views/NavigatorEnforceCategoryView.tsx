import { RoomSessionEvent, ShowEnforceRoomCategoryDialogEvent, UpdateRoomCategoryAndTradeSettingsComposer } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent, useNavigatorData, useOctaneEvent, useUserDataSnapshot } from '../../../hooks';
import { buildEnforceCategoryUpdate, ENFORCE_CATEGORY_TRADE_KEYS, getEnforceableCategories } from '../../../hooks/navigator/navigatorEnforceCategory';
import { useNavigatorEnforceCategoryStore } from '../../../hooks/navigator/navigatorEnforceCategoryStore';

/**
 * Official EnforceCategoryCtrl (layout enforce_category, 310x240, no close
 * button): the server asks the room owner to pick a valid category and a
 * trade mode for the current room; OK sends
 * UpdateRoomCategoryAndTradeSettings(roomId, categoryId, tradeMode).
 */
export const NavigatorEnforceCategoryView: FC = () => {
    const isOpen = useNavigatorEnforceCategoryStore((state) => state.isOpen);
    const { categories, navigatorData } = useNavigatorData();
    const { securityLevel } = useUserDataSnapshot();
    const [categoryIndex, setCategoryIndex] = useState(0);
    const [tradeIndex, setTradeIndex] = useState(0);

    const selectableCategories = useMemo(() => getEnforceableCategories(categories, securityLevel), [categories, securityLevel]);
    const roomId = navigatorData?.currentRoomId ?? 0;

    useMessageEvent<ShowEnforceRoomCategoryDialogEvent>(ShowEnforceRoomCategoryDialogEvent, (event) => {
        const parser = event.getParser();

        setCategoryIndex(0);
        setTradeIndex(0);
        useNavigatorEnforceCategoryStore.getState().show(parser ? parser.selectionType : 0);
    });

    // The dialog belongs to the room it was raised for; leaving the room drops it.
    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => useNavigatorEnforceCategoryStore.getState().close());

    useEffect(() => {
        if (categoryIndex < selectableCategories.length) return;

        setCategoryIndex(0);
    }, [categoryIndex, selectableCategories.length]);

    if (!isOpen) return null;

    const onConfirm = () => {
        const update = buildEnforceCategoryUpdate(roomId, selectableCategories, categoryIndex, tradeIndex);

        if (!update) return;

        SendMessageComposer(new UpdateRoomCategoryAndTradeSettingsComposer(update.roomId, update.categoryId, update.tradeMode));
        useNavigatorEnforceCategoryStore.getState().close();
    };

    return (
        <OctaneCardView
            className="octane-navigator-enforce-category min-w-0 w-[min(310px,calc(100vw-16px))] max-w-[calc(100vw-16px)]"
            theme="primary"
            uniqueKey="navigator-enforce-category"
        >
            <OctaneCardHeaderView headerText={LocalizeText('enforce.category.title')} noCloseButton={true} onCloseClick={() => null} />
            <OctaneCardContentView className="octane-navigator-enforce-category__content">
                <div className="octane-navigator-enforce-category__body">{LocalizeText('enforce.category.body.text.multiline')}</div>
                <select
                    className="octane-navigator-enforce-category__select"
                    aria-label={localizeWithFallback('navigator.category', 'Category')}
                    value={categoryIndex}
                    onChange={(event) => setCategoryIndex(Number(event.target.value))}
                >
                    {selectableCategories.map((category, index) => (
                        <option key={category.id} value={index}>
                            {LocalizeText(category.name)}
                        </option>
                    ))}
                </select>
                <div className="octane-navigator-enforce-category__label">{LocalizeText('enforce.category.trade.setting')}</div>
                <select
                    className="octane-navigator-enforce-category__select"
                    aria-label={LocalizeText('enforce.category.trade.setting')}
                    value={tradeIndex}
                    onChange={(event) => setTradeIndex(Number(event.target.value))}
                >
                    {ENFORCE_CATEGORY_TRADE_KEYS.map((key, index) => (
                        <option key={key} value={index}>
                            {LocalizeText(key)}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className="octane-navigator-enforce-category__ok"
                    disabled={!selectableCategories.length || roomId <= 0}
                    onClick={onConfirm}
                >
                    {LocalizeText('enforce.category.ok')}
                </button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
