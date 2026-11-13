import { MysteryBoxKeysUpdateEvent } from '@octane/renderer';
import { CSSProperties, FC, useState } from 'react';
import { ColorUtils, GetOptionalConfigurationValue, LocalizeText, OpenUrl } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useOctaneEvent } from '../../../../hooks';

/** Official MysteryBoxToolbarExtension.KEY_COLORS: the tint of a box or key of each colour. */
const COLORS: Record<string, number> = {
    purple: 9452386,
    blue: 3891856,
    green: 6459451,
    yellow: 10658089,
    lilac: 6897548,
    orange: 10841125,
    turquoise: 2661026,
    red: 10104881
};

const MINIMISED_KEY = 'octane.mysterybox.tracker.minimised';

const readMinimised = (): boolean => {
    try {
        return window.localStorage.getItem(MINIMISED_KEY) === 'true';
    } catch {
        return false;
    }
};

const tintOf = (colour: string): CSSProperties => ({ '--octane-mysterybox-tint': ColorUtils.int2rgb(COLORS[colour] ?? 0xffffff) }) as CSSProperties;

/**
 * Official mystery_box_toolbar_extension (192 x 137, 25 minimised): the colours of the player's box and key, each
 * a tinted base under its overlay, with the link to the explanation below. Minimised it keeps a small box and key
 * in its title bar, and it remembers that state.
 */
export const MysteryBoxExtensionView: FC<{}> = () => {
    const [minimised, setMinimised] = useState<boolean>(readMinimised);
    const [keyColor, setKeyColor] = useState<string>('');
    const [boxColor, setBoxColor] = useState<string>('');

    useOctaneEvent<MysteryBoxKeysUpdateEvent>(MysteryBoxKeysUpdateEvent.MYSTERY_BOX_KEYS_UPDATE, (event) => {
        setKeyColor((event.keyColor ?? '').toLowerCase());
        setBoxColor((event.boxColor ?? '').toLowerCase());
    });

    // The explanation that ships with the client, unless the hotel names its own page; an empty value hides the link.
    const faqUrl = GetOptionalConfigurationValue<string>('mysterybox.faq.url', 'habbopages/mysterybox/faq');

    if (keyColor === '' && boxColor === '') return null;

    const toggle = () => {
        const next = !minimised;

        setMinimised(next);

        try {
            window.localStorage.setItem(MINIMISED_KEY, String(next));
        } catch {
            // The state is a convenience only.
        }
    };

    return (
        <NativeTextTree>
            <div className={`octane-mysterybox-tracker${minimised ? ' is-minimised' : ''}`}>
                <div className="octane-mysterybox-tracker__head">
                    <span className="octane-mysterybox-tracker__title">{LocalizeText('mysterybox.tracker.title')}</span>
                    {minimised && !!boxColor && <i className="octane-mysterybox-tracker__small is-box" style={tintOf(boxColor)} />}
                    {minimised && !!keyColor && <i className="octane-mysterybox-tracker__small is-key" style={tintOf(keyColor)} />}
                    <BaseButton
                        aria-expanded={!minimised}
                        aria-label={LocalizeText('mysterybox.tracker.title')}
                        className={`octane-mysterybox-tracker__fold${minimised ? ' is-minimised' : ''}`}
                        onClick={toggle}
                    />
                </div>
                {!minimised && (
                    <div className="octane-mysterybox-tracker__body">
                        <div className="octane-mysterybox-tracker__description">{LocalizeText('mysterybox.tracker.description')}</div>
                        <div className="octane-mysterybox-tracker__slots">
                            <div className="octane-mysterybox-tracker__slot" title={boxColor ? LocalizeText(`mysterybox.tracker.box.${boxColor}`) : undefined}>
                                {!!boxColor && (
                                    <>
                                        <i className="octane-mysterybox-tracker__base is-box" style={tintOf(boxColor)} />
                                        <i className="octane-mysterybox-tracker__overlay is-box" />
                                    </>
                                )}
                            </div>
                            <div className="octane-mysterybox-tracker__slot" title={keyColor ? LocalizeText(`mysterybox.tracker.key.${keyColor}`) : undefined}>
                                {!!keyColor && (
                                    <>
                                        <i className="octane-mysterybox-tracker__base is-key" style={tintOf(keyColor)} />
                                        <i className="octane-mysterybox-tracker__overlay is-key" />
                                    </>
                                )}
                            </div>
                        </div>
                        {!!faqUrl && (
                            <BaseButton className="octane-mysterybox-faq-link" onClick={() => OpenUrl(faqUrl)}>
                                {LocalizeText('mysterybox.tracker.link')}
                            </BaseButton>
                        )}
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
