import { FC, ReactNode, useId } from 'react';
import { GetUserProfile, LocalizeText, localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

/*
 * The building blocks of the phone room settings and the windows around it (room info, room creator, word filter,
 * category choice), in the Octane handheld look (HandheldRoomSettings.css). They only draw: every value and handler
 * comes from the desktop view that owns the state and the packets.
 */

/** A titled group of rows on a white card. */
export const HandheldRsSection: FC<{ title?: ReactNode; hint?: ReactNode; className?: string; children?: ReactNode }> = ({
    title = null,
    hint = null,
    className = '',
    children = null
}) => (
    <section className={`octane-handheld-rs__section ${className}`.trim()}>
        {title && <h3 className="octane-handheld-rs__section-title">{title}</h3>}
        {hint && <p className="octane-handheld-rs__section-hint">{hint}</p>}
        <div className="octane-handheld-rs__card">{children}</div>
    </section>
);

/** A labelled field: the label above, the control, then its error or hint. The label names the control. */
export const HandheldRsField: FC<{ label: ReactNode; htmlFor?: string; children?: ReactNode; className?: string }> = ({
    label,
    htmlFor,
    children = null,
    className = ''
}) => (
    <div className={`octane-handheld-rs__field ${className}`.trim()}>
        <label className="octane-handheld-rs__label" htmlFor={htmlFor}>
            {label}
        </label>
        {children}
    </div>
);

/** A refused value or a rule the field breaks, in red under it. */
export const HandheldRsError: FC<{ children?: ReactNode }> = ({ children = null }) =>
    children ? (
        <p className="octane-handheld-rs__error" role="alert">
            {children}
        </p>
    ) : null;

/** A 44 px row that is one checkbox: the whole row is its label. */
export const HandheldRsCheckRow: FC<{
    label: ReactNode;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
    children?: ReactNode;
}> = ({ label, checked, disabled = false, onChange, children = null }) => {
    const id = useId();

    return (
        <div className="octane-handheld-rs__check" data-disabled={disabled}>
            <label className="octane-handheld-rs__check-label" htmlFor={id}>
                <Checkbox aria-labelledby={`${id}-text`} checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
                <span className="octane-handheld-rs__check-text" id={`${id}-text`}>
                    {label}
                </span>
            </label>
            {children}
        </div>
    );
};

/** A 44 px row that is one choice of a group (the door modes). */
export const HandheldRsRadioRow: FC<{ name: string; label: ReactNode; checked: boolean; onSelect: () => void; children?: ReactNode }> = ({
    name,
    label,
    checked,
    onSelect,
    children = null
}) => {
    const id = useId();

    return (
        <div className="octane-handheld-rs__radio" data-checked={checked}>
            <label className="octane-handheld-rs__check-label" htmlFor={id}>
                <Radio aria-labelledby={`${id}-text`} checked={checked} id={id} name={name} onCheckedChange={onSelect} />
                <span className="octane-handheld-rs__check-text" id={`${id}-text`}>
                    {label}
                </span>
            </label>
            {children}
        </div>
    );
};

/** A person in a list (rights, friends, banned): the profile on the left, one action at the right. */
export const HandheldRsPersonCard: FC<{ userId: number; name: string; action: string; tone?: 'remove' | 'add'; onAction: () => void }> = ({
    userId,
    name,
    action,
    tone = 'remove',
    onAction
}) => (
    <div className="octane-handheld-rs__person" data-testid={`rs-person-${userId}`}>
        <BaseButton
            aria-label={`${name}: ${localizeWithFallback('octane.handheld.room_settings.open_profile', 'Open profile')}`}
            className="octane-handheld-rs__person-profile"
            onClick={() => GetUserProfile(userId)}
        >
            <span aria-hidden="true" className="octane-handheld-rs__person-mark">
                {name.charAt(0).toUpperCase()}
            </span>
            <span className="octane-handheld-rs__person-name">{name}</span>
        </BaseButton>
        <BaseButton aria-label={`${action}: ${name}`} className="octane-handheld-rs__person-action" data-tone={tone} onClick={onAction}>
            {action}
        </BaseButton>
    </div>
);

/** What a list shows while it is empty. */
export const HandheldRsEmpty: FC<{ children?: ReactNode }> = ({ children = null }) => <p className="octane-handheld-rs__empty">{children}</p>;

/** A question over the sheet as a centred card: the red action confirms, the other one goes back. */
export const HandheldRsConfirm: FC<{
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ title, message, confirmLabel, tone = 'danger', onConfirm, onCancel }) => (
    <div className="octane-handheld-rs__scrim" data-testid="rs-confirm">
        <div aria-labelledby="octane-handheld-rs-confirm-title" aria-modal="true" className="octane-handheld-rs__dialog" role="alertdialog">
            <h3 className="octane-handheld-rs__dialog-title" id="octane-handheld-rs-confirm-title">
                {title}
            </h3>
            <p className="octane-handheld-rs__dialog-text">{message}</p>
            <div className="octane-handheld-rs__dialog-actions">
                <BaseButton className="octane-handheld-rs__button is-secondary" onClick={onCancel}>
                    {LocalizeText('generic.cancel')}
                </BaseButton>
                <BaseButton className={`octane-handheld-rs__button ${tone === 'danger' ? 'is-danger' : 'is-primary'}`} onClick={onConfirm}>
                    {confirmLabel}
                </BaseButton>
            </div>
        </div>
    </div>
);

/** The round help button in the frame's header. */
export const HandheldRsHelpButton: FC<{ onClick: () => void }> = ({ onClick }) => (
    <BaseButton aria-label={localizeWithFallback('generic.help', 'Help')} className="octane-handheld-sheet__caption-button" onClick={onClick}>
        <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="M5.4 6 C5.4 4.4 6.5 3.4 8 3.4 C9.5 3.4 10.6 4.4 10.6 5.8 C10.6 7.8 8 7.8 8 10" />
            <circle cx="8" cy="12.6" r="0.6" />
        </svg>
    </BaseButton>
);

/** A chevron for rows that lead somewhere. */
export const HandheldRsChevron: FC = () => (
    <svg aria-hidden="true" className="octane-handheld-rs__chevron" viewBox="0 0 16 16">
        <path d="M6 3 L11 8 L6 13" />
    </svg>
);
