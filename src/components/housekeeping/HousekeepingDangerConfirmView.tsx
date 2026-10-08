import { FC, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { LocalizeText, matchesDangerConfirmation } from '../../api';
import { useHousekeepingStore } from '../../hooks';
import { HousekeepingButton } from './views/common/HousekeepingParts';

/**
 * Second step of a dangerous action, drawn over the panel: the operator has to
 * type the target before the confirm button unlocks.
 */
export const HousekeepingDangerConfirmView: FC = () => {
    const { dangerRequest, setDangerRequest } = useHousekeepingStore();
    const [typed, setTyped] = useState('');

    if (!dangerRequest) return null;

    const matches = matchesDangerConfirmation(typed, dangerRequest.expected);
    const close = () => {
        setTyped('');
        setDangerRequest(null);
    };
    const confirm = () => {
        if (!matches) return;

        const run = dangerRequest.onConfirm;

        close();
        run();
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="octane-hk-popover flex w-[360px] max-w-full flex-col gap-2 rounded-lg border border-rose-300 p-3 text-black">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
                    <FaExclamationTriangle size={14} />
                    {LocalizeText('housekeeping.danger.title')}
                </div>
                <p className="m-0 text-xs text-zinc-700">{dangerRequest.message}</p>
                <label className="flex flex-col gap-1 text-[11px] text-zinc-600">
                    {LocalizeText('housekeeping.danger.type', ['target'], [dangerRequest.expected])}
                    <input
                        autoFocus
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-rose-400"
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') confirm();
                            if (event.key === 'Escape') close();
                        }}
                    />
                </label>
                <div className="flex justify-end gap-1.5">
                    <HousekeepingButton variant="secondary" onClick={close}>
                        {LocalizeText('housekeeping.confirm.cancel')}
                    </HousekeepingButton>
                    <HousekeepingButton disabled={!matches} variant="danger" onClick={confirm}>
                        {dangerRequest.confirmLabel}
                    </HousekeepingButton>
                </div>
            </div>
        </div>
    );
};
