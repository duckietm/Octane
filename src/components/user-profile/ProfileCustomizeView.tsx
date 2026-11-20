import { UserProfileParser } from '@octane/renderer';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import {
    loadProfileCustomizationData,
    localizeWithFallback,
    PROFILE_ACCENTS,
    ProfileCustomizationChange,
    ProfileCustomizationData,
    resolveProfileBannerUrl,
    sendProfileCustomization
} from '../../api';
import { Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView, Text } from '../../common';
import { ToggleButton } from '../../common/ToggleButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const TABS = ['banner', 'card', 'border', 'accent'] as const;
type ProfileCustomizeTab = (typeof TABS)[number];

const TAB_LABELS: Record<ProfileCustomizeTab, [string, string]> = {
    banner: ['extendedprofile.customize.banner', 'Banner'],
    card: ['extendedprofile.customize.background', 'Background'],
    border: ['extendedprofile.customize.border', 'Border'],
    accent: ['extendedprofile.customize.accent', 'Colour']
};

// The server drops a change that follows the previous one within half a second.
const SEND_COOLDOWN_MS = 600;

interface ProfileCustomizeViewProps {
    userProfile: UserProfileParser;
    onClose: () => void;
}

/** The own profile window's banner, background, border and accent, each picked from the hotel's lists. */
export const ProfileCustomizeView: FC<ProfileCustomizeViewProps> = ({ userProfile, onClose }) => {
    const [activeTab, setActiveTab] = useState<ProfileCustomizeTab>('banner');
    const [data, setData] = useState<ProfileCustomizationData | null>(null);
    const lastSent = useRef(0);

    useEffect(() => {
        let cancelled = false;

        loadProfileCustomizationData().then((loaded) => {
            if (!cancelled) setData(loaded);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const current: Record<ProfileCustomizeTab, number> = {
        banner: userProfile.bannerId ?? 0,
        card: userProfile.cardBackgroundId ?? 0,
        border: userProfile.borderId ?? 0,
        accent: userProfile.accentId ?? 0
    };

    const choose = (id: number) => {
        const now = Date.now();

        if (id === current[activeTab] || now - lastSent.current < SEND_COOLDOWN_MS) return;

        lastSent.current = now;
        sendProfileCustomization(userProfile, { [activeTab]: id } as ProfileCustomizationChange);
    };

    const noneLabel = localizeWithFallback('extendedprofile.customize.none', 'None');

    const renderOption = (id: number, content: ReactNode, label: string) => (
        <ToggleButton
            key={id}
            aria-label={label}
            className={`octane-profile-customize__option${id === current[activeTab] ? ' is-selected' : ''}`}
            pressed={id === current[activeTab]}
            onClick={() => choose(id)}
        >
            {content}
        </ToggleButton>
    );

    const renderOptions = () => {
        if (!data) return <Text small>{localizeWithFallback('generic.loading', 'Loading...')}</Text>;

        switch (activeTab) {
            case 'banner':
                return (
                    <Grid gap={1} columnCount={2} overflow="auto">
                        {renderOption(0, <span className="octane-profile-customize__banner octane-profile-customize__banner--none">{noneLabel}</span>, noneLabel)}
                        {data.banners.map((banner) =>
                            renderOption(
                                banner.id,
                                <span className="octane-profile-customize__banner" style={{ backgroundImage: `url(${resolveProfileBannerUrl(banner.image)})` }} />,
                                `${TAB_LABELS.banner[1]} ${banner.id}`
                            )
                        )}
                    </Grid>
                );
            case 'card':
                return (
                    <Grid gap={1} columnCount={7} overflow="auto">
                        {data.cards.map((id) =>
                            renderOption(id, <span className={`octane-profile-customize__card profile-card-background card-background-${id}`} />, id ? `${TAB_LABELS.card[1]} ${id}` : noneLabel)
                        )}
                    </Grid>
                );
            case 'border':
                return (
                    <Grid gap={1} columnCount={7} overflow="auto">
                        {[0, ...data.borders.filter((id) => id > 0)].map((id) =>
                            renderOption(id, <span className={`octane-profile-customize__border profile-border border-${id}`} />, id ? `${TAB_LABELS.border[1]} ${id}` : noneLabel)
                        )}
                    </Grid>
                );
            case 'accent':
                return (
                    <Grid gap={1} columnCount={7} overflow="auto">
                        {renderOption(0, <span className="octane-profile-customize__swatch octane-profile-customize__swatch--none" />, noneLabel)}
                        {PROFILE_ACCENTS.map((accent) =>
                            renderOption(accent.id, <span className="octane-profile-customize__swatch" style={{ backgroundColor: accent.color }} />, `${TAB_LABELS.accent[1]} ${accent.id}`)
                        )}
                    </Grid>
                );
        }
    };

    return (
        <NativeTextTree>
            <OctaneCardView uniqueKey="octane-profile-customize" className="octane-profile-customize w-[420px] h-[360px] max-w-[96vw] max-h-[80vh]">
                <OctaneCardHeaderView headerText={localizeWithFallback('extendedprofile.customize.title', 'Customise profile')} onCloseClick={onClose} />
                <OctaneCardTabsView>
                    {TABS.map((tab) => (
                        <OctaneCardTabsItemView key={tab} isActive={activeTab === tab} onClick={() => setActiveTab(tab)}>
                            {localizeWithFallback(TAB_LABELS[tab][0], TAB_LABELS[tab][1])}
                        </OctaneCardTabsItemView>
                    ))}
                </OctaneCardTabsView>
                <OctaneCardContentView gap={1} className="overflow-hidden">
                    {renderOptions()}
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
