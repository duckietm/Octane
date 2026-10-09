import { FC, PropsWithChildren, ReactNode } from 'react';

/**
 * Small building blocks shared by the housekeeping tabs, so every tab uses the
 * same section frame, status pills and label/value tiles instead of repeating
 * the class lists inline.
 */

export type HousekeepingTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

const PILL_TONES: Record<HousekeepingTone, string> = {
    neutral: 'bg-zinc-100 border-zinc-200 text-zinc-600',
    info: 'bg-sky-50 border-sky-200 text-sky-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-rose-50 border-rose-200 text-rose-700',
    accent: 'bg-violet-50 border-violet-200 text-violet-700'
};

const SECTION_TONES: Record<HousekeepingTone, string> = {
    neutral: 'border-zinc-200 bg-white',
    info: 'border-sky-200 bg-sky-50/40',
    success: 'border-emerald-200 bg-emerald-50/40',
    warning: 'border-amber-200 bg-amber-50/40',
    danger: 'border-rose-200 bg-rose-50/40',
    accent: 'border-violet-200 bg-violet-50/40'
};

export const HousekeepingPill: FC<PropsWithChildren<{ tone?: HousekeepingTone; icon?: ReactNode; title?: string }>> = ({
    tone = 'neutral',
    icon,
    title,
    children
}) => (
    <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${PILL_TONES[tone]}`}
        title={title}
    >
        {icon}
        {children}
    </span>
);

export const HousekeepingSection: FC<PropsWithChildren<{ title?: string; icon?: ReactNode; tone?: HousekeepingTone; aside?: ReactNode }>> = ({
    title,
    icon,
    tone = 'neutral',
    aside,
    children
}) => (
    <section className={`flex flex-col gap-1.5 rounded-md border p-2 ${SECTION_TONES[tone]}`}>
        {(title || aside) && (
            <header className="flex items-center gap-1.5">
                {title && (
                    <h3 className="m-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        {icon}
                        {title}
                    </h3>
                )}
                {aside && <div className="ml-auto flex items-center gap-1">{aside}</div>}
            </header>
        )}
        {children}
    </section>
);

/** A label over a value, for the fact grids of the user and room cards. */
export const HousekeepingFact: FC<{ label: string; value: ReactNode; icon?: ReactNode; title?: string }> = ({ label, value, icon, title }) => (
    <div className="flex min-w-0 flex-col rounded border border-zinc-200 bg-white/80 px-1.5 py-1" title={title}>
        <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
            {icon}
            {label}
        </span>
        <span className="truncate text-xs font-semibold tabular-nums text-zinc-800">{value}</span>
    </div>
);

export const HousekeepingEmptyState: FC<PropsWithChildren<{ icon?: ReactNode }>> = ({ icon, children }) => (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-3 text-xs italic text-zinc-500">
        {icon}
        {children}
    </div>
);

/** Numeric field with its unit, used next to the timed sanction buttons. */
export const HousekeepingNumberField: FC<{
    value: number;
    onChange: (value: number) => void;
    unit?: string;
    min?: number;
    max?: number;
    label?: string;
    widthClass?: string;
}> = ({ value, onChange, unit, min = 1, max, label, widthClass = 'w-14' }) => (
    <label className="flex shrink-0 items-center gap-1">
        {label && <span className="text-[10px] font-semibold text-zinc-600">{label}</span>}
        <input
            aria-label={label ?? unit}
            className={`${widthClass} rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-sky-400`}
            max={max}
            min={min}
            type="number"
            value={Number.isFinite(value) && value > 0 ? value : ''}
            onChange={(event) => onChange(parseInt(event.target.value) || 0)}
        />
        {unit && <span className="text-[10px] text-zinc-500">{unit}</span>}
    </label>
);

export const HOUSEKEEPING_INPUT_CLASS =
    'w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 placeholder:italic placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-sky-400';

export const HousekeepingField: FC<PropsWithChildren<{ label: string; hint?: string; className?: string }>> = ({ label, hint, className = '', children }) => (
    <label className={`flex min-w-0 flex-col gap-0.5 ${className}`}>
        <span className="flex items-baseline gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            {label}
            {hint && <span className="ml-auto font-normal normal-case tracking-normal text-zinc-400">{hint}</span>}
        </span>
        {children}
    </label>
);

export type HousekeepingButtonVariant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'neutral';

const BUTTON_TONES: Record<HousekeepingButtonVariant, string> = {
    primary: 'hk-btn--primary',
    success: 'hk-btn--success',
    warning: 'hk-btn--warning',
    danger: 'hk-btn--danger',
    secondary: 'hk-btn--neutral',
    neutral: 'hk-btn--neutral'
};

/**
 * The housekeeping button. Styled in HousekeepingView.css (the card theme
 * overrides utility classes inside a card); disabled looks disabled in every tone.
 * Takes the same props the panels used with the shared Button.
 */
export const HousekeepingButton: FC<
    PropsWithChildren<{
        variant?: HousekeepingButtonVariant;
        size?: 'sm' | 'md';
        disabled?: boolean;
        title?: string;
        classNames?: string[];
        gap?: number;
        type?: 'button' | 'submit';
        onClick?: () => void;
    }>
> = ({ variant = 'primary', size = 'md', disabled = false, title, classNames = [], type = 'button', onClick, children }) => (
    <button
        className={['hk-btn', BUTTON_TONES[variant], size === 'sm' ? 'hk-btn--sm' : '', ...classNames].filter(Boolean).join(' ')}
        disabled={disabled}
        title={title}
        type={type}
        onClick={onClick}
    >
        {children}
    </button>
);
