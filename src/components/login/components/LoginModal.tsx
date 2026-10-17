import { FC, MouseEvent, PropsWithChildren } from 'react';
import { InlineDialog } from '../../../common/InlineDialog';
import { BaseButton } from '../../../common/BaseButton';

interface LoginModalProps extends PropsWithChildren {
    title: string;
    titleId: string;
    closeLabel: string;
    dialogClassName?: string;
    onClose: () => void;
}

export const LoginModal: FC<LoginModalProps> = ({ title, titleId, closeLabel, dialogClassName = '', onClose, children }) => {
    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onClose();
    };

    return (
        <div className="octane-login-modal" onClick={handleOverlayClick}>
            <InlineDialog
                aria-labelledby={titleId}
                aria-modal="true"
                className={`dialog ${dialogClassName}`.trim()}
                initialFocus={false}
                modal="trap-focus"
                onClose={onClose}
            >
                <div className="octane-login-card octane-card-shell">
                    <div className="card-title octane-card-header-shell">
                        <span id={titleId} className="octane-card-title">
                            {title}
                        </span>
                        <BaseButton type="button" className="octane-card-close-button" aria-label={closeLabel} onClick={onClose} />
                    </div>
                    {children}
                </div>
            </InlineDialog>
        </div>
    );
};
