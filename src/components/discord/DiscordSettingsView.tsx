import {
    AddLinkEventTracker,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { GetConfigurationValue, LocalizeText, OpenUrl } from '../../api';
import { LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { DiscordPreferences, useDiscordSettings } from '../../hooks';

const localizeWithFallback = (key: string, fallback: string) => {
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

interface CheckboxRowProps {
    label: string;
    description?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}

const CheckboxRow: FC<CheckboxRowProps> = ({ label, description, checked, disabled = false, onChange }) => (
    <label
        className={
            'flex items-start gap-3 rounded-md border border-black/10 bg-white px-3 py-2 transition-colors ' +
            (disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#5865F2]')
        }
    >
        <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-[#5865F2]"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
        />
        <div className="flex flex-col leading-tight">
            <Text bold>{label}</Text>
            {description && (
                <Text small className="text-black/60">
                    {description}
                </Text>
            )}
        </div>
    </label>
);

interface ServerLinkProps {
    label: string;
    configKey: string;
}

const ServerLink: FC<ServerLinkProps> = ({ label, configKey }) => {
    const link = GetConfigurationValue<string>(configKey, '');
    if (!link) return null;

    return (
        <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-md bg-[#5865F2] px-3 py-2 text-white shadow-[inset_0_2px_#ffffff26,inset_0_-2px_#0000001a] transition-colors hover:bg-[#4752c4] cursor-pointer"
            onClick={() => OpenUrl(link)}
        >
            <FaDiscord />
            <Text bold className="text-white">
                {label}
            </Text>
        </button>
    );
};

interface DiscordPresencePreviewProps {
    preferences: DiscordPreferences;
}

const DiscordHabboIcon: FC<{ small?: boolean }> = ({ small = false }) => (
    <div
        className={
            'flex shrink-0 items-center justify-center rounded-[3px] bg-[#ffd829] text-[#5a4100] shadow-[inset_0_2px_#fff178,inset_0_-2px_#c39200] ' +
            (small ? 'h-[26px] w-[26px] text-[20px]' : 'h-[32px] w-[32px] text-[24px]')
        }
    >
        <span className="font-black leading-none drop-shadow-[1px_1px_0_#ffffff99]">H</span>
    </div>
);

const DiscordPresencePreview: FC<DiscordPresencePreviewProps> = ({ preferences }) => {
    const sessionData = GetSessionDataManager();
    const userName = sessionData?.userName || 'Spartano1996';
    const userFigure = sessionData?.figure || null;
    const hotelName = GetConfigurationValue<string>('hotel.name', 'Habbo IT');
    const details = preferences.shareActivity
        ? localizeWithFallback('discord.settings.preview.details', 'Working in ragg appis e...')
        : localizeWithFallback('discord.settings.preview.hidden_activity', 'Activity hidden');
    const elapsed = localizeWithFallback('discord.settings.preview.elapsed', '28:10 trascorsi');

    return (
        <div className="overflow-hidden rounded-[14px] border border-white/5 bg-[#29292e] text-white shadow-[0_10px_28px_#00000055,inset_0_1px_0_#ffffff0d]">
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1f2024]">
                    {userFigure ? (
                        <LayoutAvatarImageView
                            figure={userFigure}
                            headOnly
                            direction={2}
                            className="absolute left-1/2 top-1/2 h-auto w-auto -translate-x-1/2 -translate-y-1/2"
                        />
                    ) : (
                        <FaDiscord className="text-[#5865F2]" size={20} />
                    )}
                    <span className="absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full border-2 border-[#29292e] bg-[#43b581]" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[15px] font-bold text-white">{userName}</div>
                    <div className="truncate text-[13px] text-[#9aa0aa]">
                        {preferences.showHabbo
                            ? localizeWithFallback('discord.settings.preview.status', 'Habbo Hotel – 28m')
                            : localizeWithFallback('discord.settings.preview.disabled', 'Rich Presence disabled')}
                    </div>
                </div>
                <DiscordHabboIcon />
            </div>

            <div className="flex items-center gap-3 bg-[#202124] px-4 py-3">
                <DiscordHabboIcon small />
                <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[14px] font-bold text-white">
                        {preferences.showHabbo
                            ? localizeWithFallback('discord.settings.preview.playing', `Playing ${hotelName}`)
                            : localizeWithFallback('discord.settings.preview.not_sharing', 'Not sharing on Discord')}
                    </div>
                    <div className="truncate text-[12px] text-[#b5bac1]">{preferences.showHabbo ? details : ''}</div>
                    {preferences.showHabbo && <div className="truncate text-[11px] text-[#8a9099]">{elapsed}</div>}
                </div>
            </div>
        </div>
    );
};

export const DiscordSettingsView: FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { preferences, updatePreferences } = useDiscordSettings();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'discord-settings/',
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!isVisible) return null;

    const setPref = (key: keyof DiscordPreferences) => (checked: boolean) =>
        updatePreferences({ [key]: checked });

    // Cascade enable rules mirror the Flash DiscordSettingsView.updateUI():
    // the sub-options only make sense while the master toggle (and, for the
    // last two, the "share activity" toggle) are on.
    const activityDisabled = !preferences.showHabbo;
    const subOptionDisabled = !preferences.showHabbo || !preferences.shareActivity;

    return (
        <OctaneCardView className="discord-settings-window w-[390px]" theme="primary-slim" uniqueKey="discord-settings">
            <OctaneCardHeaderView
                headerText={localizeWithFallback('discord.settings.title', 'Impostazioni Discord')}
                onCloseClick={() => setIsVisible(false)}
            />

            <div className="relative flex items-center gap-3 px-3 py-3 bg-[linear-gradient(180deg,#5865F2_0%,#4752c4_100%)] text-white">
                <div className="flex items-center justify-center w-[44px] h-[44px] shrink-0 rounded-full bg-white/20 border-2 border-white/40">
                    <FaDiscord size={24} />
                </div>
                <div className="flex flex-col leading-tight">
                    <Text bold className="text-white text-[15px]">
                        {localizeWithFallback('discord.settings.header', 'Discord Rich Presence')}
                    </Text>
                    <Text small className="text-white/80">
                        {localizeWithFallback('discord.settings.subtitle', 'Mostra la tua attività su Discord')}
                    </Text>
                </div>
            </div>

            <OctaneCardContentView className="flex flex-col gap-2 text-black">
                <DiscordPresencePreview preferences={preferences} />

                <CheckboxRow
                    label={localizeWithFallback('discord.settings.show_habbo', 'Mostra Habbo su Discord')}
                    description={localizeWithFallback(
                        'discord.settings.show_habbo.desc',
                        'Visualizza che stai giocando ad Habbo sul tuo profilo Discord',
                    )}
                    checked={preferences.showHabbo}
                    onChange={setPref('showHabbo')}
                />
                <CheckboxRow
                    label={localizeWithFallback('discord.settings.share_activity', 'Condividi attività')}
                    description={localizeWithFallback(
                        'discord.settings.share_activity.desc',
                        'Mostra in quale stanza ti trovi e cosa stai facendo',
                    )}
                    checked={preferences.shareActivity}
                    disabled={activityDisabled}
                    onChange={setPref('shareActivity')}
                />
                <CheckboxRow
                    label={localizeWithFallback('discord.settings.hide_hidden', 'Nascondi stanze nascoste')}
                    description={localizeWithFallback(
                        'discord.settings.hide_hidden.desc',
                        'Non rivelare i dettagli quando sei in una stanza nascosta',
                    )}
                    checked={preferences.hideInHiddenRooms}
                    disabled={subOptionDisabled}
                    onChange={setPref('hideInHiddenRooms')}
                />
                <CheckboxRow
                    label={localizeWithFallback('discord.settings.allow_joining', 'Consenti di unirsi')}
                    description={localizeWithFallback(
                        'discord.settings.allow_joining.desc',
                        'Aggiungi un pulsante "Visita stanza" alla tua presence',
                    )}
                    checked={preferences.allowJoining}
                    disabled={subOptionDisabled}
                    onChange={setPref('allowJoining')}
                />

                <Text small className="text-black/60 uppercase tracking-wider px-1 pt-2">
                    {localizeWithFallback('discord.settings.servers', 'Server Discord')}
                </Text>
                <div className="flex flex-col gap-2">
                    <ServerLink
                        label={localizeWithFallback('discord.settings.server.collectibles', 'Collectibles')}
                        configKey="collectibles.discord.link"
                    />
                    <ServerLink
                        label={localizeWithFallback('discord.settings.server.wired', 'Wired')}
                        configKey="wired.discord.link"
                    />
                    <ServerLink
                        label={localizeWithFallback('discord.settings.server.origins', 'Origins')}
                        configKey="origins.discord.link"
                    />
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
