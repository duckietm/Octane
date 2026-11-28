import { FC, ReactNode, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { DraggableWindow } from '../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../common/ToggleButton';
import { useHandheldLayout } from '../../../hooks/handheld/useHandheldLayout';
import { WiredPageRequests } from '../../../hooks/wired-tools/useWiredPageRequests';
import { clampInputPage, DEFAULT_PAGING_TEXT, NO_PAGE, parseInputPage, restrictPageInput, splitPagingText } from '../WiredPaging.helpers';

/** The chevron of a row that opens a page, and of the Back pill. */
export const HandheldWiredChevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-wired__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

/** The pill that leaves a page of the sheet. */
export const HandheldWiredBack: FC<{ onBack: () => void; label?: string }> = ({ onBack, label }) => (
    <BaseButton className="octane-handheld-wired__back" data-testid="wired-back" onClick={onBack}>
        <HandheldWiredChevron back />
        <span>{label ?? localizeWithFallback('generic.back', 'Back')}</span>
    </BaseButton>
);

export type HandheldWiredTone = 'plain' | 'primary' | 'danger';

interface HandheldWiredButtonProps {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    tone?: HandheldWiredTone;
    pressed?: boolean;
    className?: string;
    testId?: string;
    ariaLabel?: string;
}

/** A finger-sized pill: plain (white), primary (green) or danger (red). */
export const HandheldWiredButton: FC<HandheldWiredButtonProps> = ({
    children,
    onClick,
    disabled = false,
    tone = 'plain',
    pressed,
    className = '',
    testId,
    ariaLabel
}) => {
    const classes = `octane-handheld-wired__button is-${tone} ${className}`.trim();

    // A two-state button (highlight on / off) is a toggle; every other one a plain button.
    if (pressed !== undefined)
        return (
            <ToggleButton aria-label={ariaLabel} className={classes} data-testid={testId} disabled={disabled} pressed={pressed} onClick={onClick}>
                {children}
            </ToggleButton>
        );

    return (
        <BaseButton aria-label={ariaLabel} className={classes} data-testid={testId} disabled={disabled} onClick={onClick}>
            {children}
        </BaseButton>
    );
};

/** A white card with an optional heading and something on its right (a button). */
export const HandheldWiredCard: FC<{ title?: ReactNode; extra?: ReactNode; className?: string; children?: ReactNode; testId?: string }> = ({
    title,
    extra,
    className = '',
    children,
    testId
}) => (
    <section className={`octane-handheld-wired__card ${className}`.trim()} data-testid={testId}>
        {(title || extra) && (
            <div className="octane-handheld-wired__card-head">
                {title && <div className="octane-handheld-wired__card-title">{title}</div>}
                {extra}
            </div>
        )}
        {children}
    </section>
);

/** One "label: value" line of a card. */
export const HandheldWiredPair: FC<{ label: ReactNode; value: ReactNode; valueClassName?: string }> = ({ label, value, valueClassName = '' }) => (
    <div className="octane-handheld-wired__pair">
        <span className="octane-handheld-wired__pair-label">{label}</span>
        <span className={`octane-handheld-wired__pair-value ${valueClassName}`.trim()}>{value}</span>
    </div>
);

export interface HandheldWiredChoice<T extends string> {
    key: T;
    label: string;
    icon?: string;
    disabled?: boolean;
}

/** A row of chips of which one is chosen (the element type of the inspection and variables tabs). */
export const HandheldWiredChoices = <T extends string>({
    choices,
    value,
    onChange,
    label
}: {
    choices: HandheldWiredChoice<T>[];
    value: T;
    onChange: (key: T) => void;
    label: string;
}) => (
    <div aria-label={label} className="octane-handheld-wired__choices" role="group">
        {choices.map((choice) => (
            <ToggleButton
                key={choice.key}
                pressed={value === choice.key}
                className={`octane-handheld-wired__choice${value === choice.key ? ' is-active' : ''}`}
                data-testid={`wired-choice-${choice.key}`}
                disabled={choice.disabled}
                onClick={() => !choice.disabled && onChange(choice.key)}
            >
                {choice.icon && <img alt="" draggable={false} src={choice.icon} />}
                <span>{choice.label}</span>
            </ToggleButton>
        ))}
    </div>
);

/** A labelled field row (a select, a number) of a phone form. */
export const HandheldWiredField: FC<{ label: ReactNode; children: ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <label className={`octane-handheld-wired__field ${className}`.trim()}>
        <span className="octane-handheld-wired__field-label">{label}</span>
        {children}
    </label>
);

/** The empty line of a list. */
export const HandheldWiredEmpty: FC<{ children: ReactNode }> = ({ children }) => <div className="octane-handheld-wired__empty">{children}</div>;

interface HandheldWiredPagerProps {
    currentPage: number;
    totalEntries: number;
    lastPage: number;
    requests: WiredPageRequests;
    pagingTextKey?: string;
}

/**
 * The pager under a paged list: first / previous, the page line with its field, next / last. The same requests and
 * paging text as the desktop table (WiredPagedTable), so the rate limiter and the server's pages are shared.
 */
export const HandheldWiredPager: FC<HandheldWiredPagerProps> = ({ currentPage, totalEntries, lastPage, requests, pagingTextKey = '' }) => {
    const [pageInput, setPageInput] = useState(currentPage === NO_PAGE ? '1' : String(currentPage));

    useEffect(() => {
        setPageInput(currentPage === NO_PAGE ? '1' : String(currentPage));
    }, [currentPage]);

    const isFirst = currentPage !== NO_PAGE && currentPage <= 1;
    const isLast = currentPage !== NO_PAGE && lastPage !== NO_PAGE && currentPage >= lastPage;
    const pagingText =
        currentPage === NO_PAGE ? null : splitPagingText(localizeWithFallback(pagingTextKey, DEFAULT_PAGING_TEXT), totalEntries, Math.max(1, lastPage));

    const navigate = () => {
        const typed = parseInputPage(pageInput);
        const clamped = clampInputPage(typed, lastPage);

        if (clamped !== typed) setPageInput(String(clamped));
        if (clamped === currentPage) return;

        requests.requestPage(clamped);
    };

    const step = (label: string, disabled: boolean, onClick: () => void, path: string, testId: string) => (
        <BaseButton aria-label={label} className="octane-handheld-wired__page-step" data-testid={testId} disabled={disabled} onClick={onClick}>
            <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d={path} />
            </svg>
        </BaseButton>
    );

    return (
        <div className="octane-handheld-wired__pager" data-testid="wired-pager">
            {step(
                localizeWithFallback('octane.wired_tools.first_page', 'First page'),
                isFirst,
                () => requests.requestFirstPage(),
                'M8 3 L3 8 L8 13 M13 3 L8 8 L13 13',
                'wired-page-first'
            )}
            {step(
                localizeWithFallback('octane.wired_tools.previous_page', 'Previous page'),
                isFirst,
                () => requests.requestPreviousPage(),
                'M10 3 L5 8 L10 13',
                'wired-page-previous'
            )}
            <div className="octane-handheld-wired__page-line">
                {pagingText && <span>{pagingText.start}</span>}
                <input
                    aria-label={localizeWithFallback('octane.wired_tools.page', 'Page')}
                    className="octane-handheld-wired__page-input"
                    inputMode="numeric"
                    type="text"
                    value={pageInput}
                    onBlur={navigate}
                    onChange={(event) => setPageInput(restrictPageInput(event.target.value))}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;

                        event.preventDefault();
                        navigate();
                    }}
                />
                {pagingText && <span>{pagingText.end}</span>}
            </div>
            {step(
                localizeWithFallback('octane.wired_tools.next_page', 'Next page'),
                isLast,
                () => requests.requestNextPage(),
                'M6 3 L11 8 L6 13',
                'wired-page-next'
            )}
            {step(
                localizeWithFallback('octane.wired_tools.last_page', 'Last page'),
                isLast,
                () => requests.requestLastPage(),
                'M3 3 L8 8 L3 13 M8 3 L13 8 L8 13',
                'wired-page-last'
            )}
        </div>
    );
};

interface HandheldWiredPageProps {
    /** The desktop window's key, so a page and its window are the same window to DraggableWindow. */
    uniqueKey: string;
    title: string;
    onClose: () => void;
    /** On its side the page takes the right part of the screen, beside the list it was opened from. */
    side?: boolean;
    /** Something beside the Back pill (a Refresh button). */
    actions?: ReactNode;
    /** The page's own controls (filters): over the list upright, in a column beside it on its side. */
    aside?: ReactNode;
    className?: string;
    children?: ReactNode;
}

/**
 * A window the creator tools open over themselves (the room log, who holds a variable, a holder, a transaction, an
 * array's contents, the sandbox tool), as a page of the phone: a full-screen sheet of its own in the shared frame,
 * with a Back pill that closes it and shows what was under it again. With `side`, on its side it covers only the right
 * part of the screen, so the list it was opened from stays in view beside it (HandheldWiredTools.css).
 */
export const HandheldWiredPage: FC<HandheldWiredPageProps> = ({
    uniqueKey,
    title,
    onClose,
    side = false,
    actions = null,
    aside = null,
    className = '',
    children
}) => {
    const { orientation } = useHandheldLayout();
    // On its side the page's controls stand in a column of their own beside the list; upright they head the list.
    const asideColumn = !!aside && orientation === 'landscape' && !side;

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey={uniqueKey}>
                <HandheldSheetFrame
                    className={`octane-handheld-wired octane-handheld-wired-page${side ? ' is-side' : ''} ${className}`.trim()}
                    icon="icon-wired-tools"
                    title={title}
                    onClose={onClose}
                >
                    <div className="octane-handheld-wired__page-bar">
                        <HandheldWiredBack onBack={onClose} />
                        {actions}
                    </div>
                    <div className="octane-handheld-wired__page-body" data-aside={asideColumn}>
                        {asideColumn && <div className="octane-handheld-wired__page-aside">{aside}</div>}
                        <div className="octane-handheld-wired__scroll">
                            {!asideColumn && aside}
                            {children}
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
