import { RoomChatSettings } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { useChatPreferences } from '../../hooks';

// Same drop-menus and option order as the official toolbar_chat_settings layout (ChatSettingsView).
export const UserChatPreferencesView: FC<{}> = () => {
    const [preferences, setPreferences] = useChatPreferences();

    const modeLabel = localizeWithFallback('toolbar.chat.settings.mode', 'Chat mode');
    const widthLabel = localizeWithFallback('toolbar.chat.settings.bubble_width', 'Bubble width');
    const speedLabel = localizeWithFallback('toolbar.chat.settings.scroll_speed', 'Scroll speed');

    return (
        <>
            <label className="air-settings-select-row">
                <span>{modeLabel}</span>
                <select aria-label={modeLabel} value={preferences.mode} onChange={(event) => setPreferences({ mode: Number(event.target.value) })}>
                    <option value={RoomChatSettings.CHAT_MODE_FREE_FLOW}>
                        {localizeWithFallback('navigator.roomsettings.chat.mode.free.flow', 'Free flow')}
                    </option>
                    <option value={RoomChatSettings.CHAT_MODE_LINE_BY_LINE}>
                        {localizeWithFallback('navigator.roomsettings.chat.mode.line.by.line', 'Line by line')}
                    </option>
                </select>
            </label>
            <label className="air-settings-select-row">
                <span>{widthLabel}</span>
                <select
                    aria-label={widthLabel}
                    value={preferences.bubbleWidth}
                    onChange={(event) => setPreferences({ bubbleWidth: Number(event.target.value) })}
                >
                    <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE}>
                        {localizeWithFallback('navigator.roomsettings.chat.bubbles.width.wide', 'Wide')}
                    </option>
                    <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL}>
                        {localizeWithFallback('navigator.roomsettings.chat.bubbles.width.normal', 'Normal')}
                    </option>
                    <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN}>
                        {localizeWithFallback('navigator.roomsettings.chat.bubbles.width.thin', 'Thin')}
                    </option>
                </select>
            </label>
            <label className="air-settings-select-row">
                <span>{speedLabel}</span>
                <select
                    aria-label={speedLabel}
                    value={preferences.scrollSpeed}
                    onChange={(event) => setPreferences({ scrollSpeed: Number(event.target.value) })}
                >
                    <option value={RoomChatSettings.CHAT_SCROLL_SPEED_FAST}>{localizeWithFallback('navigator.roomsettings.chat.speed.fast', 'Fast')}</option>
                    <option value={RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL}>
                        {localizeWithFallback('navigator.roomsettings.chat.speed.normal', 'Normal')}
                    </option>
                    <option value={RoomChatSettings.CHAT_SCROLL_SPEED_SLOW}>{localizeWithFallback('navigator.roomsettings.chat.speed.slow', 'Slow')}</option>
                </select>
            </label>
        </>
    );
};
