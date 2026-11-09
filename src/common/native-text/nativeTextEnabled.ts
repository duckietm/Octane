import { GetConfigurationValue } from '../../api/octane/GetConfigurationValue';

let forced: boolean | null = null;

/** Tests turn the native labels on (jsdom has no canvas, so they are off there by default); null restores the default. */
export const forceNativeTextEnabled = (value: boolean | null) => {
    forced = value;
};

/**
 * Whether labels are drawn with AIR's native text renderer. `ui.native.text.enabled` (default true) turns it off for the whole
 * client, e.g. for slow devices; jsdom never draws them.
 */
export const isNativeTextEnabled = () => {
    if (forced !== null) return forced;
    if (typeof navigator === 'undefined' || /jsdom/i.test(navigator.userAgent)) return false;

    return GetConfigurationValue<boolean>('ui.native.text.enabled', true) !== false;
};
