import { FC, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { LocalizeText } from '../../api';
import { useHousekeepingStore } from '../../hooks';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';

const localizeOrPassthrough = (key: string | null): string => {
    if (!key) return '';
    if (!key.includes('.')) return key;

    const localized = LocalizeText(key);

    return localized === key ? key : localized;
};

const AUTO_DISMISS_MS = 4000;

export const HousekeepingStatusBanner: FC = () => {
    const { lastError, lastSuccess, clearStatus, isActionPending } = useHousekeepingStore();
    const visible = !!(lastError || lastSuccess);

    useEffect(() => {
        if (!lastSuccess) return;

        const handle = window.setTimeout(() => clearStatus(), AUTO_DISMISS_MS);

        return () => window.clearTimeout(handle);
    }, [lastSuccess, clearStatus]);

    if (!visible && !isActionPending) return null;

    if (isActionPending && !visible) {
        return (
            <div className="flex items-center gap-2 px-2 py-1 text-xs bg-zinc-100 border-y border-zinc-200 text-zinc-700">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                <span>{LocalizeText('housekeeping.action.pending')}</span>
            </div>
        );
    }

    const isError = !!lastError;
    const message = localizeOrPassthrough(lastError ?? lastSuccess);
    const tone = isError ? 'bg-rose-100 border-rose-200 text-rose-900' : 'bg-emerald-100 border-emerald-200 text-emerald-900';
    const Icon = isError ? FaExclamationTriangle : FaCheckCircle;

    return (
        <div className={`flex items-center gap-2 px-2 py-1 text-xs border-y ${tone}`} role="status">
            <Icon size={12} />
            <span className="grow truncate">{message}</span>
            <Hint content={LocalizeText('housekeeping.status.dismiss')}>
                <BaseButton aria-label={LocalizeText('housekeeping.status.dismiss')}
                    className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-black/10"
                    onClick={() => clearStatus()}
                >
                    <FaTimes size={10} />
                </BaseButton>
            </Hint>
        </div>
    );
};
