import {
    AddLinkEventTracker,
    CreateLinkEvent,
    ILinkEventTracker,
    OctaneSettingsEvent,
    RemoveLinkEventTracker,
    SoundboardSaveVolumeComposer,
    UserSettingsCameraFollowComposer,
    UserSettingsEvent,
    UserSettingsOldChatComposer,
    UserSettingsPrivacyComposer,
    UserSettingsRoomInvitesComposer,
    UserSettingsSoundComposer
} from '@octane/renderer';
import { FC, ReactNode, useEffect, useState } from 'react';
import { DispatchMainEvent, DispatchUiEvent, localizeWithFallback, SendMessageComposer } from '../../api';
import { DraggableWindow } from '../../common';
import {
    useCatalogDisplayPreferences,
    useCatalogPlaceMultipleItems,
    useCatalogSkipPurchaseConfirmation,
    useChatWindow,
    useKeyboardMovement,
    useMessageEvent
} from '../../hooks';
import { AirSettingsVolumeRow } from './AirSettingsVolumeRow';
import { SoundboardVolumeControl } from './SoundboardVolumeControl';

type SettingsSection = null | 'audio' | 'chat' | 'other' | 'privacy';
type VolumeAction = 'system_volume' | 'furni_volume' | 'trax_volume' | 'soundboard_volume';

interface AirSettingsFrameProps {
    backLabel: string;
    children: ReactNode;
    onBack: () => void;
    title: string;
    variant: 'menu' | Exclude<SettingsSection, null>;
}

const AirSettingsFrame: FC<AirSettingsFrameProps> = ({ backLabel, children, onBack, title, variant }) => (
    <DraggableWindow handleSelector=".air-settings-window__title" uniqueKey="user-settings">
        <section
            aria-label={title}
            className={`user-settings-window air-settings-window air-settings-window--${variant} max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]`}
            role="dialog"
        >
            <div aria-hidden="true" className="air-settings-window__chrome" />
            <h2 className="air-settings-window__title">{title}</h2>
            <div aria-hidden="true" className="air-settings-window__divider" />
            {children}
            <button className="air-settings-button air-settings-window__back" onClick={onBack} type="button">
                {backLabel}
            </button>
        </section>
    </DraggableWindow>
);

const clampVolume = (value: number) => Math.max(0, Math.min(100, Number(value)));

export const UserSettingsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [section, setSection] = useState<SettingsSection>(null);
    const [returnToMenu, setReturnToMenu] = useState(false);
    const [userSettings, setUserSettings] = useState<OctaneSettingsEvent>(null);
    const [catalogPlaceMultipleObjects, setCatalogPlaceMultipleObjects] = useCatalogPlaceMultipleItems();
    const [catalogSkipPurchaseConfirmation, setCatalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { density: catalogGridDensity, setDensity: setCatalogGridDensity, showTilePrices, setShowTilePrices } = useCatalogDisplayPreferences();
    const [chatWindowEnabled, setChatWindowEnabled] = useChatWindow();
    const [keyboardMovement, setKeyboardMovement] = useKeyboardMovement();

    const closeView = () => {
        setIsVisible(false);
        setReturnToMenu(false);
    };

    const processAction = (type: string, value?: boolean | number) => {
        if (type === 'close_view') {
            closeView();
            return;
        }

        const clone = userSettings.clone();

        switch (type) {
            case 'oldchat':
                clone.oldChat = value as boolean;
                SendMessageComposer(new UserSettingsOldChatComposer(clone.oldChat));
                break;
            case 'room_invites':
                clone.roomInvites = value as boolean;
                SendMessageComposer(new UserSettingsRoomInvitesComposer(clone.roomInvites));
                break;
            case 'camera_follow':
                clone.cameraFollow = value as boolean;
                SendMessageComposer(new UserSettingsCameraFollowComposer(clone.cameraFollow));
                break;
            case 'online_status_visible':
                clone.onlineStatusVisible = value as boolean;
                SendMessageComposer(new UserSettingsPrivacyComposer(clone.onlineStatusVisible, clone.friendsCanFollow, clone.friendRequestsAllowed));
                break;
            case 'friends_can_follow':
                clone.friendsCanFollow = value as boolean;
                SendMessageComposer(new UserSettingsPrivacyComposer(clone.onlineStatusVisible, clone.friendsCanFollow, clone.friendRequestsAllowed));
                break;
            case 'friend_requests_allowed':
                clone.friendRequestsAllowed = value as boolean;
                SendMessageComposer(new UserSettingsPrivacyComposer(clone.onlineStatusVisible, clone.friendsCanFollow, clone.friendRequestsAllowed));
                break;
            case 'system_volume':
                clone.volumeSystem = clampVolume(value as number);
                break;
            case 'furni_volume':
                clone.volumeFurni = clampVolume(value as number);
                break;
            case 'trax_volume':
                clone.volumeTrax = clampVolume(value as number);
                break;
            case 'soundboard_volume':
                clone.volumeSoundboard = clampVolume(value as number);
                break;
        }

        setUserSettings(clone);
        DispatchMainEvent(clone);
    };

    const saveVolume = (type: VolumeAction, value: number) => {
        const committedValue = Math.round(clampVolume(value));

        if (type === 'soundboard_volume') {
            SendMessageComposer(new SoundboardSaveVolumeComposer(committedValue));
            return;
        }

        SendMessageComposer(
            new UserSettingsSoundComposer(
                type === 'system_volume' ? committedValue : Math.round(userSettings.volumeSystem),
                type === 'furni_volume' ? committedValue : Math.round(userSettings.volumeFurni),
                type === 'trax_volume' ? committedValue : Math.round(userSettings.volumeTrax)
            )
        );
    };

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, (event) => {
        const parser = event.getParser();
        const settingsEvent = new OctaneSettingsEvent();

        settingsEvent.volumeSystem = parser.volumeSystem;
        settingsEvent.volumeFurni = parser.volumeFurni;
        settingsEvent.volumeTrax = parser.volumeTrax;
        settingsEvent.volumeSoundboard = parser.volumeSoundboard;
        settingsEvent.oldChat = parser.oldChat;
        settingsEvent.roomInvites = parser.roomInvites;
        settingsEvent.cameraFollow = parser.cameraFollow;
        settingsEvent.flags = parser.flags;
        settingsEvent.chatType = parser.chatType;
        settingsEvent.onlineStatusVisible = parser.onlineStatusVisible;
        settingsEvent.friendsCanFollow = parser.friendsCanFollow;
        settingsEvent.friendRequestsAllowed = parser.friendRequestsAllowed;

        setUserSettings(settingsEvent);
        DispatchMainEvent(settingsEvent);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setSection((parts[2] as SettingsSection) || null);
                        setReturnToMenu(false);
                        setIsVisible(true);
                        return;
                    case 'hide':
                        closeView();
                        return;
                    case 'toggle':
                        setSection((parts[2] as SettingsSection) || null);
                        setReturnToMenu(false);
                        setIsVisible((previousValue) => !previousValue);
                        return;
                }
            },
            eventUrlPrefix: 'user-settings/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (userSettings) DispatchUiEvent(userSettings);
    }, [userSettings]);

    if (!isVisible || !userSettings) return null;

    const backLabel = localizeWithFallback('widget.memenu.back', localizeWithFallback('generic.back', 'Back'));
    const muteLabel = localizeWithFallback('widget.memenu.settings.volume.mute', 'Mute');
    const maximumLabel = localizeWithFallback('widget.memenu.settings.volume.maximum', 'Maximum volume');
    const openMenuSection = (nextSection: Exclude<SettingsSection, null>) => {
        setSection(nextSection);
        setReturnToMenu(true);
    };
    const handleBack = () => {
        if (section && returnToMenu) {
            setSection(null);
            setReturnToMenu(false);
            return;
        }

        closeView();
    };

    if (section === null) {
        return (
            <AirSettingsFrame backLabel={backLabel} onBack={closeView} title={localizeWithFallback('widget.memenu.settings', 'Settings')} variant="menu">
                <div className="air-settings-menu__items">
                    <button className="air-settings-button" onClick={() => openMenuSection('audio')} type="button">
                        {localizeWithFallback('widget.memenu.settings.audio', 'Sound settings')}
                    </button>
                    <button
                        className="air-settings-button"
                        onClick={() => {
                            CreateLinkEvent('avatar-editor/show');
                            closeView();
                        }}
                        type="button"
                    >
                        {localizeWithFallback('widget.memenu.settings.character', 'Character settings')}
                    </button>
                    <button className="air-settings-button" onClick={() => openMenuSection('chat')} type="button">
                        {localizeWithFallback('widget.memenu.settings.chat', 'Chat settings')}
                    </button>
                    <button className="air-settings-button" onClick={() => openMenuSection('other')} type="button">
                        {localizeWithFallback('widget.memenu.settings.other', 'Other settings')}
                    </button>
                    <button className="air-settings-button" onClick={() => openMenuSection('privacy')} type="button">
                        {localizeWithFallback('privacy.settings.title', 'Game Privacy')}
                    </button>
                    <button className="air-settings-button" onClick={() => CreateLinkEvent('user-account-settings/show')} type="button">
                        {localizeWithFallback('usersettings.open.title', 'User Settings')}
                    </button>
                </div>
            </AirSettingsFrame>
        );
    }

    if (section === 'audio') {
        return (
            <AirSettingsFrame
                backLabel={backLabel}
                onBack={handleBack}
                title={localizeWithFallback('widget.memenu.settings.title', 'Settings')}
                variant="audio"
            >
                <div className="air-settings-audio__heading">{localizeWithFallback('widget.memenu.settings.volume', 'Adjust the sound volume')}</div>
                <div className="air-settings-audio__rows">
                    <AirSettingsVolumeRow
                        id="volumeSystem"
                        label={localizeWithFallback('widget.memenu.settings.volume.ui', 'System')}
                        maximumLabel={maximumLabel}
                        muteLabel={muteLabel}
                        value={userSettings.volumeSystem}
                        onChange={(value) => processAction('system_volume', value)}
                        onCommit={(value) => saveVolume('system_volume', value)}
                    />
                    <AirSettingsVolumeRow
                        id="volumeFurni"
                        label={localizeWithFallback('widget.memenu.settings.volume.furni', 'Furni')}
                        maximumLabel={maximumLabel}
                        muteLabel={muteLabel}
                        value={userSettings.volumeFurni}
                        onChange={(value) => processAction('furni_volume', value)}
                        onCommit={(value) => saveVolume('furni_volume', value)}
                    />
                    <AirSettingsVolumeRow
                        id="volumeTrax"
                        label={localizeWithFallback('widget.memenu.settings.volume.trax', 'Trax')}
                        maximumLabel={maximumLabel}
                        muteLabel={muteLabel}
                        value={userSettings.volumeTrax}
                        onChange={(value) => processAction('trax_volume', value)}
                        onCommit={(value) => saveVolume('trax_volume', value)}
                    />
                    <SoundboardVolumeControl
                        value={userSettings.volumeSoundboard}
                        onChange={(value) => processAction('soundboard_volume', value)}
                        onCommit={(value) => saveVolume('soundboard_volume', value)}
                    />
                </div>
            </AirSettingsFrame>
        );
    }

    if (section === 'chat') {
        return (
            <AirSettingsFrame
                backLabel={backLabel}
                onBack={handleBack}
                title={localizeWithFallback('room.chat.settings.title', 'Chat settings')}
                variant="chat"
            >
                <p className="air-settings-chat__info">{localizeWithFallback('toolbar.chat.settings.info', 'Choose how chat appears for you.')}</p>
                <div className="air-settings-chat__list">
                    <label className="air-settings-check-row">
                        <input
                            checked={userSettings.oldChat}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => processAction('oldchat', event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.chat.prefer.old.chat', 'Prefer old chat')}</span>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={chatWindowEnabled}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => setChatWindowEnabled(event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.enable.chat.window', 'Enable chat window')}</span>
                    </label>
                </div>
            </AirSettingsFrame>
        );
    }

    if (section === 'other') {
        return (
            <AirSettingsFrame
                backLabel={backLabel}
                onBack={handleBack}
                title={localizeWithFallback('widget.memenu.other.settings.title', 'Other settings')}
                variant="other"
            >
                <div className="air-settings-other__list">
                    <label className="air-settings-check-row">
                        <input
                            checked={userSettings.roomInvites}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => processAction('room_invites', event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.ignore.room.invites', 'Ignore room invites')}</span>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={userSettings.cameraFollow}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => processAction('camera_follow', event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.disable.room.camera.follow', "Don't focus on own avatar")}</span>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={catalogPlaceMultipleObjects}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => setCatalogPlaceMultipleObjects(event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.place.multiple.objects', 'Place multiple catalog items')}</span>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={catalogSkipPurchaseConfirmation}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => setCatalogSkipPurchaseConfirmation(event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.skip.purchase.confirmation', 'Skip catalog purchase confirmation')}</span>
                    </label>
                    <label className="air-settings-select-row">
                        <span>{localizeWithFallback('memenu.settings.other.catalog.grid.density', 'Catalog item size')}</span>
                        <select
                            aria-label={localizeWithFallback('memenu.settings.other.catalog.grid.density', 'Catalog item size')}
                            value={catalogGridDensity}
                            onChange={(event) => setCatalogGridDensity(event.target.value as 'compact' | 'standard' | 'large')}
                        >
                            <option value="compact">{localizeWithFallback('generic.compact', 'Compact')}</option>
                            <option value="standard">{localizeWithFallback('generic.standard', 'Standard')}</option>
                            <option value="large">{localizeWithFallback('generic.large', 'Large')}</option>
                        </select>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={showTilePrices}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => setShowTilePrices(event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.catalog.show.prices', 'Show prices on catalog items')}</span>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={keyboardMovement}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => setKeyboardMovement(event.target.checked)}
                        />
                        <span>{localizeWithFallback('memenu.settings.other.keyboard.movement', 'Move with the arrow keys')}</span>
                    </label>
                </div>
            </AirSettingsFrame>
        );
    }

    return (
        <AirSettingsFrame backLabel={backLabel} onBack={handleBack} title={localizeWithFallback('privacy.settings.title', 'Game Privacy')} variant="privacy">
            <div className="air-settings-privacy__content">
                <fieldset>
                    <legend>{localizeWithFallback('privacy.settings.online.title', 'Online status')}</legend>
                    <p>{localizeWithFallback('settings.privacy.online_status_description', 'Who can see your online status:')}</p>
                    <label className="air-settings-check-row">
                        <input
                            checked={userSettings.onlineStatusVisible}
                            className="air-settings-radio"
                            name="online-status-visibility"
                            type="radio"
                            onChange={() => processAction('online_status_visible', true)}
                        />
                        <span>{localizeWithFallback('settings.privacy.everyone', 'Everyone')}</span>
                    </label>
                    <label className="air-settings-check-row">
                        <input
                            checked={!userSettings.onlineStatusVisible}
                            className="air-settings-radio"
                            name="online-status-visibility"
                            type="radio"
                            onChange={() => processAction('online_status_visible', false)}
                        />
                        <span>{localizeWithFallback('settings.privacy.noone', 'Nobody')}</span>
                    </label>
                </fieldset>
                <fieldset>
                    <legend>{localizeWithFallback('privacy.settings.follow.title', 'Follow settings')}</legend>
                    <label className="air-settings-check-row">
                        <input
                            checked={userSettings.friendsCanFollow}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => processAction('friends_can_follow', event.target.checked)}
                        />
                        <span>{localizeWithFallback('settings.privacy.follow_description', 'My friends can follow me from one room to another')}</span>
                    </label>
                </fieldset>
                <fieldset>
                    <legend>{localizeWithFallback('privacy.settings.friend_requests.title', 'Friend requests')}</legend>
                    <label className="air-settings-check-row">
                        <input
                            checked={userSettings.friendRequestsAllowed}
                            className="air-settings-checkbox"
                            type="checkbox"
                            onChange={(event) => processAction('friend_requests_allowed', event.target.checked)}
                        />
                        <span>{localizeWithFallback('settings.privacy.friend_requests_description', 'Other Habbos can send me a friend request')}</span>
                    </label>
                </fieldset>
            </div>
        </AirSettingsFrame>
    );
};
