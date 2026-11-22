import { UserProfileParser } from '@octane/renderer';
import { ChangeEvent, CSSProperties, FC, ReactNode, useEffect, useRef, useState } from 'react';
import {
    customProfileAccentId,
    findProfileBanner,
    forgetProfileImage,
    formatProfileBackgroundStyle,
    hasProfileFeature,
    isCustomProfileAccent,
    loadProfileLibrary,
    parseProfileBackgroundStyle,
    PROFILE_BACKGROUND_ANGLES,
    PROFILE_FEATURE_BANNER,
    PROFILE_FEATURE_THEME,
    PROFILE_FEATURE_UPLOAD,
    ProfileBackgroundStyle,
    profileBackgroundStyleCss,
    ProfileLibraryPicture,
    saveProfileBackgroundStyle,
    selectProfileImage,
    getProfileAccentColor,
    isLightProfileAccent,
    loadProfileCustomizationData,
    loadProfileOptions,
    localizeWithFallback,
    PROFILE_ACCENTS,
    PROFILE_IMAGE_ACCEPT,
    PROFILE_IMAGE_MAX_BYTES,
    PROFILE_IMAGE_MAX_SOURCE_BYTES,
    ProfileCustomizationChange,
    ProfileCustomizationData,
    ProfileImageKind,
    ProfileImagePlacement,
    profileOptionState,
    ProfileOptions,
    profileGalleryBannerStyle,
    profileImageUrl,
    removeProfileImage,
    resolveProfileBannerUrl,
    sendProfileCustomization,
    uploadProfileImage
} from '../../api';
import { Button, Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView, Text } from '../../common';
import { ToggleButton } from '../../common/ToggleButton';
import { Hint } from '../../common/Tooltip';
import { FaLock, FaTimes } from 'react-icons/fa';
import { BaseButton } from '../../common/BaseButton';
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
    card: [
        'extendedprofile.customize.background.hint',
        'The picture or shade behind the content of your profile window. Everyone who opens your profile sees it.'
    ],
    avatar: ['extendedprofile.customize.avatar.hint', 'What stands behind and around your character, in your profile and in the room infostand.'],
    border: [
        'extendedprofile.customize.border.hint',
        'The frame around your character: in your profile and in the infostand when someone clicks you in a room.'
    ],
    accent: [
        'extendedprofile.customize.accent.hint',
        'The colour of the title bar of every window in your client, and of your profile for everyone who opens it.'
    ]
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

type OptionCategory = keyof ProfileOptions['categories'];

const LOCK_FALLBACKS: Record<string, string> = {
    hc: 'Only for Habbo Club members.',
    ambassador: 'Only for ambassadors.',
    rank: 'Not available for your rank.'
};

/** The arrow of each gradient angle, as CSS reads it (0 points up). */
const ANGLE_ARROWS: Record<number, string> = {
    0: '\u2191',
    45: '\u2197',
    90: '\u2192',
    135: '\u2198',
    180: '\u2193',
    225: '\u2199',
    270: '\u2190',
    315: '\u2196'
};

const DEFAULT_STYLE: ProfileBackgroundStyle = { from: '#1e7cb8', to: '#0b2a40', angle: 135, pattern: 0 };

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
    const [options, setOptions] = useState<ProfileOptions | null>(null);
    // `gif` holds the original of an animated banner: the server places every frame where the editor says.
    const [editing, setEditing] = useState<{ kind: ProfileImageKind; image: HTMLImageElement; pixelArt: boolean; gif?: Uint8Array } | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const uploadKind = useRef<ProfileImageKind>('banner');
    const lastSent = useRef(0);
    const handledMoveRequest = useRef(moveBannerRequest);
    const [library, setLibrary] = useState<Record<ProfileImageKind, ProfileLibraryPicture[]>>({ banner: [], background: [] });
    // A delete in the library asks for a second click on the same picture.
    const [armedDelete, setArmedDelete] = useState<number | null>(null);
    const savedStyle = parseProfileBackgroundStyle(userProfile.backgroundStyle);
    const [styleDraft, setStyleDraft] = useState<ProfileBackgroundStyle>(() => savedStyle ?? DEFAULT_STYLE);
    const [accentDraft, setAccentDraft] = useState(() => getProfileAccentColor(userProfile.accentId ?? 0) ?? '#1e7cb8');
    const canBanner = hasProfileFeature(userProfile, PROFILE_FEATURE_BANNER);
    const canUpload = hasProfileFeature(userProfile, PROFILE_FEATURE_UPLOAD);
    const canTheme = hasProfileFeature(userProfile, PROFILE_FEATURE_THEME);
    const tabs = TABS.filter((tab) => (tab !== 'banner' || canBanner) && (tab !== 'accent' || canTheme));
    const shownTab = tabs.includes(activeTab) ? activeTab : tabs[0];

    useEffect(() => {
        let cancelled = false;

        loadProfileCustomizationData().then((loaded) => {
            if (!cancelled) setData(loaded);
        });
        loadProfileOptions().then((loaded) => {
            if (!cancelled) setOptions(loaded);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const customBanner = userProfile.bannerImage ?? '';
    const customBackground = userProfile.backgroundImage ?? '';

    // The user's earlier uploads, read again whenever the picture on the profile changes.
    useEffect(() => {
        if (!canUpload) return;

        let cancelled = false;

        Promise.all([loadProfileLibrary('banner'), loadProfileLibrary('background')]).then(([banner, background]) => {
            if (!cancelled) setLibrary({ banner, background });
        });

        return () => {
            cancelled = true;
        };
    }, [canUpload, customBanner, customBackground]);
    const galleryBanner = data ? findProfileBanner(data.banners, userProfile.bannerId ?? 0) : null;
    const hasBanner = !!customBanner || !!galleryBanner;

    const noneLabel = localizeWithFallback('extendedprofile.customize.none', 'None');
    const label = (tab: ProfileCustomizeTab) => localizeWithFallback(TAB_LABELS[tab][0], TAB_LABELS[tab][1]);
    const invalidPicture = () =>
        localizeWithFallback('extendedprofile.customize.upload.invalid', 'Choose a PNG, JPEG, GIF or WebP picture smaller than 15 MB.');

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

        // The own style is drawn over the gallery background: picking one from the gallery clears it.
        if (replaces === 'background' && savedStyle) await saveProfileBackgroundStyle('');

        send(change);
    };

    const report = (result: { ok: true } | { ok: false; message: string }) => setMessage('message' in result ? result.message : null);

    const pickFromLibrary = async (kind: ProfileImageKind, picture: ProfileLibraryPicture) => {
        setBusy(true);
        report(await selectProfileImage(kind, picture.id));
        setBusy(false);
    };

    const deleteFromLibrary = async (kind: ProfileImageKind, picture: ProfileLibraryPicture) => {
        if (armedDelete !== picture.id) {
            setArmedDelete(picture.id);

            return;
        }

        setArmedDelete(null);
        setBusy(true);
        report(await forgetProfileImage(kind, picture.id));
        setLibrary((current) => ({ ...current, [kind]: current[kind].filter((entry) => entry.id !== picture.id) }));
        setBusy(false);
    };

    /** Saves the own background; an uploaded one would cover it, so that one goes back to the library first. */
    const applyStyle = async (style: ProfileBackgroundStyle | null) => {
        setBusy(true);

        if (style && customBackground) await removeProfileImage('background');

        report(await saveProfileBackgroundStyle(style ? formatProfileBackgroundStyle(style) : ''));
        setBusy(false);
    };

    /** Opens the editor on the banner the profile shows now, uploaded or from the gallery, to move or zoom it. */
    const moveBanner = async () => {
        const url = customBanner ? profileImageUrl(customBanner) : galleryBanner ? resolveProfileBannerUrl(galleryBanner.image) : '';

        if (!url) return;

        setMessage(null);

        try {
            // An animated banner is moved from its saved GIF, so it stays animated.
            const animated = customBanner.endsWith('.gif');
            const [image, original] = await Promise.all([
                loadImage(url),
                animated ? fetch(url).then((response) => response.arrayBuffer()) : Promise.resolve(null)
            ]);

            setEditing({ kind: 'banner', image, pixelArt: !customBanner, gif: original ? new Uint8Array(original) : undefined });
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

        const kind = uploadKind.current;
        const animated = kind === 'banner' && file.type === 'image/gif';

        // An animated banner is sent as it is, so it must fit the upload by itself.
        if (animated && file.size > PROFILE_IMAGE_MAX_BYTES) {
            setMessage(localizeWithFallback('extendedprofile.customize.upload.gif_too_large', 'An animated banner can be at most 450 KB.'));

            return;
        }

        const url = URL.createObjectURL(file);

        Promise.all([loadImage(url), animated ? file.arrayBuffer() : Promise.resolve(null)])
            .then(([image, original]) => setEditing({ kind, image, pixelArt: false, gif: original ? new Uint8Array(original) : undefined }))
            .catch(() => setMessage(invalidPicture()))
            // A GIF keeps playing from its address while it is placed; a still is read at once.
            .finally(() => !animated && URL.revokeObjectURL(url));
    };

    const saveUpload = async (bytes: Uint8Array | null, placement: ProfileImagePlacement & { pixelated: boolean }) => {
        if (!editing) return;

        setBusy(true);

        const result = editing.gif ? await uploadProfileImage(editing.kind, editing.gif, placement) : await uploadProfileImage(editing.kind, bytes);

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

    /** Why a choice is locked, as the user reads it. */
    const lockText = (reason: string) => localizeWithFallback(`extendedprofile.customize.locked.${reason}`, LOCK_FALLBACKS[reason] ?? LOCK_FALLBACKS.rank);

    /**
     * One choice. With `category` the hotel's rules apply: a choice the hotel does not list is not shown, and one the
     * user may not pick (HC, rank, ambassador) shows a lock and why, instead of being silently ignored by the server.
     */
    const option = (
        key: string | number,
        selected: boolean,
        content: ReactNode,
        name: string,
        onClick: () => void,
        caption?: string,
        category?: OptionCategory
    ) => {
        const state = category ? profileOptionState(options, category, Number(key)) : { hidden: false, lock: null };

        if (state.hidden) return null;

        const button = (
            <ToggleButton
                key={key}
                aria-label={state.lock ? `${name} - ${lockText(state.lock)}` : name}
                className={`octane-profile-customize__option${selected ? ' is-selected' : ''}${state.lock ? ' is-locked' : ''}`}
                pressed={selected}
                disabled={busy || !!state.lock}
                onClick={onClick}
            >
                {content}
                {caption && <span className="octane-profile-customize__caption">{caption}</span>}
                {state.lock && (
                    <span className="octane-profile-customize__lock">
                        <FaLock size={9} />
                        {state.lock === 'hc' ? 'HC' : ''}
                    </span>
                )}
            </ToggleButton>
        );

        return state.lock ? (
            <Hint key={key} content={lockText(state.lock)}>
                {button}
            </Hint>
        ) : (
            button
        );
    };

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
            {canUpload && (
                <Button variant="primary" disabled={busy} onClick={() => pickFile(kind)}>
                    {localizeWithFallback('extendedprofile.customize.upload', 'Upload a picture')}
                </Button>
            )}
            {extra}
            {custom && (
                <Button variant="danger" disabled={busy} onClick={() => removeUpload(kind)}>
                    {localizeWithFallback('extendedprofile.customize.upload.remove', 'Remove picture')}
                </Button>
            )}
        </div>
    );

    /** The user's earlier uploads of one kind: a click puts one back, the cross deletes it (a second click confirms). */
    const librarySection = (kind: ProfileImageKind, current: string) =>
        canUpload &&
        library[kind].length > 0 &&
        section(
            localizeWithFallback('extendedprofile.customize.library', 'Your pictures'),
            <Grid
                gap={1}
                columnCount={kind === 'banner' ? 2 : 6}
                fullHeight={false}
                className={`octane-profile-customize__grid${kind === 'banner' ? ' octane-profile-customize__grid--wide' : ''}`}
            >
                {library[kind].map((picture) => {
                    const deleteLabel =
                        armedDelete === picture.id
                            ? localizeWithFallback('extendedprofile.customize.library.delete.confirm', 'Click again to delete it for good')
                            : localizeWithFallback('extendedprofile.customize.library.delete', 'Delete this picture');

                    return (
                        <span key={picture.id} className="octane-profile-customize__library-item">
                            {option(
                                `library-${picture.id}`,
                                picture.file === current,
                                <span
                                    className={`octane-profile-customize__library-picture octane-profile-customize__library-picture--${kind}`}
                                    style={{ backgroundImage: `url(${profileImageUrl(picture.file)})` }}
                                />,
                                localizeWithFallback('extendedprofile.customize.library', 'Your pictures'),
                                () => picture.file !== current && void pickFromLibrary(kind, picture)
                            )}
                            <Hint content={deleteLabel}>
                                <BaseButton
                                    aria-label={deleteLabel}
                                    className={`octane-profile-customize__library-delete${armedDelete === picture.id ? ' is-armed' : ''}`}
                                    disabled={busy}
                                    onClick={() => void deleteFromLibrary(kind, picture)}
                                >
                                    <FaTimes size={9} />
                                </BaseButton>
                            </Hint>
                        </span>
                    );
                })}
            </Grid>
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
                scale={0.5}
            />
        </span>
    );

    const renderTab = () => {
        if (!data) return <Text small>{localizeWithFallback('generic.loading', 'Loading...')}</Text>;

        const banner = userProfile.bannerId ?? 0;
        const card = userProfile.cardBackgroundId ?? 0;

        switch (shownTab) {
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
                        {librarySection('banner', customBanner)}
                        <Grid gap={1} columnCount={2} fullHeight={false} className="octane-profile-customize__grid octane-profile-customize__grid--wide">
                            {option(
                                0,
                                !customBanner && banner === 0,
                                <span className="octane-profile-customize__banner octane-profile-customize__banner--none">{noneLabel}</span>,
                                noneLabel,
                                () => choose({ banner: 0 }, banner, 'banner'),
                                undefined,
                                'banner'
                            )}
                            {data.banners.map((entry) =>
                                option(
                                    entry.id,
                                    !customBanner && entry.id === banner,
                                    <span className="octane-profile-customize__banner" style={profileGalleryBannerStyle(entry)} />,
                                    `${label('banner')} ${entry.id}`,
                                    () => choose({ banner: entry.id }, banner, 'banner'),
                                    undefined,
                                    'banner'
                                )
                            )}
                        </Grid>
                    </>
                );
            case 'card': {
                const cardOption = (id: number) =>
                    option(
                        id,
                        !customBackground && !savedStyle && id === card,
                        cardTile(id),
                        id ? `${label('card')} ${id}` : noneLabel,
                        () => (savedStyle && id === card ? void applyStyle(null) : choose({ card: id }, card, 'background')),
                        undefined,
                        'card'
                    );
                const tints = data.cards.filter((id) => id > 0 && id <= LAST_TINT_CARD);
                const patterns = data.cards
                    .filter((id) => id > LAST_TINT_CARD)
                    .filter((id) => !profileOptionState(options, 'card', id).hidden && !profileOptionState(options, 'card', id).lock);
                const styleActive = !customBackground && !!savedStyle && formatProfileBackgroundStyle(savedStyle) === formatProfileBackgroundStyle(styleDraft);

                return (
                    <>
                        {uploadRow('background', customBackground)}
                        <div className="octane-profile-customize__sections">
                            {librarySection('background', customBackground)}
                            {section(
                                localizeWithFallback('extendedprofile.customize.style', 'Your own style'),
                                <div className="octane-profile-customize__style">
                                    <span className="octane-profile-customize__style-preview" style={profileBackgroundStyleCss(styleDraft)}>
                                        {styleDraft.pattern > 0 && (
                                            <span
                                                className={`octane-profile-customize__style-pattern profile-card-background card-background-${styleDraft.pattern}`}
                                            />
                                        )}
                                        <span className="octane-profile-customize__card-header" />
                                        <span className="octane-profile-customize__card-panel" />
                                    </span>
                                    <div className="octane-profile-customize__style-controls">
                                        <div className="octane-profile-customize__style-row">
                                            <label className="octane-profile-customize__colour">
                                                <input
                                                    type="color"
                                                    value={styleDraft.from}
                                                    onChange={(event) => setStyleDraft((draft) => ({ ...draft, from: event.target.value }))}
                                                />
                                                {localizeWithFallback('extendedprofile.customize.style.from', 'Colour 1')}
                                            </label>
                                            <label className="octane-profile-customize__colour">
                                                <input
                                                    type="color"
                                                    value={styleDraft.to}
                                                    onChange={(event) => setStyleDraft((draft) => ({ ...draft, to: event.target.value }))}
                                                />
                                                {localizeWithFallback('extendedprofile.customize.style.to', 'Colour 2')}
                                            </label>
                                        </div>
                                        <div
                                            className="octane-profile-customize__style-row"
                                            role="group"
                                            aria-label={localizeWithFallback('extendedprofile.customize.style.angle', 'Direction')}
                                        >
                                            {PROFILE_BACKGROUND_ANGLES.map((angle) => (
                                                <ToggleButton
                                                    key={angle}
                                                    aria-label={`${localizeWithFallback('extendedprofile.customize.style.angle', 'Direction')} ${angle}`}
                                                    className={`octane-profile-customize__angle${styleDraft.angle === angle ? ' is-selected' : ''}`}
                                                    pressed={styleDraft.angle === angle}
                                                    onClick={() => setStyleDraft((draft) => ({ ...draft, angle }))}
                                                >
                                                    {ANGLE_ARROWS[angle]}
                                                </ToggleButton>
                                            ))}
                                        </div>
                                        {patterns.length > 0 && (
                                            <div
                                                className="octane-profile-customize__style-patterns"
                                                role="group"
                                                aria-label={localizeWithFallback('extendedprofile.customize.style.pattern', 'Pattern')}
                                            >
                                                {[0, ...patterns].map((id) => (
                                                    <ToggleButton
                                                        key={id}
                                                        aria-label={
                                                            id
                                                                ? `${localizeWithFallback('extendedprofile.customize.style.pattern', 'Pattern')} ${id}`
                                                                : noneLabel
                                                        }
                                                        className={`octane-profile-customize__pattern${styleDraft.pattern === id ? ' is-selected' : ''}${id ? ` profile-card-background card-background-${id}` : ' octane-profile-customize__pattern--none'}`}
                                                        pressed={styleDraft.pattern === id}
                                                        onClick={() => setStyleDraft((draft) => ({ ...draft, pattern: id }))}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <div className="octane-profile-customize__style-row">
                                            <Button variant="success" disabled={busy || styleActive} onClick={() => void applyStyle(styleDraft)}>
                                                {localizeWithFallback('extendedprofile.customize.style.apply', 'Apply style')}
                                            </Button>
                                            {savedStyle && (
                                                <Button variant="secondary" disabled={busy} onClick={() => void applyStyle(null)}>
                                                    {localizeWithFallback('extendedprofile.customize.style.remove', 'Remove style')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {section(
                                localizeWithFallback('extendedprofile.customize.background.tints', 'Colours'),
                                <Grid gap={1} columnCount={8} fullHeight={false} className="octane-profile-customize__grid">
                                    {cardOption(0)}
                                    {tints.map(cardOption)}
                                </Grid>
                            )}
                            {patterns.length > 0 &&
                                section(
                                    localizeWithFallback('extendedprofile.customize.background.patterns', 'Patterns'),
                                    <Grid gap={1} columnCount={8} fullHeight={false} className="octane-profile-customize__grid">
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
                        <Grid gap={1} columnCount={7} fullHeight={false} className="octane-profile-customize__grid">
                            {ids[avatarPart].map((id) => {
                                const state = profileOptionState(options, avatarPart, id);

                                if (state.hidden) return null;

                                const preview = (
                                    <ProfilePreviewView
                                        key={id}
                                        figure={userProfile.figure}
                                        backgroundId={avatarPart === 'background' ? id : current.background}
                                        standId={avatarPart === 'stand' ? id : current.stand}
                                        overlayId={avatarPart === 'overlay' ? id : current.overlay}
                                        selected={id === current[avatarPart]}
                                        onClick={state.lock ? undefined : () => choose({ [avatarPart]: id }, current[avatarPart], null)}
                                    />
                                );

                                return state.lock ? (
                                    <Hint key={id} content={lockText(state.lock)}>
                                        <span className="octane-profile-customize__locked-preview">
                                            {preview}
                                            <span className="octane-profile-customize__lock">
                                                <FaLock size={9} />
                                                {state.lock === 'hc' ? 'HC' : ''}
                                            </span>
                                        </span>
                                    </Hint>
                                ) : (
                                    preview
                                );
                            })}
                        </Grid>
                    </>
                );
            }
            case 'border': {
                const border = userProfile.borderId ?? 0;
                const borderOption = (id: number) =>
                    option(
                        id,
                        id === border,
                        borderTile(id),
                        id ? `${label('border')} ${id}` : noneLabel,
                        () => choose({ border: id }, border, null),
                        undefined,
                        'border'
                    );
                const ids = data.borders.filter((id) => id > 0);

                return (
                    <div className="octane-profile-customize__sections">
                        {section(
                            localizeWithFallback('extendedprofile.customize.border.colours', 'Colours'),
                            <Grid gap={1} columnCount={7} fullHeight={false} className="octane-profile-customize__grid">
                                {borderOption(0)}
                                {ids.filter((id) => id <= LAST_COLOUR_BORDER).map(borderOption)}
                            </Grid>
                        )}
                        {ids.some((id) => id > LAST_COLOUR_BORDER) &&
                            section(
                                localizeWithFallback('extendedprofile.customize.border.decorated', 'Decorated'),
                                <Grid gap={1} columnCount={7} fullHeight={false} className="octane-profile-customize__grid">
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

                const ownAccent = customProfileAccentId(accentDraft);

                return (
                    <div className="octane-profile-customize__sections">
                        {section(
                            localizeWithFallback('extendedprofile.customize.accent.custom', 'Your colour'),
                            <div className="octane-profile-customize__style-row">
                                <span className={`octane-profile-customize__own-accent${isCustomProfileAccent(accent) ? ' is-selected' : ''}`}>
                                    {swatch(accentDraft)}
                                </span>
                                <label className="octane-profile-customize__colour">
                                    <input type="color" value={accentDraft} onChange={(event) => setAccentDraft(event.target.value)} />
                                    {localizeWithFallback('extendedprofile.customize.accent.custom.pick', 'Pick a colour')}
                                </label>
                                <Button
                                    variant="success"
                                    disabled={busy || !ownAccent || ownAccent === accent}
                                    onClick={() => choose({ accent: ownAccent }, accent, null)}
                                >
                                    {localizeWithFallback('extendedprofile.customize.accent.custom.apply', 'Apply colour')}
                                </Button>
                            </div>
                        )}
                        {section(
                            localizeWithFallback('extendedprofile.customize.accent.palette', 'Ready-made'),
                            <Grid gap={1} columnCount={4} fullHeight={false} className="octane-profile-customize__grid">
                                {option(
                                    0,
                                    accent === 0,
                                    swatch(null),
                                    noneLabel,
                                    () => choose({ accent: 0 }, accent, null),
                                    localizeWithFallback('extendedprofile.customize.accent.default', 'Standard')
                                )}
                                {PROFILE_ACCENTS.map((entry) => {
                                    const name = localizeWithFallback(`extendedprofile.customize.accent.${entry.id}`, ACCENT_NAMES[entry.id] ?? `${entry.id}`);

                                    return option(
                                        entry.id,
                                        entry.id === accent,
                                        swatch(entry.color),
                                        name,
                                        () => choose({ accent: entry.id }, accent, null),
                                        name,
                                        'accent'
                                    );
                                })}
                            </Grid>
                        )}
                    </div>
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
                {canBanner && (
                    <ProfileCustomizePreviewView
                        userProfile={userProfile}
                        banners={data?.banners ?? []}
                        onMoveBanner={hasBanner && !editing ? () => void moveBanner() : undefined}
                    />
                )}
                {editing ? (
                    <OctaneCardContentView gap={1} className="overflow-auto">
                        <Text bold small>
                            {editing.kind === 'banner'
                                ? localizeWithFallback('extendedprofile.customize.upload.banner_title', 'Place your banner')
                                : localizeWithFallback('extendedprofile.customize.upload.background_title', 'Place your background')}
                        </Text>
                        <ProfileImageEditorView
                            kind={editing.kind}
                            image={editing.image}
                            pixelArt={editing.pixelArt}
                            animated={!!editing.gif}
                            busy={busy}
                            onCancel={() => setEditing(null)}
                            onSave={saveUpload}
                        />
                        {message && <p className="octane-profile-customize__message">{message}</p>}
                    </OctaneCardContentView>
                ) : (
                    <>
                        <OctaneCardTabsView>
                            {tabs.map((tab) => (
                                <OctaneCardTabsItemView key={tab} isActive={shownTab === tab} onClick={() => setActiveTab(tab)}>
                                    {label(tab)}
                                </OctaneCardTabsItemView>
                            ))}
                        </OctaneCardTabsView>
                        <OctaneCardContentView gap={1} className="overflow-auto">
                            <p className="octane-profile-customize__hint">{localizeWithFallback(TAB_HINTS[shownTab][0], TAB_HINTS[shownTab][1])}</p>
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
