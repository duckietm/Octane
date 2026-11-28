import { FC, ReactNode } from 'react';
import { LocalizeText, localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export interface HandheldGoogleAdsViewProps {
    /** The ad script element, when GoogleAdsView loads it in this page. */
    script: ReactNode;
    /** What the desktop window shows in its 300 x 250 box (the ad, its frame or a hint), unchanged. */
    children: ReactNode;
    onClose: () => void;
}

/**
 * The sponsored window on a phone (HandheldInventoryDialogs.css): a small card with the ad's 300 x 250 box at its real
 * size, a "Sponsored" label and a 44 px close button. DraggableWindow centres it in the area above the toolbar strip; on
 * its side the label and close stand in a column beside the ad, so the card stays low enough. GoogleAdsView keeps the
 * loading, the frame and the push exactly as on the desktop.
 */
export const HandheldGoogleAdsView: FC<HandheldGoogleAdsViewProps> = ({ script, children, onClose }) => {
    const label = localizeWithFallback('octane.ads.sponsored', 'Sponsored');

    return (
        <NativeTextTree>
            <DraggableWindow uniqueKey="google-ads">
                <section aria-label={label} className="octane-handheld-ads octane-google-ads" data-testid="google-ads-card">
                    {script}
                    <div className="octane-handheld-ads__head">
                        <span className="octane-handheld-ads__label">{label}</span>
                        <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-ads__close" onClick={onClose}>
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M4 4 L12 12 M12 4 L4 12" />
                            </svg>
                        </BaseButton>
                    </div>
                    <div className="octane-handheld-ads__slot">{children}</div>
                </section>
            </DraggableWindow>
        </NativeTextTree>
    );
};
