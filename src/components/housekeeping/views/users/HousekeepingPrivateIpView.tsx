import { FC, useState } from 'react';
import { FaEye } from 'react-icons/fa';
import { HousekeepingApi, housekeepingFailureKey, LocalizeText } from '../../../../api';
import { useHasPermission } from '../../../../hooks';

/**
 * The user's IP as the server sends it (masked), with a reveal for operators holding
 * acc_hk_view_private: it asks for the user.private list, which the server audits.
 */
export const HousekeepingPrivateIpView: FC<{ userId: number; masked: string }> = ({ userId, masked }) => {
    const canReveal = useHasPermission('acc_hk_view_private');
    const [revealed, setRevealed] = useState<{ login: string; register: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const reveal = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const list = await HousekeepingApi.requestList('user.private', userId);
            const row = list.rows[0];

            if (!list.ok || !row) {
                setError(list.message || 'housekeeping.list.failed');
            } else {
                setRevealed({ login: row[list.columns.indexOf('ip_login')] ?? '', register: row[list.columns.indexOf('ip_register')] ?? '' });
            }
        } catch (reason) {
            setError(housekeepingFailureKey(reason, 'housekeeping.list.failed'));
        } finally {
            setIsLoading(false);
        }
    };

    if (revealed) {
        return (
            <span
                className="truncate"
                title={LocalizeText('housekeeping.user.private.ips', ['login', 'register'], [revealed.login || '-', revealed.register || '-'])}
            >
                {revealed.login || '-'}
            </span>
        );
    }

    return (
        <span className="flex min-w-0 items-center gap-1">
            <span className="truncate" title={error ? LocalizeText(error) : undefined}>
                {masked || '-'}
            </span>
            {canReveal && masked && (
                <button
                    className="shrink-0 text-zinc-400 hover:text-sky-600 disabled:opacity-40"
                    disabled={isLoading}
                    title={LocalizeText('housekeeping.user.private.reveal')}
                    type="button"
                    onClick={reveal}
                >
                    <FaEye size={9} />
                </button>
            )}
        </span>
    );
};
