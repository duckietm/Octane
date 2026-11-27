import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as unknown[][]);
const profileRequests = vi.hoisted(() => [] as number[]);

vi.mock('../octane', () => ({
    GetConfigurationValue: (key: string) => (key === 'images.url' ? 'https://assets/images' : null),
    GetOptionalConfigurationValue: (_key: string, value: unknown) => value,
    SendMessageComposer: (composer: { getMessageArray(): unknown[] }) => sent.push(composer.getMessageArray())
}));
vi.mock('@octane/renderer', () => ({
    KEEP_PROFILE_CUSTOMIZATION: -1,
    KEEP_PROFILE_AVATAR_POSE: -1,
    RoomUnitBackgroundComposer: class {
        private readonly data: number[];

        constructor(...data: number[]) {
            this.data = data;
        }

        getMessageArray() {
            return this.data;
        }
    }
}));
vi.mock('./GetUserProfile',() => ({ GetUserProfile: (id: number) => profileRequests.push(id) }));

import {
    customProfileAccentId,
    figureUnderOverlay,
    DEFAULT_PROFILE_BANNERS,
    findProfileBannerUrl,
    formatProfileBackgroundStyle,
    getProfileAccentColor,
    hasProfileFeature,
    isLightProfileAccent,
    parseProfileBackgroundStyle,
    parseProfileCustomizationData,
    PROFILE_FEATURE_BANNER,
    PROFILE_FEATURE_THEME,
    profileBackgroundStyleCss,
    resolveProfileBannerUrl,
    sendProfileCustomization,
    clampProfileAvatarOffset,
    normalizeProfileAvatarDirection,
    PROFILE_AVATAR_MAX_OFFSET,
    profileAvatarOffsetStyle,
    profileAvatarPose,
    profileOverlayOffsetStyle,
    rotateProfileAvatarDirection
} from './profileCustomization';

describe('parseProfileCustomizationData', () => {
    it('reads the banners, cards and borders the hotel lists', () => {
        const data = parseProfileCustomizationData({
            'banners.data': [{ bannerId: 3, image: 'reception/nl.png' }, { bannerId: 0, image: 'x.png' }, { bannerId: 4 }, { bannerId: 5, image: 'b.png', position: 'center' }],
            'cards.data': [{ backgroundId: 0 }, { backgroundId: 7 }],
            'borders.data': [1, { borderId: 17 }]
        });

        expect(data.banners).toEqual([{ id: 3, image: 'reception/nl.png' }, { id: 5, image: 'b.png', position: 'center' }]);
        expect(data.cards).toEqual([0, 7]);
        expect(data.borders).toEqual([1, 17]);
    });

    it('falls back to the hotel view pictures and the background list', () => {
        const data = parseProfileCustomizationData({ 'backgrounds.data': [{ backgroundId: 2 }] });

        expect(data.banners).toEqual(DEFAULT_PROFILE_BANNERS);
        expect(data.cards).toEqual([2]);
        expect(data.borders).toEqual([]);
        expect(data.backgrounds).toEqual([2]);
        expect(data.stands).toEqual([]);
    });
});

describe('profile banner URLs', () => {
    it('reads a relative picture below images.url and keeps full URLs', () => {
        expect(resolveProfileBannerUrl('reception/nl.png')).toBe('https://assets/images/reception/nl.png');
        expect(resolveProfileBannerUrl('https://cdn/banner.png')).toBe('https://cdn/banner.png');
        expect(resolveProfileBannerUrl('/banners/1.png')).toBe('/banners/1.png');
    });

    it('finds no picture for banner 0 or an id the list does not have', () => {
        expect(findProfileBannerUrl(DEFAULT_PROFILE_BANNERS, 0)).toBe('');
        expect(findProfileBannerUrl(DEFAULT_PROFILE_BANNERS, 999)).toBe('');
        expect(findProfileBannerUrl(DEFAULT_PROFILE_BANNERS, 1)).toBe('https://assets/images/reception/nl.png');
    });
});

describe('profile accents', () => {
    it('has no colour for the default look', () => {
        expect(getProfileAccentColor(0)).toBeNull();
        expect(getProfileAccentColor(1)).toMatch(/^#[0-9a-f]{6}$/);
    });
});

describe('sendProfileCustomization', () => {
    beforeEach(() => {
        sent.length = 0;
        profileRequests.length = 0;
    });

    it('sends the change with the infostand values as they are, then asks for the profile again', () => {
        const profile = { id: 9, backgroundId: 1, standId: 2, overlayId: 3, cardBackgroundId: 4, borderId: 5, bannerId: 6, accentId: 7 };

        sendProfileCustomization(profile as never, { banner: 2 });

        expect(sent).toEqual([[1, 2, 3, 4, 5, 2, -1, -1, 0, 0]]);
        expect(profileRequests).toEqual([9]);
    });

    it('leaves banner and accent to the server when an infostand value changes', () => {
        const profile = { id: 9, backgroundId: 1, standId: 2, overlayId: 3, cardBackgroundId: 4, borderId: 5, bannerId: 6, accentId: 7 };

        sendProfileCustomization(profile as never, { stand: 8 });

        expect(sent).toEqual([[1, 8, 3, 4, 5, -1, -1, -1, 0, 0]]);
    });

    it('sends the pose after the accent, with the server told to keep the rest', () => {
        const profile = { id: 9, backgroundId: 1, standId: 2, overlayId: 3, cardBackgroundId: 4, borderId: 5, bannerId: 6, accentId: 7 };

        sendProfileCustomization(profile as never, { pose: { direction: 5, offsetX: -3, offsetY: 40 } });

        expect(sent).toEqual([[1, 2, 3, 4, 5, -1, -1, 5, -3, PROFILE_AVATAR_MAX_OFFSET]]);
        expect(profileRequests).toEqual([9]);
    });
});

describe('own colours', () => {
    it('keeps a freely picked accent in the id and reads it back', () => {
        const id = customProfileAccentId('#FFEE00');

        expect(id).toBe(0x1000000 | 0xffee00);
        expect(getProfileAccentColor(id)).toBe('#ffee00');
        expect(isLightProfileAccent(id)).toBe(true);
        expect(customProfileAccentId('red')).toBe(0);
    });

    it('reads only a well-formed background style, and writes it back the same', () => {
        const style = parseProfileBackgroundStyle('1e7cb8;0b2a40;135;21');

        expect(style).toEqual({ from: '#1e7cb8', to: '#0b2a40', angle: 135, pattern: 21 });
        expect(formatProfileBackgroundStyle(style!)).toBe('1e7cb8;0b2a40;135;21');
        expect(profileBackgroundStyleCss(style!).backgroundImage).toBe('linear-gradient(135deg, #1e7cb8, #0b2a40)');
        expect(parseProfileBackgroundStyle('')).toBeNull();
        expect(parseProfileBackgroundStyle('1e7cb8;0b2a40;30;0')).toBeNull();
        expect(parseProfileBackgroundStyle('1e7cb8;0b2a40;0;0);url(x')).toBeNull();
    });

    it('has every feature on when the server reports none', () => {
        expect(hasProfileFeature({ features: undefined } as never, PROFILE_FEATURE_BANNER)).toBe(true);
        expect(hasProfileFeature({ features: 2 } as never, PROFILE_FEATURE_BANNER)).toBe(false);
        expect(hasProfileFeature({ features: 4 } as never, PROFILE_FEATURE_THEME)).toBe(true);
    });
});

describe('figureUnderOverlay', () => {
    const figure = 'hd-180-1.hr-828-61.ch-210-66.lg-270-82.sh-290-80.ha-1002-70.cc-260-62';

    it('takes the clothes off under an outfit effect and keeps head, hair and hat', () => {
        expect(figureUnderOverlay(figure, 7)).toBe('hd-180-1.hr-828-61.ha-1002-70');
        expect(figureUnderOverlay(figure, 8)).toBe('hd-180-1.hr-828-61.ha-1002-70');
    });

    it('leaves the figure as it is under any other effect', () => {
        expect(figureUnderOverlay(figure, 0)).toBe(figure);
        expect(figureUnderOverlay(figure, 5)).toBe(figure);
        expect(figureUnderOverlay(figure, null)).toBe(figure);
    });
});

describe('profile avatar pose', () => {
    it('keeps the avatar inside the 68 x 135 picture', () => {
        expect(PROFILE_AVATAR_MAX_OFFSET).toBe(16);
        expect(clampProfileAvatarOffset(17)).toBe(16);
        expect(clampProfileAvatarOffset(-40)).toBe(-16);
        expect(clampProfileAvatarOffset(3.6)).toBe(4);
        expect(clampProfileAvatarOffset(Number.NaN)).toBe(0);
    });

    it('turns round the eight directions', () => {
        expect(rotateProfileAvatarDirection(7, 1)).toBe(0);
        expect(rotateProfileAvatarDirection(0, -1)).toBe(7);
        expect(rotateProfileAvatarDirection(2, 3)).toBe(5);
        expect(normalizeProfileAvatarDirection(9)).toBe(2);
        expect(normalizeProfileAvatarDirection(undefined)).toBe(2);
    });

    it('reads the pose of a profile, today\'s look when the server sends none', () => {
        expect(profileAvatarPose({})).toEqual({ direction: 2, offsetX: 0, offsetY: 0 });
        expect(profileAvatarPose(null)).toEqual({ direction: 2, offsetX: 0, offsetY: 0 });
        expect(profileAvatarPose({ avatarDirection: 6, avatarOffsetX: -20, avatarOffsetY: 5 })).toEqual({ direction: 6, offsetX: -16, offsetY: 5 });
    });

    it('moves the avatar with a translate that adds to its stand transform, and only the effects drawn on it', () => {
        expect(profileAvatarOffsetStyle(0, 0)).toBeUndefined();
        expect(profileAvatarOffsetStyle(3, -2)).toEqual({ translate: '3px -2px' });
        expect(profileOverlayOffsetStyle(6, 3, -2)).toEqual({ translate: '3px -2px' });
        expect(profileOverlayOffsetStyle(1, 3, -2)).toBeUndefined();
    });
});
