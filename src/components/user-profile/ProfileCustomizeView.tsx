import { UserProfileParser } from '@octane/renderer';
import { ChangeEvent, CSSProperties, FC, ReactNode, useEffect, useRef, useState } from 'react';
import {
    findProfileBanner,
    getProfileAccentColor,
    isLightProfileAccent,
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
    resolveProfileBannerUrl,
    sendProfileCustomization,
    uploadProfileImage
} from '../../api';
import { Button, Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView, Text } from '../../common';
import { ToggleButton } from '../../common/ToggleButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ProfilePreviewView } from '../backgrounds/ProfilePreviewView';
import { ProfileAvatarFrameView } from './ProfileAvatarFrameView';
import { ProfileCustomizePreviewView } from './ProfileCustomizePreviewView';
import { ProfileImageEditorView } from './ProfileImageEditorView';

const TABS = ['banner', 'card', 'avatar', 'border', 'accent'] as const;
type ProfileCustomizeTab = (typeof TABS)[number];

const TAB_LABELS: Record<ProfileCustomizeTab, [string, string]> = {
    banner: ['extendedprofile.customize.banner', 'Banner'],
    card: ['extendedprofile.customize.background', 'Background'],
    avatar: ['extendedprofile.customize.avatar', 'Picture'],
    border: ['extendedprofile.customize.border', 'Border'],
    accent: ['extendedprofile.customize.accent', 'Theme']
};

const TAB_HINTS: Record<ProfileCustomizeTab, [string, string]> = {
    banner: ['extendedprofile.customize.banner.hint', 'Pick a picture from the gallery or upload your own. Drag the banner above to move it.'],
    card: ['extendedprofile.customize.background.hint', 'The picture or shade behind the content of your profile window. Everyone who opens your profile sees it.'],
    avatar: ['extendedprofile.customize.avatar.hint', 'What stands behind and around your character, in your profile and in the room infostand.'],
    border: ['extendedprofile.customize.border.hint', 'The frame around your character: in your profile and in the infostand when someone clicks you in a room.'],
    accent: ['extendedprofile.customize.accent.hint', 'The colour of the title bar of every window in your client, and of your profile for everyone who opens it.']
};

const AVATAR_PARTS = ['background', 'stand', 'overlay'] as const;
type AvatarPart = (typeof AVATAR_PARTS)[number];

const AVATAR_PART_LABELS: Record<AvatarPart, [string, string]> = {
    background: ['extendedprofile.customize.avatar.background', 'Background'],
    stand: ['extendedprofile.customize.avatar.stand', 'Stand'],
    overlay: ['extendedprofile.customize.avatar.overlay', 'Effect']
};

/** Card backgrounds 1-15 are colour gradients, the rest are patterns. */
const LAST_TINT_CARD = 15;
/** Borders 1-16 are plain colours, the rest are decorated frames. */
const LAST_COLOUR_BORDER = 16;

const ACCENT_NAMES: Record<number, string> = {
    1: 'Blue',
    2: 'Teal',
    3: 'Green',
    4: 'Gold',
    5: 'Orange',
    6: 'Red',
    7: 'Pink',
    8: 'Purple',
    9: 'Indigo',
    10: 'Brown',
    11: 'Grey',
    12: 'Black'
};

// The server drops a change that follows the previous one within half a second.
const SEND_COOLDOWN_MS = 600;

interface ProfileCustomizeViewProps {
    userProfile: UserProfileParser;
    onClose: () => void;
    /** Grows each time the banner of the profile window is dragged: the banner editor opens. */
    moveBannerRequest?: number;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        // The editor reads the pixels back, so a picture from another origin must allow it.
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`cannot load ${url}`));
        image.src = url;
    });

/** The own profile window's look: banner, background, picture, border and accent, from the hotel's lists or an uploaded picture. */
export const ProfileCustomizeView: FC<ProfileCustomizeViewProps> = ({ userProfile, onClose, moveBannerRequest = 0 }) => {
    const [activeTab, setActiveTab] = useState<ProfileCustomizeTab>('banner');
    const [avatarPart, setAvatarPart] = useState<AvatarPart>('background');
    const [data, setData] = useState<ProfileCustomizationData | null>(null);
    const [editing, setEditing] = useState<{ kind: ProfileImageKind; image: HTMLImageElement; pixelArt: boolean } | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const uploadKind = useRef<ProfileImageKind>('banner');
    const lastSent = useRef(0);
    const handledMoveRequest = useRef(moveBannerRequest);

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
    const galleryBanner = data ? findProfileBanner(data.banners, userProfile.bannerId ?? 0) : null;
    const hasBanner = !!customBanner || !!galleryBanner;

    const noneLabel = localizeWithFallback('extendedprofile.customize.none', 'None');
    const label = (tab: ProfileCustomizeTab) => localizeWithFallback(TAB_LABELS[tab][0], TAB_LABELS[tab][1]);
    const invalidPicture = () => localizeWithFallback('extendedprofile.customize.upload.invalid', 'Choose a PNG, JPEG, GIF or WebP picture smaller than 15 MB.');

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

    /** Opens the editor on the banner the profile shows now, uploaded or from the gallery, to move or zoom it. */
    const moveBanner = async () => {
        const url = customBanner ? profileImageUrl(customBanner) : galleryBanner ? resolveProfileBannerUrl(galleryBanner.image) : '';

        if (!url) return;

        setMessage(null);

        try {
            setEditing({ kind: 'banner', image: await loadImage(url), pixelArt: !customBanner });
        } catch {
            setMessage(localizeWithFallback('extendedprofile.customize.upload.failed', 'The picture could not be saved. Try again later.'));
        }
    };

    useEffect(() => {
        if (moveBannerRequest === handledMoveRequest.current) return;

        handledMoveRequest.current = moveBannerRequest;
        setActiveTab('banner');
        void moveBanner();
    }, [moveBannerRequest]);

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
            setMessage(invalidPicture());

            return;
        }

        const url = URL.createObjectURL(file);

        loadImage(url)
            .then((image) => setEditing({ kind: uploadKind.current, image, pixelArt: false }))
            .catch(() => setMessage(invalidPicture()))
            .finally(() => URL.revokeObjectURL(url));
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

    const option = (key: string | number, selected: boolean, content: ReactNode, name: string, onClick: () => void, caption?: string) => (
        <ToggleButton
            key={key}
            aria-label={name}
            className={`octane-profile-customize__option${selected ? ' is-selected' : ''}`}
            pressed={selected}
            disabled={busy}
            onClick={onClick}
        >
            {content}
            {caption && <span className="octane-profile-customize__caption">{caption}</span>}
        </ToggleButton>
    );

    const section = (title: string, children: ReactNode) => (
        <div className="octane-profile-customize__section">
            <Text bold small>
                {title}
            </Text>
            {children}
        </div>
    );

    const uploadRow = (kind: ProfileImageKind, custom: string, extra?: ReactNode) => (
        <div className="octane-profile-customize__upload">
            <Button variant="primary" disabled={busy} onClick={() => pickFile(kind)}>
                {localizeWithFallback('extendedprofile.customize.upload', 'Upload a picture')}
            </Button>
            {extra}
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

    /** A small profile window in the card background's colours, so a choice reads as the window it makes. */
    const cardTile = (id: number) => (
        <span className={`octane-profile-customize__card profile-card-background card-background-${id}`}>
            <span className="octane-profile-customize__card-header" />
            <span className="octane-profile-customize__card-panel" />
        </span>
    );

    /** A border tried on the user's own picture, exactly as the profile shows it. */
    const borderTile = (id: number) => (
        <span className="octane-profile-customize__border-tile">
            <ProfileAvatarFrameView
                figure={userProfile.figure}
                backgroundId={userProfile.backgroundId}
                standId={userProfile.standId}
                overlayId={userProfile.overlayId}
                borderId={id}
                scale={0.42}
            />
        </span>
    );

    const renderTab = () => {
        if (!data) return <Text small>{localizeWithFallback('generic.loading', 'Loading...')}</Text>;

        const banner = userProfile.bannerId ?? 0;
        const card = userProfile.cardBackgroundId ?? 0;

        switch (activeTab) {
            case 'banner':
                return (
                    <>
                        {uploadRow(
                            'banner',
                            customBanner,
                            hasBanner && (
                                <Button variant="secondary" disabled={busy} onClick={() => void moveBanner()}>
                                    {localizeWithFallback('extendedprofile.customize.banner.move', 'Move banner')}
                                </Button>
                            )
                        )}
                        <Grid gap={1} columnCount={2} className="octane-profile-customize__grid">
                            {option(
                                0,
                                !customBanner && banner === 0,
                                <span className="octane-profile-customize__banner octane-profile-customize__banner--none">{noneLabel}</span>,
                                noneLabel,
                                () => choose({ banner: 0 }, banner, 'banner')
                            )}
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
            case 'card': {
                const cardOption = (id: number) =>
                    option(id, !customBackground && id === card, cardTile(id), id ? `${label('card')} ${id}` : noneLabel, () => choose({ card: id }, card, 'background'));
                const tints = data.cards.filter((id) => id > 0 && id <= LAST_TINT_CARD);
                const patterns = data.cards.filter((id) => id > LAST_TINT_CARD);

                return (
                    <>
                        {uploadRow('background', customBackground)}
                        <div className="octane-profile-customize__sections">
                            {section(
                                localizeWithFallback('extendedprofile.customize.background.tints', 'Colours'),
                                <Grid gap={1} columnCount={8} className="octane-profile-customize__grid">
                                    {cardOption(0)}
                                    {tints.map(cardOption)}
                                </Grid>
                            )}
                            {patterns.length > 0 &&
                                section(
                                    localizeWithFallback('extendedprofile.customize.background.patterns', 'Patterns'),
                                    <Grid gap={1} columnCount={8} className="octane-profile-customize__grid">
                                        {patterns.map(cardOption)}
                                    </Grid>
                                )}
                        </div>
                    </>
                );
            }
            case 'avatar': {
                const current: Record<AvatarPart, number> = {
                    background: userProfile.backgroundId ?? 0,
                    stand: userProfile.standId ?? 0,
                    overlay: userProfile.overlayId ?? 0
                };
                const ids: Record<AvatarPart, number[]> = { background: data.backgrounds, stand: data.stands, overlay: data.overlays };

                return (
                    <>
                        <div className="octane-profile-customize__segments" role="group" aria-label={label('avatar')}>
                            {AVATAR_PARTS.map((part) => (
                                <ToggleButton
                                    key={part}
                                    className={`octane-profile-customize__segment${avatarPart === part ? ' is-selected' : ''}`}
                                    pressed={avatarPart === part}
                                    onClick={() => setAvatarPart(part)}
                                >
                                    {localizeWithFallback(AVATAR_PART_LABELS[part][0], AVATAR_PART_LABELS[part][1])}
                                </ToggleButton>
                            ))}
                        </div>
                        <Grid gap={1} columnCount={7} className="octane-profile-customize__grid">
                            {ids[avatarPart].map((id) => (
                                <ProfilePreviewView
                                    key={id}
                                    figure={userProfile.figure}
                                    backgroundId={avatarPart === 'background' ? id : current.background}
                                    standId={avatarPart === 'stand' ? id : current.stand}
                                    overlayId={avatarPart === 'overlay' ? id : current.overlay}
                                    selected={id === current[avatarPart]}
                                    onClick={() => choose({ [avatarPart]: id }, current[avatarPart], null)}
                                />
                            ))}
                        </Grid>
                    </>
                );
            }
            case 'border': {
                const border = userProfile.borderId ?? 0;
                const borderOption = (id: number) => option(id, id === border, borderTile(id), id ? `${label('border')} ${id}` : noneLabel, () => choose({ border: id }, border, null));
                const ids = data.borders.filter((id) => id > 0);

                return (
                    <div className="octane-profile-customize__sections">
                        {section(
                            localizeWithFallback('extendedprofile.customize.border.colours', 'Colours'),
                            <Grid gap={1} columnCount={8} className="octane-profile-customize__grid">
                                {borderOption(0)}
                                {ids.filter((id) => id <= LAST_COLOUR_BORDER).map(borderOption)}
                            </Grid>
                        )}
                        {ids.some((id) => id > LAST_COLOUR_BORDER) &&
                            section(
                                localizeWithFallback('extendedprofile.customize.border.decorated', 'Decorated'),
                                <Grid gap={1} columnCount={6} className="octane-profile-customize__grid">
                                    {ids.filter((id) => id > LAST_COLOUR_BORDER).map(borderOption)}
                                </Grid>
                            )}
                    </div>
                );
            }
            case 'accent': {
                const accent = userProfile.accentId ?? 0;
                // A small window with its title bar in the colour: what the theme changes.
                const swatch = (color: string | null) => (
                    <span className="octane-profile-customize__accent-sample">
                        <span className="octane-profile-customize__accent-bar" style={color ? { backgroundColor: color } : undefined}>
                            <span className="octane-profile-customize__accent-close" />
                        </span>
                        <span className="octane-profile-customize__accent-body" />
                    </span>
                );

                return (
                    <Grid gap={1} columnCount={4} className="octane-profile-customize__grid">
                        {option(0, accent === 0, swatch(null), noneLabel, () => choose({ accent: 0 }, accent, null), localizeWithFallback('extendedprofile.customize.accent.default', 'Standard'))}
                        {PROFILE_ACCENTS.map((entry) => {
                            const name = localizeWithFallback(`extendedprofile.customize.accent.${entry.id}`, ACCENT_NAMES[entry.id] ?? `${entry.id}`);

                            return option(entry.id, entry.id === accent, swatch(entry.color), name, () => choose({ accent: entry.id }, accent, null), name);
                        })}
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
                className={`octane-profile-customize w-[600px] h-[600px] max-w-[96vw] max-h-[90vh]${accentColor ? ' has-profile-accent' : ''}${isLightProfileAccent(userProfile.accentId ?? 0) ? ' has-light-accent' : ''}`}
                style={accentColor ? ({ '--profile-accent': accentColor } as CSSProperties) : undefined}
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('extendedprofile.customize.title', 'Customise profile')} onCloseClick={onClose} />
                <ProfileCustomizePreviewView userProfile={userProfile} banners={data?.banners ?? []} onMoveBanner={hasBanner && !editing ? () => void moveBanner() : undefined} />
                {editing ? (
                    <OctaneCardContentView gap={1} className="overflow-auto">
                        <Text bold small>
                            {editing.kind === 'banner'
                                ? localizeWithFallback('extendedprofile.customize.upload.banner_title', 'Place your banner')
                                : localizeWithFallback('extendedprofile.customize.upload.background_title', 'Place your background')}
                        </Text>
                        <ProfileImageEditorView kind={editing.kind} image={editing.image} pixelArt={editing.pixelArt} busy={busy} onCancel={() => setEditing(null)} onSave={saveUpload} />
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
                            <p className="octane-profile-customize__hint">{localizeWithFallback(TAB_HINTS[activeTab][0], TAB_HINTS[activeTab][1])}</p>
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
