import { UserProfileParser } from '@octane/renderer';
import { ChangeEvent, CSSProperties, FC, ReactNode, useEffect, useRef, useState } from 'react';
import {
    getProfileAccentColor,
    loadProfileCustomizationData,
    localizeWithFallback,
    PROFILE_ACCENTS,
    PROFILE_IMAGE_ACCEPT,
    PROFILE_IMAGE_MAX_SOURCE_BYTES,
    ProfileCustomizationChange,
    ProfileCustomizationData,
    ProfileImageKind,
    profileGalleryBannerStyle,
    profileImageUrl,
    removeProfileImage,
    sendProfileCustomization,
    uploadProfileImage
} from '../../api';
import { Button, Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView, Text } from '../../common';
import { ToggleButton } from '../../common/ToggleButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ProfilePreviewView } from '../backgrounds/ProfilePreviewView';
import { ProfileCustomizePreviewView } from './ProfileCustomizePreviewView';
import { ProfileImageEditorView } from './ProfileImageEditorView';

const TABS = ['banner', 'card', 'avatar', 'border', 'accent'] as const;
type ProfileCustomizeTab = (typeof TABS)[number];

const TAB_LABELS: Record<ProfileCustomizeTab, [string, string]> = {
    banner: ['extendedprofile.customize.banner', 'Banner'],
    card: ['extendedprofile.customize.background', 'Background'],
    avatar: ['extendedprofile.customize.avatar', 'Picture'],
    border: ['extendedprofile.customize.border', 'Border'],
    accent: ['extendedprofile.customize.accent', 'Colour']
};

// The server drops a change that follows the previous one within half a second.
const SEND_COOLDOWN_MS = 600;

interface ProfileCustomizeViewProps {
    userProfile: UserProfileParser;
    onClose: () => void;
}

/** The own profile window's look: banner, background, picture, border and accent, from the hotel's lists or an uploaded picture. */
export const ProfileCustomizeView: FC<ProfileCustomizeViewProps> = ({ userProfile, onClose }) => {
    const [activeTab, setActiveTab] = useState<ProfileCustomizeTab>('banner');
    const [data, setData] = useState<ProfileCustomizationData | null>(null);
    const [editing, setEditing] = useState<{ kind: ProfileImageKind; image: HTMLImageElement } | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const uploadKind = useRef<ProfileImageKind>('banner');
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

    const customBanner = userProfile.bannerImage ?? '';
    const customBackground = userProfile.backgroundImage ?? '';

    const noneLabel = localizeWithFallback('extendedprofile.customize.none', 'None');
    const label = (tab: ProfileCustomizeTab) => localizeWithFallback(TAB_LABELS[tab][0], TAB_LABELS[tab][1]);

    const send = (change: ProfileCustomizationChange) => {
        const now = Date.now();

        if (now - lastSent.current < SEND_COOLDOWN_MS) return;

        lastSent.current = now;
        setMessage(null);
        sendProfileCustomization(userProfile, change);
    };

    /** A gallery choice replaces an uploaded picture of the same place, so that one is removed first. */
    const choose = async (change: ProfileCustomizationChange, current: number, replaces: ProfileImageKind | null) => {
        const [value] = Object.values(change);
        const custom = replaces === 'banner' ? customBanner : replaces === 'background' ? customBackground : '';

        if (value === current && !custom) return;

        if (custom) {
            setBusy(true);
            await removeProfileImage(replaces);
            setBusy(false);
        }

        send(change);
    };

    const pickFile = (kind: ProfileImageKind) => {
        uploadKind.current = kind;
        setMessage(null);
        fileInput.current?.click();
    };

    const onFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        event.target.value = '';

        if (!file) return;

        if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES || !file.type.startsWith('image/')) {
            setMessage(localizeWithFallback('extendedprofile.customize.upload.invalid', 'Choose a PNG, JPEG, GIF or WebP picture smaller than 15 MB.'));

            return;
        }

        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            setEditing({ kind: uploadKind.current, image });
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            setMessage(localizeWithFallback('extendedprofile.customize.upload.invalid', 'Choose a PNG, JPEG, GIF or WebP picture smaller than 15 MB.'));
        };
        image.src = url;
    };

    const saveUpload = async (bytes: Uint8Array) => {
        if (!editing) return;

        setBusy(true);

        const result = await uploadProfileImage(editing.kind, bytes);

        setBusy(false);

        if ('message' in result) {
            setMessage(result.message);

            return;
        }

        setEditing(null);
        setMessage(null);
    };

    const removeUpload = async (kind: ProfileImageKind) => {
        setBusy(true);
        await removeProfileImage(kind);
        setBusy(false);
    };

    const option = (key: string | number, selected: boolean, content: ReactNode, name: string, onClick: () => void, className = '') => (
        <ToggleButton
            key={key}
            aria-label={name}
            className={`octane-profile-customize__option ${className}${selected ? ' is-selected' : ''}`}
            pressed={selected}
            disabled={busy}
            onClick={onClick}
        >
            {content}
        </ToggleButton>
    );

    const uploadRow = (kind: ProfileImageKind, custom: string) => (
        <div className="octane-profile-customize__upload">
            <Button variant="primary" disabled={busy} onClick={() => pickFile(kind)}>
                {localizeWithFallback('extendedprofile.customize.upload', 'Upload a picture')}
            </Button>
            {custom && (
                <>
                    <span className="octane-profile-customize__upload-current" style={{ backgroundImage: `url(${profileImageUrl(custom)})` }} />
                    <Button variant="danger" disabled={busy} onClick={() => removeUpload(kind)}>
                        {localizeWithFallback('extendedprofile.customize.upload.remove', 'Remove picture')}
                    </Button>
                </>
            )}
        </div>
    );

    const section = (title: string, children: ReactNode) => (
        <div className="octane-profile-customize__section">
            <Text bold small>
                {title}
            </Text>
            {children}
        </div>
    );

    const renderTab = () => {
        if (!data) return <Text small>{localizeWithFallback('generic.loading', 'Loading...')}</Text>;

        const figure = userProfile.figure;
        const banner = userProfile.bannerId ?? 0;
        const card = userProfile.cardBackgroundId ?? 0;

        switch (activeTab) {
            case 'banner':
                return (
                    <>
                        {uploadRow('banner', customBanner)}
                        <Grid gap={1} columnCount={2} className="octane-profile-customize__grid">
                            {option(0, !customBanner && banner === 0, <span className="octane-profile-customize__banner octane-profile-customize__banner--none">{noneLabel}</span>, noneLabel, () => choose({ banner: 0 }, banner, 'banner'))}
                            {data.banners.map((entry) =>
                                option(
                                    entry.id,
                                    !customBanner && entry.id === banner,
                                    <span className="octane-profile-customize__banner" style={profileGalleryBannerStyle(entry)} />,
                                    `${label('banner')} ${entry.id}`,
                                    () => choose({ banner: entry.id }, banner, 'banner')
                                )
                            )}
                        </Grid>
                    </>
                );
            case 'card':
                return (
                    <>
                        {uploadRow('background', customBackground)}
                        <Grid gap={1} columnCount={8} className="octane-profile-customize__grid">
                            {data.cards.map((id) =>
                                option(
                                    id,
                                    !customBackground && id === card,
                                    <span className={`octane-profile-customize__card profile-card-background card-background-${id}`} />,
                                    id ? `${label('card')} ${id}` : noneLabel,
                                    () => choose({ card: id }, card, 'background')
                                )
                            )}
                        </Grid>
                    </>
                );
            case 'avatar': {
                const background = userProfile.backgroundId ?? 0;
                const stand = userProfile.standId ?? 0;
                const overlay = userProfile.overlayId ?? 0;
                const previews = (ids: number[], kind: 'background' | 'stand' | 'overlay', current: number) =>
                    ids.map((id) => (
                        <ProfilePreviewView
                            key={id}
                            figure={figure}
                            backgroundId={kind === 'background' ? id : background}
                            standId={kind === 'stand' ? id : stand}
                            overlayId={kind === 'overlay' ? id : overlay}
                            selected={id === current}
                            onClick={() => choose({ [kind]: id }, current, null)}
                        />
                    ));

                return (
                    <div className="octane-profile-customize__sections">
                        {section(localizeWithFallback('extendedprofile.customize.avatar.background', 'Background'), <Grid gap={1} columnCount={8}>{previews(data.backgrounds, 'background', background)}</Grid>)}
                        {section(localizeWithFallback('extendedprofile.customize.avatar.stand', 'Stand'), <Grid gap={1} columnCount={8}>{previews(data.stands, 'stand', stand)}</Grid>)}
                        {section(localizeWithFallback('extendedprofile.customize.avatar.overlay', 'Effect'), <Grid gap={1} columnCount={8}>{previews(data.overlays, 'overlay', overlay)}</Grid>)}
                    </div>
                );
            }
            case 'border': {
                const border = userProfile.borderId ?? 0;

                return (
                    <Grid gap={1} columnCount={8} className="octane-profile-customize__grid">
                        {[0, ...data.borders.filter((id) => id > 0)].map((id) =>
                            option(id, id === border, <span className={`octane-profile-customize__border profile-border border-${id}`} />, id ? `${label('border')} ${id}` : noneLabel, () => choose({ border: id }, border, null))
                        )}
                    </Grid>
                );
            }
            case 'accent': {
                const accent = userProfile.accentId ?? 0;

                return (
                    <Grid gap={1} columnCount={7} className="octane-profile-customize__grid">
                        {option(0, accent === 0, <span className="octane-profile-customize__swatch octane-profile-customize__swatch--none" />, noneLabel, () => choose({ accent: 0 }, accent, null))}
                        {PROFILE_ACCENTS.map((entry) =>
                            option(
                                entry.id,
                                entry.id === accent,
                                <span className="octane-profile-customize__swatch" style={{ backgroundColor: entry.color }} />,
                                `${label('accent')} ${entry.id}`,
                                () => choose({ accent: entry.id }, accent, null)
                            )
                        )}
                    </Grid>
                );
            }
        }
    };

    const accentColor = getProfileAccentColor(userProfile.accentId ?? 0);

    return (
        <NativeTextTree>
            <OctaneCardView
                uniqueKey="octane-profile-customize"
                className={`octane-profile-customize w-[600px] h-[560px] max-w-[96vw] max-h-[90vh]${accentColor ? ' has-profile-accent' : ''}`}
                style={accentColor ? ({ '--profile-accent': accentColor } as CSSProperties) : undefined}
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('extendedprofile.customize.title', 'Customise profile')} onCloseClick={onClose} />
                <ProfileCustomizePreviewView userProfile={userProfile} banners={data?.banners ?? []} />
                {editing ? (
                    <OctaneCardContentView gap={1} className="overflow-auto">
                        <Text bold small>
                            {editing.kind === 'banner'
                                ? localizeWithFallback('extendedprofile.customize.upload.banner_title', 'Place your banner')
                                : localizeWithFallback('extendedprofile.customize.upload.background_title', 'Place your background')}
                        </Text>
                        <ProfileImageEditorView kind={editing.kind} image={editing.image} busy={busy} onCancel={() => setEditing(null)} onSave={saveUpload} />
                        {message && <p className="octane-profile-customize__message">{message}</p>}
                    </OctaneCardContentView>
                ) : (
                    <>
                        <OctaneCardTabsView>
                            {TABS.map((tab) => (
                                <OctaneCardTabsItemView key={tab} isActive={activeTab === tab} onClick={() => setActiveTab(tab)}>
                                    {label(tab)}
                                </OctaneCardTabsItemView>
                            ))}
                        </OctaneCardTabsView>
                        <OctaneCardContentView gap={1} className="overflow-auto">
                            {message && <p className="octane-profile-customize__message">{message}</p>}
                            {renderTab()}
                        </OctaneCardContentView>
                    </>
                )}
                <input ref={fileInput} accept={PROFILE_IMAGE_ACCEPT} className="hidden" type="file" onChange={onFile} />
            </OctaneCardView>
        </NativeTextTree>
    );
};
