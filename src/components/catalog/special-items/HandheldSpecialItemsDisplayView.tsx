import { FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { ToggleButton } from '../../../common/ToggleButton';
import { HandheldShopButton, HandheldShopSection, HandheldShopSheet } from '../views/handheld/HandheldShopDialogParts';

export interface HandheldSpecialItemsDisplayViewProps {
    title: string;
    setTitle: string;
    setDescription: string;
    /** The desktop's rotating platform (products, platform and spotlight), drawn at its own size. */
    stage: ReactNode;
    /** One dot per item: its name and whether it is the one turned to the front. */
    pages: { index: number; name: string; selected: boolean }[];
    item: { name: string; description: string; icon: ReactNode; blend: number };
    /** The free reward for having seen every item, or null when the set has none. */
    claim: { info: string; label: string; enabled: boolean; onClaim: () => void } | null;
    onPrevious: () => void;
    onNext: () => void;
    onPage: (index: number) => void;
    onClose: () => void;
}

const Chevron: FC<{ flip?: boolean }> = ({ flip = false }) => (
    <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d={flip ? 'M6 3 L11 8 L6 13' : 'M10 3 L5 8 L10 13'} />
    </svg>
);

/**
 * SpecialItemsDisplayView on a phone: the set's title and text, the turning platform with round arrows beside it and a
 * dot per item under it, the front item's plaque (icon, name, text) and the free claim in the bottom bar. On its side the
 * platform stands at the left and the texts at the right. The rotation and the claim are the desktop's hook.
 */
export const HandheldSpecialItemsDisplayView: FC<HandheldSpecialItemsDisplayViewProps> = (props) => {
    const { title, setTitle, setDescription, stage, pages, item, claim, onPrevious, onNext, onPage, onClose } = props;

    return (
        <HandheldShopSheet
            actions={
                claim ? (
                    <>
                        <span className="octane-handheld-shop-sheet__muted is-bar">{claim.info}</span>
                        <HandheldShopButton data-testid="handheld-special-items-claim" disabled={!claim.enabled} tone="primary" onClick={claim.onClaim}>
                            {claim.label}
                        </HandheldShopButton>
                    </>
                ) : null
            }
            className="octane-handheld-shop-special"
            testId="handheld-special-items"
            title={title}
            uniqueKey="special-items-display"
            onClose={onClose}
        >
            {(setTitle || setDescription) && (
                <HandheldShopSection className="octane-handheld-shop-special__intro">
                    {setTitle && <strong className="octane-handheld-shop-sheet__name">{setTitle}</strong>}
                    {setDescription && <span className="octane-handheld-shop-special__text">{setDescription}</span>}
                </HandheldShopSection>
            )}
            <div className="octane-handheld-shop-special__show">
                <div className="octane-handheld-shop-special__stage">
                    {stage}
                    <BaseButton
                        aria-label={localizeWithFallback('generic.previous', 'Previous')}
                        className="octane-handheld-shop-special__nav is-previous"
                        data-testid="handheld-special-items-previous"
                        onClick={onPrevious}
                    >
                        <Chevron />
                    </BaseButton>
                    <BaseButton
                        aria-label={localizeWithFallback('generic.next', 'Next')}
                        className="octane-handheld-shop-special__nav is-next"
                        data-testid="handheld-special-items-next"
                        onClick={onNext}
                    >
                        <Chevron flip />
                    </BaseButton>
                </div>
                <div className="octane-handheld-shop-special__dots">
                    {pages.map((page) => (
                        <ToggleButton
                            key={page.index}
                            aria-label={page.name}
                            className="octane-handheld-shop-special__dot"
                            pressed={page.selected}
                            onPressedChange={() => onPage(page.index)}
                        />
                    ))}
                </div>
            </div>
            <HandheldShopSection className="octane-handheld-shop-special__plaque">
                <div className="octane-handheld-shop-special__plaque-row" style={{ opacity: item.blend }}>
                    <div className="octane-handheld-shop-special__icon">{item.icon}</div>
                    <div className="octane-handheld-shop-special__plaque-text">
                        <strong className="octane-handheld-shop-sheet__name" data-testid="handheld-special-items-name">
                            {item.name}
                        </strong>
                        {item.description && <span className="octane-handheld-shop-special__text">{item.description}</span>}
                    </div>
                </div>
            </HandheldShopSection>
        </HandheldShopSheet>
    );
};
