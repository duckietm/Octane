import { FC, useEffect, useMemo, useState } from 'react';
import {
    GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM,
    GLOBAL_PLACEHOLDER_FROM_VALUE,
    GLOBAL_PLACEHOLDER_NAME_MAX_LENGTH,
    GLOBAL_PLACEHOLDER_VALUE_MAX_LENGTH,
    IGlobalPlaceholderForm,
    isGlobalPlaceholderValid,
    LocalizeText,
    localizeWithFallback,
    normalizeGlobalPlaceholderName,
    normalizeGlobalPlaceholderValue,
    parseGlobalPlaceholder,
    selectGlobalPlaceholderSource,
    serializeGlobalPlaceholder,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredPlaceholderPreview } from './WiredPlaceholderPreview';
import { Radio } from '../../../../common/Radio';

const EMPTY_FORM: IGlobalPlaceholderForm = { name: '', mode: GLOBAL_PLACEHOLDER_FROM_VALUE, value: '', roomId: 0, placeholderName: '', rooms: [] };

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const WiredExtraGlobalPlaceholderView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [form, setForm] = useState<IGlobalPlaceholderForm>(EMPTY_FORM);

    useEffect(() => {
        setForm(trigger ? parseGlobalPlaceholder(trigger.intData, trigger.stringData) : EMPTY_FORM);
    }, [trigger]);

    const selectedRoom = useMemo(() => form.rooms.find((room) => room.roomId === form.roomId) ?? null, [form.rooms, form.roomId]);
    const anotherRoomDisabled = !form.rooms.length && form.mode !== GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM;

    const previewToken = `$(${normalizeGlobalPlaceholderName(form.name) || 'placeholder'})`;
    const previewHtml = useMemo(() => LocalizeText('wiredfurni.params.texts.placeholder_preview', ['placeholder'], [escapeHtml(previewToken)]), [previewToken]);

    const save = () => {
        const { intParams, stringParam } = serializeGlobalPlaceholder(form);

        setIntParams(intParams);
        setStringParam(stringParam);
    };

    const selectRoom = (roomId: number) => setForm((current) => ({ ...current, roomId, placeholderName: '' }));

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => isGlobalPlaceholderValid(form)}
            cardStyle={{ width: 400 }}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.texts.placeholder_name')}</Text>
                    <OctaneInput
                        maxLength={GLOBAL_PLACEHOLDER_NAME_MAX_LENGTH}
                        type="text"
                        value={form.name}
                        onChange={(event) => {
                            const name = normalizeGlobalPlaceholderName(event.target.value);

                            setForm((current) => ({ ...current, name }));
                        }}
                    />
                </div>
                <WiredPlaceholderPreview previewHtml={previewHtml} previewToken={previewToken} />
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.choose_type', 'Choose type')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={form.mode === GLOBAL_PLACEHOLDER_FROM_VALUE} name="wiredGlobalPlaceholderMode" onCheckedChange={() => setForm((current) => ({ ...current, mode: GLOBAL_PLACEHOLDER_FROM_VALUE }))} />
                        <Text>{localizeWithFallback('wiredfurni.params.from_value', 'From a value')}</Text>
                    </label>
                    {form.mode === GLOBAL_PLACEHOLDER_FROM_VALUE && (
                        <OctaneInput
                            maxLength={GLOBAL_PLACEHOLDER_VALUE_MAX_LENGTH}
                            type="text"
                            value={form.value}
                            onChange={(event) => {
                                const value = normalizeGlobalPlaceholderValue(event.target.value);

                                setForm((current) => ({ ...current, value }));
                            }}
                        />
                    )}
                    <label className={`flex items-center gap-1 ${anotherRoomDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                        <Radio checked={form.mode === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM} disabled={anotherRoomDisabled} name="wiredGlobalPlaceholderMode" onCheckedChange={() => setForm((current) => ({
                                    ...current,
                                    mode: GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM,
                                    roomId: current.roomId || current.rooms[0]?.roomId || 0
                                }))} />
                        <Text>{localizeWithFallback('wiredfurni.params.from_another_room', 'From another room')}</Text>
                    </label>
                    {anotherRoomDisabled && (
                        <Text small>{localizeWithFallback('wiredfurni.params.global_placeholder.no_shared', 'None of your other rooms has a global placeholder with a typed value.')}</Text>
                    )}
                    {form.mode === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM && (
                        <div className="flex flex-col gap-1">
                            <Text>{localizeWithFallback('wiredfurni.params.room_selection', 'Room')}</Text>
                            <select className="form-select form-select-sm" value={form.roomId} onChange={(event) => selectRoom(parseInt(event.target.value, 10) || 0)}>
                                <option value={0}>{localizeWithFallback('wiredfurni.params.room_selection.tooltip', 'Pick a room')}</option>
                                {form.rooms.map((room) => (
                                    <option key={room.roomId} value={room.roomId}>
                                        {room.roomName}
                                    </option>
                                ))}
                            </select>
                            <Text>{localizeWithFallback('wiredfurni.params.placeholder_selection', 'Placeholder')}</Text>
                            <select
                                className="form-select form-select-sm"
                                value={form.placeholderName}
                                onChange={(event) => {
                                    const placeholderName = event.target.value;

                                    setForm((current) => selectGlobalPlaceholderSource(current, placeholderName));
                                }}
                            >
                                <option value="">{localizeWithFallback('wiredfurni.params.placeholder_selection.tooltip', 'Pick a placeholder')}</option>
                                {(selectedRoom?.placeholders ?? []).map((name) => (
                                    <option key={name} value={name}>
                                        {`$(${name})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <Text small>{localizeWithFallback('wiredfurni.params.global_placeholder.info', 'Every wired text in this room can use this placeholder, not only this stack.')}</Text>
            </div>
        </WiredExtraBaseView>
    );
};
