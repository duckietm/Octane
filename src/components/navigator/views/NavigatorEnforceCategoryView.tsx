import { FlatCreatedEvent, RoomSettingsDataEvent, ShowEnforceRoomCategoryDialogEvent, UpdateRoomCategoryAndTradeSettingsComposer } from '@octane/renderer';
import { FC, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent, useNavigatorData, useUserDataSnapshot, useUserPermissions } from '../../../hooks';
import { OctaneButton } from '../../../layout';

/** Selection types of RoomCategorySelectionEnforcement: after creating a room, after saving its settings. */
const SELECTION_ROOM_CREATED = 1;

const TRADE_OPTIONS = [
    { value: 0, key: 'navigator.roomsettings.trade_not_allowed', fallback: 'No trading' },
    { value: 1, key: 'navigator.roomsettings.trade_not_with_Controller', fallback: 'Only with rights' },
    { value: 2, key: 'navigator.roomsettings.trade_allowed', fallback: 'Trading allowed' }
];

/**
 * The server found no usable category for the room just created or saved (official EnforceCategoryCtrl):
 * the owner picks one, with a trade mode, before going on.
 */
export const NavigatorEnforceCategoryView: FC<{}> = () => {
    const [roomId, setRoomId] = useState(0);
    const [categoryId, setCategoryId] = useState(-1);
    const [tradeMode, setTradeMode] = useState(0);
    const lastCreatedRoomId = useRef(0);
    const lastSettingsRoomId = useRef(0);
    const { categories } = useNavigatorData();
    const { securityLevel } = useUserDataSnapshot();
    const permissions = useUserPermissions();
    // acc_navigator_staff; a server that sends no keys keeps Flash's staff level (4).
    const isNavigatorStaff = permissions.size ? permissions.get('acc_navigator_staff') === 1 : securityLevel >= 4;

    const selectableCategories = useMemo(
        () => (categories ?? []).filter((category) => category.visible && !category.automatic && (!category.staffOnly || isNavigatorStaff)),
        [categories, isNavigatorStaff]
    );

    useMessageEvent<FlatCreatedEvent>(FlatCreatedEvent, (event) => (lastCreatedRoomId.current = event.getParser().roomId));
    useMessageEvent<RoomSettingsDataEvent>(RoomSettingsDataEvent, (event) => (lastSettingsRoomId.current = event.getParser()?.data?.roomId ?? 0));

    useMessageEvent<ShowEnforceRoomCategoryDialogEvent>(ShowEnforceRoomCategoryDialogEvent, (event) => {
        const targetRoomId = event.getParser().selectionType === SELECTION_ROOM_CREATED ? lastCreatedRoomId.current : lastSettingsRoomId.current;

        if (!targetRoomId) return;

        setRoomId(targetRoomId);
        setCategoryId(selectableCategories[0]?.id ?? -1);
        setTradeMode(0);
    });

    if (!roomId) return null;

    const save = () => {
        if (categoryId < 0) return;

        SendMessageComposer(new UpdateRoomCategoryAndTradeSettingsComposer(roomId, categoryId, tradeMode));
        setRoomId(0);
    };

    return (
        <OctaneCardView className="min-w-0 w-[min(320px,calc(100vw-16px))] max-w-[calc(100vw-16px)]" uniqueKey="navigator-enforce-category">
            <OctaneCardHeaderView headerText={localizeWithFallback('navigator.enforcecategory.title', 'Choose a category')} onCloseClick={() => setRoomId(0)} />
            <OctaneCardContentView className="text-black" gap={2}>
                <p className="m-0 text-sm">
                    {localizeWithFallback('navigator.enforcecategory.info', 'Your room needs a category before others can find it. Pick one below.')}
                </p>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-bold">{localizeWithFallback('navigator.category', 'Category')}</span>
                    <select className="form-select form-select-sm" value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
                        {selectableCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {localizeWithFallback(category.name, category.name)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-bold">{localizeWithFallback('navigator.roomsettings.trade_settings', 'Trading')}</span>
                    <select className="form-select form-select-sm" value={tradeMode} onChange={(event) => setTradeMode(Number(event.target.value))}>
                        {TRADE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {localizeWithFallback(option.key, option.fallback)}
                            </option>
                        ))}
                    </select>
                </label>
                <OctaneButton disabled={categoryId < 0} onClick={save}>
                    {localizeWithFallback('generic.ok', 'OK')}
                </OctaneButton>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
