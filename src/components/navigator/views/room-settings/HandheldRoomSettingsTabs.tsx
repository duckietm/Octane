import { BannedUserData, RoomChatSettings, RoomDataParser, RoomModerationSettings } from '@octane/renderer';
import { FC, useState } from 'react';
import { IRoomData, LocalizeText, localizeWithFallback, RoomSettingsFieldError, RoomSettingsSaveErrorResult } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NumberInput } from '../../../../common/NumberInput';
import { Select } from '../../../../common/Select';
import {
    HandheldRsCheckRow,
    HandheldRsConfirm,
    HandheldRsEmpty,
    HandheldRsError,
    HandheldRsField,
    HandheldRsPersonCard,
    HandheldRsRadioRow,
    HandheldRsSection
} from './HandheldRoomSettingsParts';

/*
 * The five tabs of the room settings on a phone. Each desktop tab view keeps its hooks, local fields, rules and packets
 * and, on a phone, hands them to its twin here: the twins only lay the same fields out as 44 px rows, 16 px fields and
 * cards (HandheldRoomSettings.css).
 */

type Errors = RoomSettingsSaveErrorResult['errors'];

const fieldError = (error?: RoomSettingsFieldError): string | null =>
    error ? (error.key ? localizeWithFallback(error.key, error.fallback) : error.fallback) : null;

/** The delete question of the basic tab, built by the desktop view (same text, same packet). */
export interface RoomDeleteConfirm {
    title: string;
    message: string;
    onConfirm: () => void;
}

export interface HandheldRoomSettingsBasicViewProps {
    roomData: IRoomData;
    errors: Errors;
    handleChange: (field: string, value: string | number | boolean | string[]) => void;
    categories: { id: number; name: string }[];
    maxVisitors: number[];
    roomName: string;
    roomDescription: string;
    roomTag1: string;
    roomTag2: string;
    nameMaxLength: number;
    descriptionMaxLength: number;
    nameTooShort: boolean;
    tag1TooLong: boolean;
    tag2TooLong: boolean;
    youtubeEnabled: boolean;
    soundboardMode: number;
    onRoomName: (value: string) => void;
    onRoomDescription: (value: string) => void;
    onRoomTag1: (value: string) => void;
    onRoomTag2: (value: string) => void;
    saveRoomName: (value: string) => void;
    saveRoomDescription: (value: string) => void;
    saveTags: (index: number) => void;
    toggleYouTube: (enabled: boolean) => void;
    setSoundboardMode: (mode: number) => void;
    getDeleteConfirm: () => RoomDeleteConfirm;
}

export const HandheldRoomSettingsBasicView: FC<HandheldRoomSettingsBasicViewProps> = (props) => {
    const { roomData, errors, handleChange, categories, maxVisitors, nameTooShort, tag1TooLong, tag2TooLong } = props;
    const [confirm, setConfirm] = useState<RoomDeleteConfirm>(null);
    const tooMany = LocalizeText('navigator.roomsettings.toomanycharacters');

    return (
        <>
            <HandheldRsSection>
                <HandheldRsField htmlFor="octane-rs-name" label={LocalizeText('navigator.roomname')}>
                    <input
                        className="octane-handheld-rs__input"
                        enterKeyHint="done"
                        id="octane-rs-name"
                        maxLength={props.nameMaxLength}
                        value={props.roomName}
                        onBlur={(event) => props.saveRoomName(event.currentTarget.value)}
                        onChange={(event) => props.onRoomName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') props.saveRoomName(event.currentTarget.value);
                        }}
                    />
                    <HandheldRsError>
                        {fieldError(errors.name) ?? (nameTooShort ? LocalizeText('navigator.roomsettings.roomnameismandatory') : null)}
                    </HandheldRsError>
                </HandheldRsField>
                <HandheldRsField htmlFor="octane-rs-desc" label={LocalizeText('navigator.roomsettings.desc')}>
                    <textarea
                        className="octane-handheld-rs__input is-area"
                        id="octane-rs-desc"
                        maxLength={props.descriptionMaxLength}
                        value={props.roomDescription}
                        onBlur={(event) => props.saveRoomDescription(event.currentTarget.value)}
                        onChange={(event) => props.onRoomDescription(event.target.value)}
                    />
                    <span className="octane-handheld-rs__counter">{`${props.roomDescription.length} / ${props.descriptionMaxLength}`}</span>
                    <HandheldRsError>{fieldError(errors.description)}</HandheldRsError>
                </HandheldRsField>
                <HandheldRsField label={LocalizeText('navigator.category')}>
                    <Select
                        aria-label={LocalizeText('navigator.category')}
                        className="octane-handheld-rs__select"
                        value={roomData.categoryId}
                        onChange={(event) => handleChange('category', event.target.value)}
                    >
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {LocalizeText(category.name)}
                            </option>
                        ))}
                    </Select>
                </HandheldRsField>
                <div className="octane-handheld-rs__pair">
                    <HandheldRsField label={LocalizeText('navigator.maxvisitors')}>
                        <Select
                            aria-label={LocalizeText('navigator.maxvisitors')}
                            className="octane-handheld-rs__select"
                            value={roomData.userCount}
                            onChange={(event) => handleChange('max_visitors', event.target.value)}
                        >
                            {maxVisitors.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </Select>
                    </HandheldRsField>
                    <HandheldRsField label={LocalizeText('navigator.tradesettings')}>
                        <Select
                            aria-label={LocalizeText('navigator.tradesettings')}
                            className="octane-handheld-rs__select"
                            value={roomData.tradeState}
                            onChange={(event) => handleChange('trade_state', event.target.value)}
                        >
                            <option value="0">{LocalizeText('navigator.roomsettings.trade_not_allowed')}</option>
                            <option value="1">{LocalizeText('navigator.roomsettings.trade_not_with_Controller')}</option>
                            <option value="2">{LocalizeText('navigator.roomsettings.trade_allowed')}</option>
                        </Select>
                    </HandheldRsField>
                </div>
                <HandheldRsField label={LocalizeText('navigator.tags')}>
                    <div className="octane-handheld-rs__pair is-tight">
                        <div className="octane-handheld-rs__stack">
                            <input
                                aria-label={`${LocalizeText('navigator.tags')} 1`}
                                className="octane-handheld-rs__input"
                                enterKeyHint="next"
                                value={props.roomTag1}
                                onBlur={() => props.saveTags(0)}
                                onChange={(event) => props.onRoomTag1(event.target.value)}
                            />
                            <HandheldRsError>{fieldError(errors.tag1) ?? (tag1TooLong ? tooMany : null)}</HandheldRsError>
                        </div>
                        <div className="octane-handheld-rs__stack">
                            <input
                                aria-label={`${LocalizeText('navigator.tags')} 2`}
                                className="octane-handheld-rs__input"
                                enterKeyHint="done"
                                value={props.roomTag2}
                                onBlur={() => props.saveTags(1)}
                                onChange={(event) => props.onRoomTag2(event.target.value)}
                            />
                            <HandheldRsError>{fieldError(errors.tag2) ?? (tag2TooLong ? tooMany : null)}</HandheldRsError>
                        </div>
                    </div>
                </HandheldRsField>
            </HandheldRsSection>
            <HandheldRsSection>
                <HandheldRsCheckRow
                    checked={roomData.allowWalkthrough}
                    label={LocalizeText('navigator.roomsettings.allow_walk_through')}
                    onChange={(checked) => handleChange('allow_walkthrough', checked)}
                />
                <HandheldRsCheckRow
                    checked={roomData.allowUnderpass}
                    label={LocalizeText('navigator.roomsettings.allow_underpass')}
                    onChange={(checked) => handleChange('allow_underpass', checked)}
                />
                <HandheldRsCheckRow checked={props.youtubeEnabled} label={LocalizeText('widget.room.youtube.shared')} onChange={props.toggleYouTube} />
            </HandheldRsSection>
            <HandheldRsSection>
                <HandheldRsField label={LocalizeText('soundboard.room.allow')}>
                    <Select
                        aria-label={LocalizeText('soundboard.room.allow')}
                        className="octane-handheld-rs__select"
                        value={props.soundboardMode}
                        onChange={(event) => props.setSoundboardMode(Number(event.target.value))}
                    >
                        <option value="0">{LocalizeText('soundboard.room.mode.off')}</option>
                        <option value="1">{LocalizeText('soundboard.room.mode.everyone')}</option>
                        <option value="2">{LocalizeText('soundboard.room.mode.rights')}</option>
                    </Select>
                </HandheldRsField>
            </HandheldRsSection>
            <BaseButton className="octane-handheld-rs__delete" onClick={() => setConfirm(props.getDeleteConfirm())}>
                <svg aria-hidden="true" viewBox="0 0 16 16">
                    <path d="M3 4.5 H13 M6.5 4.5 V3 H9.5 V4.5 M4.5 4.5 L5.2 13 H10.8 L11.5 4.5 M7 7 V11 M9 7 V11" />
                </svg>
                {LocalizeText('navigator.roomsettings.delete')}
            </BaseButton>
            {confirm && (
                <HandheldRsConfirm
                    confirmLabel={localizeWithFallback('octane.handheld.room_settings.delete.confirm', 'Delete')}
                    message={confirm.message}
                    title={confirm.title}
                    onCancel={() => setConfirm(null)}
                    onConfirm={() => {
                        setConfirm(null);
                        confirm.onConfirm();
                    }}
                />
            )}
        </>
    );
};

export interface HandheldRoomSettingsAccessViewProps {
    roomData: IRoomData;
    errors: Errors;
    handleChange: (field: string, value: string | number | boolean) => void;
    lockedByBuildersClub: boolean;
    password: string;
    confirmPassword: string;
    isTryingPassword: boolean;
    onPassword: (value: string) => void;
    onConfirmPassword: (value: string) => void;
    onTryPassword: () => void;
    saveRoomPassword: () => void;
    onBuildersClubInfo: () => void;
}

export const HandheldRoomSettingsAccessView: FC<HandheldRoomSettingsAccessViewProps> = (props) => {
    const { roomData, errors, handleChange, password, confirmPassword, isTryingPassword } = props;
    const passwordOpen = isTryingPassword || roomData.lockState === RoomDataParser.PASSWORD_STATE;
    const doorRow = (state: number, key: string) => (
        <HandheldRsRadioRow
            checked={roomData.lockState === state && !isTryingPassword}
            label={LocalizeText(key)}
            name="lockState"
            onSelect={() => handleChange('lock_state', state)}
        />
    );
    const passwordReady = isTryingPassword && password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

    return (
        <>
            <p className="octane-handheld-rs__intro">
                <strong>{LocalizeText('navigator.roomsettings.roomaccess.caption')}</strong>
                <span>{LocalizeText('navigator.roomsettings.roomaccess.info')}</span>
            </p>
            {props.lockedByBuildersClub ? (
                <HandheldRsSection
                    hint={LocalizeText('notification.builders_club.room_locked.message')}
                    title={LocalizeText('notification.builders_club.room_locked.title')}
                >
                    <BaseButton className="octane-handheld-rs__row-button" onClick={props.onBuildersClubInfo}>
                        {LocalizeText('notification.builders_club.room_locked.linkTitle')}
                    </BaseButton>
                </HandheldRsSection>
            ) : (
                <HandheldRsSection title={LocalizeText('navigator.roomsettings.doormode')}>
                    {doorRow(RoomDataParser.OPEN_STATE, 'navigator.roomsettings.doormode.open')}
                    {doorRow(RoomDataParser.DOORBELL_STATE, 'navigator.roomsettings.doormode.doorbell')}
                    {doorRow(RoomDataParser.INVISIBLE_STATE, 'navigator.roomsettings.doormode.invisible')}
                    <HandheldRsRadioRow
                        checked={passwordOpen}
                        label={LocalizeText('navigator.roomsettings.doormode.password')}
                        name="lockState"
                        onSelect={props.onTryPassword}
                    >
                        {passwordOpen && (
                            <div className="octane-handheld-rs__password">
                                <input
                                    aria-label={LocalizeText('navigator.roomsettings.password')}
                                    autoComplete="new-password"
                                    className="octane-handheld-rs__input"
                                    placeholder={LocalizeText('navigator.roomsettings.password')}
                                    type="password"
                                    value={password}
                                    onChange={(event) => props.onPassword(event.target.value)}
                                    onFocus={props.onTryPassword}
                                />
                                <HandheldRsError>
                                    {fieldError(errors.password) ??
                                        (isTryingPassword && password.length <= 0 ? LocalizeText('navigator.roomsettings.passwordismandatory') : null)}
                                </HandheldRsError>
                                <input
                                    aria-label={LocalizeText('navigator.roomsettings.passwordconfirm')}
                                    autoComplete="new-password"
                                    className="octane-handheld-rs__input"
                                    placeholder={LocalizeText('navigator.roomsettings.passwordconfirm')}
                                    type="password"
                                    value={confirmPassword}
                                    onBlur={props.saveRoomPassword}
                                    onChange={(event) => props.onConfirmPassword(event.target.value)}
                                />
                                <HandheldRsError>
                                    {isTryingPassword && password.length > 0 && password !== confirmPassword
                                        ? LocalizeText('navigator.roomsettings.invalidconfirm')
                                        : null}
                                </HandheldRsError>
                                {isTryingPassword && (
                                    <BaseButton className="octane-handheld-rs__button is-primary" disabled={!passwordReady} onClick={props.saveRoomPassword}>
                                        {localizeWithFallback('octane.handheld.room_settings.password.set', 'Lock with this password')}
                                    </BaseButton>
                                )}
                            </div>
                        )}
                    </HandheldRsRadioRow>
                </HandheldRsSection>
            )}
            <HandheldRsSection title={LocalizeText('navigator.roomsettings.pets')}>
                <HandheldRsCheckRow
                    checked={roomData.muteAllPets}
                    label={LocalizeText('navigator.roomsettings.mute_all_pets')}
                    onChange={(checked) => handleChange('mute_all_pets', checked)}
                />
                <HandheldRsCheckRow
                    checked={roomData.allowPets}
                    label={LocalizeText('navigator.roomsettings.allowpets')}
                    onChange={(checked) => handleChange('allow_pets', checked)}
                />
                <HandheldRsCheckRow
                    checked={roomData.allowPetsEat}
                    label={LocalizeText('navigator.roomsettings.allowfoodconsume')}
                    onChange={(checked) => handleChange('allow_pets_eat', checked)}
                />
            </HandheldRsSection>
        </>
    );
};

export interface HandheldRoomSettingsRightsViewProps {
    usersWithRights: [number, string][];
    friendsWithoutRights: { id: number; name: string }[];
    friendsTotal: number;
    onTakeRights: (userId: number) => void;
    onGiveRights: (userId: number) => void;
    onClearRights: () => void;
}

export const HandheldRoomSettingsRightsView: FC<HandheldRoomSettingsRightsViewProps> = (props) => {
    const { usersWithRights, friendsWithoutRights, friendsTotal } = props;
    const count = usersWithRights.length.toString();

    return (
        <div className="octane-handheld-rs__columns">
            <HandheldRsSection className="is-list" title={LocalizeText('navigator.flatctrls.userswithrights', ['displayed', 'total'], [count, count])}>
                {usersWithRights.length === 0 && (
                    <HandheldRsEmpty>{localizeWithFallback('octane.handheld.room_settings.rights.empty', 'Nobody has rights in this room.')}</HandheldRsEmpty>
                )}
                {usersWithRights.map(([id, name]) => (
                    <HandheldRsPersonCard
                        key={id}
                        action={localizeWithFallback('octane.handheld.room_settings.rights.take', 'Remove')}
                        name={name}
                        userId={id}
                        onAction={() => props.onTakeRights(id)}
                    />
                ))}
                {usersWithRights.length > 0 && (
                    <BaseButton className="octane-handheld-rs__row-button is-danger" onClick={props.onClearRights}>
                        {LocalizeText('navigator.flatctrls.clear')}
                    </BaseButton>
                )}
            </HandheldRsSection>
            <HandheldRsSection
                className="is-list"
                title={LocalizeText('navigator.flatctrls.friends', ['displayed', 'total'], [friendsWithoutRights.length.toString(), friendsTotal.toString()])}
            >
                {friendsWithoutRights.length === 0 && (
                    <HandheldRsEmpty>
                        {localizeWithFallback('octane.handheld.room_settings.rights.no_friends', 'No friends left to give rights to.')}
                    </HandheldRsEmpty>
                )}
                {friendsWithoutRights.map((friend) => (
                    <HandheldRsPersonCard
                        key={friend.id}
                        action={localizeWithFallback('octane.handheld.room_settings.rights.give', 'Give rights')}
                        name={friend.name}
                        tone="add"
                        userId={friend.id}
                        onAction={() => props.onGiveRights(friend.id)}
                    />
                ))}
            </HandheldRsSection>
        </div>
    );
};

export interface HandheldRoomSettingsVipChatViewProps {
    roomData: IRoomData;
    errors: Errors;
    handleChange: (field: string, value: string | number | boolean) => void;
    isHC: boolean;
    chatDistance: number;
    idleSleepTimeoutSeconds: string;
    idleAutokickTimeoutSeconds: string;
    minimumAutokickTimeoutSeconds: number;
    onChatDistance: (value: number) => void;
    commitChatDistance: () => void;
    onIdleSleep: (value: string) => void;
    commitIdleSleep: (value: string) => void;
    onIdleAutokick: (value: string) => void;
    commitIdleAutokick: (value: string) => void;
}

const SelectField: FC<{
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (value: string) => void;
    options: [number | string, string][];
}> = ({ label, value, disabled = false, onChange, options }) => (
    <HandheldRsField label={label}>
        <Select aria-label={label} className="octane-handheld-rs__select" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
            {options.map(([optionValue, key]) => (
                <option key={String(optionValue)} value={optionValue}>
                    {LocalizeText(key)}
                </option>
            ))}
        </Select>
    </HandheldRsField>
);

export const HandheldRoomSettingsVipChatView: FC<HandheldRoomSettingsVipChatViewProps> = (props) => {
    const { roomData, errors, handleChange, isHC } = props;
    const seconds = LocalizeText('navigator.roomsettings.timeout.seconds');

    return (
        <>
            <p className="octane-handheld-rs__intro">
                <strong>{LocalizeText('navigator.roomsettings.vip.caption')}</strong>
                <span>{LocalizeText('navigator.roomsettings.vip.info')}</span>
            </p>
            <div className="octane-handheld-rs__columns">
                <HandheldRsSection
                    hint={LocalizeText('navigator.roomsettings.chat_settings.info')}
                    title={LocalizeText('navigator.roomsettings.chat_settings')}
                >
                    <SelectField
                        label={localizeWithFallback('octane.handheld.room_settings.chat.mode', 'Chat mode')}
                        options={[
                            [RoomChatSettings.CHAT_MODE_FREE_FLOW, 'navigator.roomsettings.chat.mode.free.flow'],
                            [RoomChatSettings.CHAT_MODE_LINE_BY_LINE, 'navigator.roomsettings.chat.mode.line.by.line']
                        ]}
                        value={roomData.chatSettings.mode}
                        onChange={(value) => handleChange('bubble_mode', value)}
                    />
                    <SelectField
                        label={localizeWithFallback('octane.handheld.room_settings.chat.width', 'Bubble width')}
                        options={[
                            [RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL, 'navigator.roomsettings.chat.bubbles.width.normal'],
                            [RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN, 'navigator.roomsettings.chat.bubbles.width.thin'],
                            [RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE, 'navigator.roomsettings.chat.bubbles.width.wide']
                        ]}
                        value={roomData.chatSettings.weight}
                        onChange={(value) => handleChange('chat_weight', value)}
                    />
                    <SelectField
                        label={localizeWithFallback('octane.handheld.room_settings.chat.speed', 'Scroll speed')}
                        options={[
                            [RoomChatSettings.CHAT_SCROLL_SPEED_FAST, 'navigator.roomsettings.chat.speed.fast'],
                            [RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL, 'navigator.roomsettings.chat.speed.normal'],
                            [RoomChatSettings.CHAT_SCROLL_SPEED_SLOW, 'navigator.roomsettings.chat.speed.slow']
                        ]}
                        value={roomData.chatSettings.speed}
                        onChange={(value) => handleChange('bubble_speed', value)}
                    />
                    <SelectField
                        label={localizeWithFallback('navigator.roomsettings.chat.flood_sensitivity', 'Flood sensitivity')}
                        options={[
                            [RoomChatSettings.FLOOD_FILTER_LOOSE, 'navigator.roomsettings.chat.flood.loose'],
                            [RoomChatSettings.FLOOD_FILTER_NORMAL, 'navigator.roomsettings.chat.flood.normal'],
                            [RoomChatSettings.FLOOD_FILTER_STRICT, 'navigator.roomsettings.chat.flood.strict']
                        ]}
                        value={roomData.chatSettings.protection}
                        onChange={(value) => handleChange('flood_protection', value)}
                    />
                    <HandheldRsField label={LocalizeText('navigator.roomsettings.chat_settings.hearing.distance')}>
                        <NumberInput
                            aria-label={LocalizeText('navigator.roomsettings.chat_settings.hearing.distance')}
                            className="octane-handheld-rs__input is-number"
                            inputMode="numeric"
                            min={0}
                            steppers={false}
                            value={props.chatDistance}
                            onBlur={props.commitChatDistance}
                            onChange={(event) => props.onChatDistance(event.target.valueAsNumber)}
                        />
                    </HandheldRsField>
                </HandheldRsSection>
                <div className="octane-handheld-rs__stack is-sections">
                    <HandheldRsSection
                        hint={isHC ? null : localizeWithFallback('octane.handheld.room_settings.vip.locked', 'Only for HC members.')}
                        title={LocalizeText('navigator.roomsettings.vip_settings')}
                    >
                        <HandheldRsCheckRow
                            checked={roomData.hideWalls}
                            disabled={!isHC}
                            label={LocalizeText('navigator.roomsettings.hide_walls')}
                            onChange={(checked) => handleChange('hide_walls', checked)}
                        />
                        <SelectField
                            disabled={!isHC}
                            label={localizeWithFallback('octane.handheld.room_settings.vip.walls', 'Wall thickness')}
                            options={[
                                ['0', 'navigator.roomsettings.wall_thickness.normal'],
                                ['1', 'navigator.roomsettings.wall_thickness.thick'],
                                ['-1', 'navigator.roomsettings.wall_thickness.thin'],
                                ['-2', 'navigator.roomsettings.wall_thickness.thinnest']
                            ]}
                            value={roomData.wallThickness}
                            onChange={(value) => handleChange('wall_thickness', value)}
                        />
                        <SelectField
                            disabled={!isHC}
                            label={localizeWithFallback('octane.handheld.room_settings.vip.floor', 'Floor thickness')}
                            options={[
                                ['0', 'navigator.roomsettings.floor_thickness.normal'],
                                ['1', 'navigator.roomsettings.floor_thickness.thick'],
                                ['-1', 'navigator.roomsettings.floor_thickness.thin'],
                                ['-2', 'navigator.roomsettings.floor_thickness.thinnest']
                            ]}
                            value={roomData.floorThickness}
                            onChange={(value) => handleChange('floor_thickness', value)}
                        />
                    </HandheldRsSection>
                    <HandheldRsSection title={LocalizeText('navigator.roomsettings.room_behavior')}>
                        <HandheldRsCheckRow
                            checked={!roomData.leaveOnDoorTileEnabled}
                            label={LocalizeText('navigator.roomsettings.do_not_leave_on_door_tile')}
                            onChange={(checked) => handleChange('leave_on_door_tile_enabled', !checked)}
                        />
                        <HandheldRsCheckRow
                            checked={roomData.idleSleepEnabled}
                            label={LocalizeText('navigator.roomsettings.idle_sleep')}
                            onChange={(checked) => handleChange('idle_sleep_enabled', checked)}
                        >
                            <span className="octane-handheld-rs__seconds">
                                <NumberInput
                                    allowOutOfRange
                                    aria-label={`${LocalizeText('navigator.roomsettings.idle_sleep')} (${seconds})`}
                                    className="octane-handheld-rs__input is-number"
                                    disabled={!roomData.idleSleepEnabled}
                                    inputMode="numeric"
                                    max={3600}
                                    min={30}
                                    steppers={false}
                                    value={props.idleSleepTimeoutSeconds}
                                    onBlur={(event) => props.commitIdleSleep(event.currentTarget.value)}
                                    onChange={(event) => props.onIdleSleep(event.target.value)}
                                />
                                <span>{seconds}</span>
                            </span>
                        </HandheldRsCheckRow>
                        <HandheldRsError>{fieldError(errors.idle_sleep)}</HandheldRsError>
                        <HandheldRsCheckRow
                            checked={roomData.idleAutokickEnabled}
                            label={LocalizeText('navigator.roomsettings.idle_autokick')}
                            onChange={(checked) => handleChange('idle_autokick_enabled', checked)}
                        >
                            <span className="octane-handheld-rs__seconds">
                                <NumberInput
                                    allowOutOfRange
                                    aria-label={`${LocalizeText('navigator.roomsettings.idle_autokick')} (${seconds})`}
                                    className="octane-handheld-rs__input is-number"
                                    disabled={!roomData.idleAutokickEnabled}
                                    inputMode="numeric"
                                    max={36000}
                                    min={props.minimumAutokickTimeoutSeconds}
                                    steppers={false}
                                    value={props.idleAutokickTimeoutSeconds}
                                    onBlur={(event) => props.commitIdleAutokick(event.currentTarget.value)}
                                    onChange={(event) => props.onIdleAutokick(event.target.value)}
                                />
                                <span>{seconds}</span>
                            </span>
                        </HandheldRsCheckRow>
                        <HandheldRsError>{fieldError(errors.idle_autokick)}</HandheldRsError>
                    </HandheldRsSection>
                </div>
            </div>
        </>
    );
};

export interface HandheldRoomSettingsModViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
    bannedUsers: BannedUserData[];
    onUnban: (userId: number) => void;
}

export const HandheldRoomSettingsModView: FC<HandheldRoomSettingsModViewProps> = ({ roomData, handleChange, bannedUsers, onUnban }) => {
    const none: [number, string] = [RoomModerationSettings.MODERATION_LEVEL_NONE, 'navigator.roomsettings.moderation.none'];
    const rights: [number, string] = [RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, 'navigator.roomsettings.moderation.rights'];
    const all: [number, string] = [RoomModerationSettings.MODERATION_LEVEL_ALL, 'navigator.roomsettings.moderation.all'];

    return (
        <div className="octane-handheld-rs__columns">
            <HandheldRsSection title={LocalizeText('navigator.roomsettings.moderation')}>
                <SelectField
                    label={LocalizeText('navigator.roomsettings.moderation.mute.header')}
                    options={[none, rights]}
                    value={roomData.moderationSettings.allowMute}
                    onChange={(value) => handleChange('moderation_mute', value)}
                />
                <SelectField
                    label={LocalizeText('navigator.roomsettings.moderation.kick.header')}
                    options={[none, rights, all]}
                    value={roomData.moderationSettings.allowKick}
                    onChange={(value) => handleChange('moderation_kick', value)}
                />
                <SelectField
                    label={LocalizeText('navigator.roomsettings.moderation.ban.header')}
                    options={[none, rights]}
                    value={roomData.moderationSettings.allowBan}
                    onChange={(value) => handleChange('moderation_ban', value)}
                />
            </HandheldRsSection>
            <HandheldRsSection className="is-list" title={`${LocalizeText('navigator.roomsettings.moderation.banned.users')} (${bannedUsers.length})`}>
                {bannedUsers.length === 0 && (
                    <HandheldRsEmpty>{localizeWithFallback('octane.handheld.room_settings.banned.empty', 'Nobody is banned from this room.')}</HandheldRsEmpty>
                )}
                {bannedUsers.map((user) => (
                    <HandheldRsPersonCard
                        key={user.userId}
                        action={LocalizeText('navigator.roomsettings.moderation.unban')}
                        name={user.userName}
                        userId={user.userId}
                        onAction={() => onUnban(user.userId)}
                    />
                ))}
            </HandheldRsSection>
        </div>
    );
};
