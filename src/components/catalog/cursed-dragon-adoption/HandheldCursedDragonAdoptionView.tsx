import { FC, ReactNode } from 'react';
import { HandheldShopButton, HandheldShopSection, HandheldShopSheet } from '../views/handheld/HandheldShopDialogParts';

export interface HandheldCursedDragonChoice {
    side: 'blue' | 'purple';
    name: string;
    /** The dragon on its crate, drawn by the desktop's pet image view. */
    pet: ReactNode;
    onAdopt: () => void;
}

export interface HandheldCursedDragonAdoptionViewProps {
    title: string;
    eyebrow: string;
    introTitle: string;
    introBody: string;
    hint: string;
    choices: HandheldCursedDragonChoice[];
    adoptLabel: string;
    disabled: boolean;
    onClose: () => void;
}

/**
 * CursedDragonAdoptionView on a phone: the story on a card of the cave's art, then the two dragons, each on its crate with
 * its name and a green Adopt (or the disabled Adopted once one was chosen). Upright the dragons stand side by side under
 * the story; on its side the story is at the left. The confirmation and the claim are the desktop's.
 */
export const HandheldCursedDragonAdoptionView: FC<HandheldCursedDragonAdoptionViewProps> = (props) => {
    const { title, eyebrow, introTitle, introBody, hint, choices, adoptLabel, disabled, onClose } = props;

    return (
        <HandheldShopSheet
            className="octane-handheld-shop-dragon"
            icon="icon-catalog"
            testId="handheld-cursed-dragon"
            title={title}
            uniqueKey="cursed-dragon-adoption"
            onClose={onClose}
        >
            <div className="octane-handheld-shop-dragon__story">
                <span className="octane-handheld-shop-dragon__eyebrow">{eyebrow}</span>
                <strong className="octane-handheld-shop-dragon__title">{introTitle}</strong>
                <span className="octane-handheld-shop-dragon__body">{introBody}</span>
                <span aria-hidden="true" className="octane-handheld-shop-dragon__frank" />
            </div>
            <div className="octane-handheld-shop-dragon__pick">
                <span className="octane-handheld-shop-sheet__label">{hint}</span>
                <div className="octane-handheld-shop-dragon__choices">
                    {choices.map((choice) => (
                        <HandheldShopSection key={choice.side} className={`octane-handheld-shop-dragon__choice is-${choice.side}`}>
                            <div className="octane-handheld-shop-dragon__crate">
                                <span aria-hidden="true" className="octane-handheld-shop-dragon__package" />
                                <div className="octane-handheld-shop-dragon__pet">{choice.pet}</div>
                            </div>
                            <strong className="octane-handheld-shop-dragon__name">{choice.name}</strong>
                            <HandheldShopButton
                                data-testid={`handheld-dragon-adopt-${choice.side}`}
                                disabled={disabled}
                                tone="primary"
                                onClick={choice.onAdopt}
                            >
                                {adoptLabel}
                            </HandheldShopButton>
                        </HandheldShopSection>
                    ))}
                </div>
            </div>
        </HandheldShopSheet>
    );
};
