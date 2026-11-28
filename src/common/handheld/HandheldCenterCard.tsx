import { FC, ReactNode, useId } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { BaseButton } from '../BaseButton';
import { NativeTextTree } from '../native-text/NativeTextTree';

export interface HandheldCenterCardProps {
    title: string;
    /** Closes the card from its round button; without it the card has no close button (only its own actions). */
    onClose?: () => void;
    /** Class of the module, for its own rules inside the card. */
    className?: string;
    /** Something before the title in the header (the room's or the campaign's picture). */
    icon?: ReactNode;
    /** The row of buttons at the bottom; the primary one goes last. */
    actions?: ReactNode;
    testId?: string;
    children?: ReactNode;
}

/**
 * A small question or message on a phone, in the Octane handheld look (HandheldRoomExtras.css): a centred card over a
 * dimmed screen with the deep-blue header of the sheets, the content on cream and its buttons in a row of 44 px pills
 * at the bottom. The screen under it stays as it is; the card keeps clear of the notch and the toolbar strip.
 */
export const HandheldCenterCard: FC<HandheldCenterCardProps> = (props) => {
    const { title, onClose, className = '', icon = null, actions = null, testId, children = null } = props;
    const titleId = useId();

    return (
        <NativeTextTree>
            <div className="octane-handheld-rx-scrim" data-testid={testId}>
                <div aria-labelledby={titleId} aria-modal="true" className={`octane-handheld-rx-card ${className}`.trim()} role="dialog">
                    <header className="octane-handheld-rx-card__head">
                        {icon}
                        <h3 className="octane-handheld-rx-card__title" id={titleId}>
                            {title}
                        </h3>
                        {onClose && (
                            <BaseButton
                                aria-label={localizeWithFallback('generic.close', 'Close')}
                                className="octane-handheld-rx-card__close"
                                onClick={onClose}
                            >
                                <svg aria-hidden="true" viewBox="0 0 16 16">
                                    <path d="M4 4 L12 12 M12 4 L4 12" />
                                </svg>
                            </BaseButton>
                        )}
                    </header>
                    <div className="octane-handheld-rx-card__body">{children}</div>
                    {actions && <div className="octane-handheld-rx-card__actions">{actions}</div>}
                </div>
            </div>
        </NativeTextTree>
    );
};
