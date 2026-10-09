import { FC, useMemo, useState } from 'react';
import { FaSave, FaSlidersH, FaUndo } from 'react-icons/fa';
import {
    HK_ROOM_DESCRIPTION_MAX,
    HK_ROOM_MAX_USERS,
    HK_ROOM_MIN_USERS,
    HK_ROOM_NAME_MAX,
    HousekeepingErrorKey,
    IHousekeepingRoom,
    IHousekeepingRoomSettingsInput,
    LocalizeText,
    parseRoomTags,
    validateRoomSettings
} from '../../../../api';
import { useNavigatorData } from '../../../../hooks';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingField, HousekeepingSection } from '../common/HousekeepingParts';

interface HousekeepingRoomSettingsFormProps {
    room: IHousekeepingRoom;
    disabled: boolean;
    onSave: (input: IHousekeepingRoomSettingsInput) => void;
}

const draftFromRoom = (room: IHousekeepingRoom) => ({
    name: room.name,
    description: room.description,
    maxUsers: room.maxUsers,
    categoryId: room.settings?.categoryId ?? 0,
    tradeMode: room.settings?.tradeMode ?? 0,
    tags: (room.settings?.tags ?? []).join(', ')
});

/**
 * Editable name, description, capacity, category, trade mode and tags of the
 * selected room. The parent remounts it (by key) when the room changes, so the
 * draft always starts from what the server last sent.
 */
export const HousekeepingRoomSettingsForm: FC<HousekeepingRoomSettingsFormProps> = ({ room, disabled, onSave }) => {
    const initial = useMemo(() => draftFromRoom(room), [room]);
    const [draft, setDraft] = useState(initial);
    const { categories = null } = useNavigatorData();

    const input: IHousekeepingRoomSettingsInput = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        maxUsers: draft.maxUsers,
        categoryId: draft.categoryId,
        tradeMode: draft.tradeMode,
        tags: parseRoomTags(draft.tags)
    };
    const error = validateRoomSettings(input);
    const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
    const categoryKnown = !!categories?.some((category) => category.id === draft.categoryId);

    const update = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((previous) => ({ ...previous, [key]: value }));

    return (
        <HousekeepingSection icon={<FaSlidersH className="text-sky-600" size={9} />} title={LocalizeText('housekeeping.room.settings.title')} tone="info">
            <div className="grid grid-cols-2 gap-1.5">
                <HousekeepingField
                    className="col-span-2"
                    hint={`${draft.name.length}/${HK_ROOM_NAME_MAX}`}
                    label={LocalizeText('housekeeping.room.settings.name')}
                >
                    <input
                        className={HOUSEKEEPING_INPUT_CLASS}
                        maxLength={HK_ROOM_NAME_MAX}
                        value={draft.name}
                        onChange={(event) => update('name', event.target.value)}
                    />
                </HousekeepingField>
                <HousekeepingField
                    className="col-span-2"
                    hint={`${draft.description.length}/${HK_ROOM_DESCRIPTION_MAX}`}
                    label={LocalizeText('housekeeping.room.settings.description')}
                >
                    <textarea
                        className={`${HOUSEKEEPING_INPUT_CLASS} min-h-[40px] resize-y`}
                        maxLength={HK_ROOM_DESCRIPTION_MAX}
                        value={draft.description}
                        onChange={(event) => update('description', event.target.value)}
                    />
                </HousekeepingField>
                <HousekeepingField label={LocalizeText('navigator.category')}>
                    <select
                        className={HOUSEKEEPING_INPUT_CLASS}
                        value={draft.categoryId}
                        onChange={(event) => update('categoryId', parseInt(event.target.value) || 0)}
                    >
                        {!categoryKnown && (
                            <option value={draft.categoryId}>
                                {LocalizeText('housekeeping.room.settings.category_unknown', ['id'], [String(draft.categoryId)])}
                            </option>
                        )}
                        {(categories ?? []).map((category) => (
                            <option key={category.id} value={category.id}>
                                {LocalizeText(category.name)}
                            </option>
                        ))}
                    </select>
                </HousekeepingField>
                <HousekeepingField hint={`${HK_ROOM_MIN_USERS}-${HK_ROOM_MAX_USERS}`} label={LocalizeText('navigator.maxvisitors')}>
                    <input
                        className={`${HOUSEKEEPING_INPUT_CLASS} tabular-nums`}
                        max={HK_ROOM_MAX_USERS}
                        min={HK_ROOM_MIN_USERS}
                        type="number"
                        value={draft.maxUsers || ''}
                        onChange={(event) => update('maxUsers', parseInt(event.target.value) || 0)}
                    />
                </HousekeepingField>
                <HousekeepingField label={LocalizeText('navigator.tradesettings')}>
                    <select
                        className={HOUSEKEEPING_INPUT_CLASS}
                        value={draft.tradeMode}
                        onChange={(event) => update('tradeMode', parseInt(event.target.value) || 0)}
                    >
                        <option value={0}>{LocalizeText('navigator.roomsettings.trade_not_allowed')}</option>
                        <option value={1}>{LocalizeText('navigator.roomsettings.trade_not_with_Controller')}</option>
                        <option value={2}>{LocalizeText('navigator.roomsettings.trade_allowed')}</option>
                    </select>
                </HousekeepingField>
                <HousekeepingField hint={LocalizeText('housekeeping.room.settings.tags_hint')} label={LocalizeText('housekeeping.room.settings.tags')}>
                    <input className={HOUSEKEEPING_INPUT_CLASS} value={draft.tags} onChange={(event) => update('tags', event.target.value)} />
                </HousekeepingField>
            </div>
            <div className="flex items-center gap-1.5">
                {error !== HousekeepingErrorKey.NONE && isDirty && (
                    <span className="text-[10px] font-semibold text-rose-600">{LocalizeText(`housekeeping.validation.${error}`)}</span>
                )}
                <HousekeepingButton classNames={['ml-auto']} disabled={disabled || !isDirty} gap={1} variant="secondary" onClick={() => setDraft(initial)}>
                    <FaUndo size={9} />
                    <span>{LocalizeText('housekeeping.room.settings.reset')}</span>
                </HousekeepingButton>
                <HousekeepingButton
                    disabled={disabled || !isDirty || error !== HousekeepingErrorKey.NONE}
                    gap={1}
                    variant="success"
                    onClick={() => onSave(input)}
                >
                    <FaSave size={9} />
                    <span>{LocalizeText('housekeeping.room.settings.save')}</span>
                </HousekeepingButton>
            </div>
        </HousekeepingSection>
    );
};
