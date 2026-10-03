import { FC, useEffect, useState } from 'react';
import { FaCheck, FaCopy, FaKey, FaTimes } from 'react-icons/fa';
import { LocalizeText } from '../../api';
import { useHousekeepingStore } from '../../hooks';

const COPY_CONFIRM_MS = 1600;

/**
 * Password-reveal card — surfaces the plaintext password the emulator
 * returned from `HousekeepingResetUserPasswordEvent` so the operator
 * can read it once and copy it out-of-band to the user.
 *
 * Sensitive data, so:
 * - Renders OUTSIDE the auto-dismissing status banner (which truncates
 *   long content and disappears after 4s).
 * - Stays put until the operator explicitly dismisses — they have to
 *   acknowledge they've copied/communicated the secret.
 * - The plaintext lives in `useHousekeepingStore.passwordReveal` and
 *   never flows through the generic success-toast / banner pipeline
 *   (`useHousekeepingActions.resetUserPassword` intercepts it before
 *   `wrap`'s default path).
 * - The clipboard write uses the modern `navigator.clipboard.writeText`
 *   when available, with a `document.execCommand('copy')` fallback for
 *   non-secure-context legacy paths so the button still works inside an
 *   `http://` deployment.
 */
export const HousekeepingPasswordReveal: FC = () => {
    const { passwordReveal, clearPasswordReveal } = useHousekeepingStore();
    const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

    // Reset the "copied!" visual whenever a new reveal lands so the
    // operator doesn't see a stale checkmark from a previous reset.
    useEffect(() => {
        setCopyState('idle');
    }, [passwordReveal?.password]);

    // Auto-revert the copy-confirmation icon back to the copy icon
    // a short while after a successful copy. The plaintext itself
    // stays revealed until the operator explicitly dismisses.
    useEffect(() => {
        if (copyState === 'idle') return;

        const handle = window.setTimeout(() => setCopyState('idle'), COPY_CONFIRM_MS);

        return () => window.clearTimeout(handle);
    }, [copyState]);

    if (!passwordReveal) return null;

    const copyPassword = async () => {
        const text = passwordReveal.password;

        if (!text) return;

        // Modern path — requires a secure context (https / wss / localhost).
        if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                setCopyState('ok');
                return;
            } catch {
                // Fall through to the legacy path below — some browsers
                // still gate the modern API behind extra permissions even
                // in secure contexts.
            }
        }

        // Legacy fallback: stage a textarea, select, exec copy. Works
        // on plain-http deployments where `navigator.clipboard` is
        // refused. The textarea is positioned off-screen so the user
        // doesn't see a flash.
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, text.length);
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopyState(ok ? 'ok' : 'fail');
        } catch {
            setCopyState('fail');
        }
    };

    const copyIcon = copyState === 'ok' ? <FaCheck size={11} /> : <FaCopy size={11} />;
    const copyLabel =
        copyState === 'ok'
            ? LocalizeText('housekeeping.password.copied')
            : copyState === 'fail'
              ? LocalizeText('housekeeping.password.copy_failed')
              : LocalizeText('housekeeping.password.copy');

    return (
        <div className="flex flex-col gap-1.5 px-2.5 py-2 border-y border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50" role="status">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-700">
                <FaKey size={10} />
                <span className="grow">
                    {LocalizeText('housekeeping.password.title', ['username', 'id'], [passwordReveal.username || '-', String(passwordReveal.userId)])}
                </span>
                <button
                    className="inline-flex items-center justify-center w-5 h-5 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-200/60"
                    onClick={() => clearPasswordReveal()}
                    title={LocalizeText('housekeeping.password.dismiss')}
                    aria-label={LocalizeText('housekeeping.password.dismiss')}
                >
                    <FaTimes size={10} />
                </button>
            </div>

            <div className="flex items-center gap-2">
                {/* Readonly input lets the operator triple-click + Ctrl+C
                    as a manual fallback to the copy button. Monospace +
                    tabular-nums keeps lookalikes (Il1, O0) visually
                    distinct so they can read it aloud without typos. */}
                <input
                    readOnly
                    type="text"
                    value={passwordReveal.password}
                    className="grow font-mono tabular-nums text-sm px-2 py-1 rounded border border-amber-300 bg-white text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-400 select-all"
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label={LocalizeText('housekeeping.password.value_label')}
                />
                <button
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border transition-colors ${copyState === 'ok' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : copyState === 'fail' ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'}`}
                    onClick={copyPassword}
                    title={copyLabel}
                    aria-label={copyLabel}
                >
                    {copyIcon}
                    <span>{copyLabel}</span>
                </button>
            </div>

            <p className="text-[10px] text-amber-700/80 leading-snug">{LocalizeText('housekeeping.password.hint')}</p>
        </div>
    );
};
