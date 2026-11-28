import { createContext, FC, ReactNode, useContext, useEffect } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

/** Where a tool window sits in the phone sheet: which page it is, whether it is in front, and the way back. */
export interface HandheldModPageContextValue {
    id: string;
    active: boolean;
    /** On its side the start page stays beside the page: no Back button then. */
    sideBySide: boolean;
    onBack: () => void;
    /** Names the page on its tab. */
    reportTitle: (id: string, title: string) => void;
}

export const HandheldModPageContext = createContext<HandheldModPageContextValue | null>(null);

/** Gives the page a tool is drawn in its name on the tabs (a user's name, a room's name); nothing outside a page. */
export const useHandheldModPageTitle = (title: string | null) => {
    const context = useContext(HandheldModPageContext);
    const id = context?.id;
    const report = context?.reportTitle;

    useEffect(() => {
        if (id && report && title) report(id, title);
    }, [id, report, title]);
};

export const HandheldModChevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-modtools__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

export const HandheldModCross: FC = () => (
    <svg aria-hidden="true" className="octane-handheld-modtools__cross" viewBox="0 0 16 16">
        <path d="M4 4 L12 12 M12 4 L4 12" />
    </svg>
);

interface HandheldModPageProps {
    title: string;
    /** A second line under the title (a ticket's category, a room's id). */
    subtitle?: string;
    /** Closes the tool, as the window's close button does on the desktop. */
    onClose?: () => void;
    /** The page's actions, in a bar at the bottom. */
    footer?: ReactNode;
    className?: string;
    children?: ReactNode;
}

/**
 * One moderator tool as a page of the phone sheet: a head with Back (upright), the tool's name and its close button, the
 * content scrolling under it and the actions in a bar at the bottom. A page that is not in front stays mounted (its data
 * and what was typed in it are kept) and is only hidden.
 */
export const HandheldModPage: FC<HandheldModPageProps> = ({ title, subtitle, onClose, footer = null, className = '', children = null }) => {
    const context = useContext(HandheldModPageContext);
    const active = context?.active ?? true;

    useHandheldModPageTitle(title);

    return (
        <NativeTextTree>
            <section aria-label={title} className={`octane-handheld-modtools__page ${className}`.trim()} data-page={context?.id} hidden={!active}>
                <div className="octane-handheld-modtools__page-head">
                    {context && !context.sideBySide && (
                        <BaseButton className="octane-handheld-modtools__back" type="button" onClick={context.onBack}>
                            <HandheldModChevron back />
                            <span>{localizeWithFallback('generic.back', 'Back')}</span>
                        </BaseButton>
                    )}
                    <div className="octane-handheld-modtools__page-name">
                        <span className="octane-handheld-modtools__page-title">{title}</span>
                        {subtitle && <span className="octane-handheld-modtools__page-subtitle">{subtitle}</span>}
                    </div>
                    {onClose && (
                        <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-modtools__page-close" type="button" onClick={onClose}>
                            <HandheldModCross />
                        </BaseButton>
                    )}
                </div>
                <div className="octane-handheld-modtools__page-body">{children}</div>
                {footer && <div className="octane-handheld-modtools__bar">{footer}</div>}
            </section>
        </NativeTextTree>
    );
};

export interface HandheldModFact {
    label: string;
    value: string;
    /** `alert`: a recent sanction (red); `muted`: nothing to tell. */
    tone?: 'alert' | 'muted';
    /** A link beside the value ("View" the records behind a count). */
    action?: { label: string; onClick: () => void };
}

/** Facts as rows: the name on the left, the value on the right, an optional link at the end. */
export const HandheldModFacts: FC<{ facts: HandheldModFact[]; testId?: string }> = ({ facts, testId }) => (
    <dl className="octane-handheld-modtools__facts" data-testid={testId}>
        {facts.map((fact) => (
            <div key={fact.label} className="octane-handheld-modtools__fact" data-tone={fact.tone}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
                {fact.action && (
                    <BaseButton className="octane-handheld-modtools__fact-link" type="button" onClick={fact.action.onClick}>
                        {fact.action.label}
                    </BaseButton>
                )}
            </div>
        ))}
    </dl>
);

interface HandheldModButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** `primary` the green one thing; `danger` what closes or sanctions; `plain` the rest. */
    tone?: 'primary' | 'danger' | 'plain';
    /** Why it cannot be used right now, shown under it while disabled. */
    hint?: string;
    testId?: string;
}

/** A finger-sized action button. A disabled one stays in place (and says why when it can). */
export const HandheldModButton: FC<HandheldModButtonProps> = ({ label, onClick, disabled = false, tone = 'plain', hint, testId }) => (
    <BaseButton className="octane-handheld-modtools__button" data-testid={testId} data-tone={tone} disabled={disabled} type="button" onClick={onClick}>
        <span className="octane-handheld-modtools__button-label">{label}</span>
        {disabled && hint && <span className="octane-handheld-modtools__button-hint">{hint}</span>}
    </BaseButton>
);

/** A grey line where there is nothing (yet) to show. */
export const HandheldModNote: FC<{ text: string }> = ({ text }) => <p className="octane-handheld-modtools__note">{text}</p>;

/** A heading over a group of cards. */
export const HandheldModHeading: FC<{ text: string; extra?: ReactNode }> = ({ text, extra = null }) => (
    <div className="octane-handheld-modtools__heading">
        <span>{text}</span>
        {extra}
    </div>
);

/** The text a page shows while its answer has not arrived. */
export const handheldModLoading = () => localizeWithFallback('octane.handheld.mod_tools.loading', 'Loading...');

/** A small rounded link (a chatlog header's Room tool / View room). */
export const HandheldModChip: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <BaseButton className="octane-handheld-modtools__chip" type="button" onClick={onClick}>
        {label}
    </BaseButton>
);
