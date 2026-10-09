import { FC, ReactNode, useState } from 'react';
import { FaBullhorn, FaDoorOpen, FaGlobe, FaUser, FaUserShield } from 'react-icons/fa';
import { buildHousekeepingAlertRecipient, HOUSEKEEPING_ALERT_SCOPES, HousekeepingAlertScope, LocalizeText } from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingSection } from '../common/HousekeepingParts';
import { HousekeepingSubTabs } from '../common/HousekeepingSubTabs';

const HOTEL_ALERT_CONFIRM_THRESHOLD = 200;
const HOTEL_ALERT_MAX = 1000;

const SCOPE_ICONS: Record<HousekeepingAlertScope, ReactNode> = {
    hotel: <FaGlobe size={9} />,
    user: <FaUser size={9} />,
    room: <FaDoorOpen size={9} />,
    staff: <FaUserShield size={9} />
};

/** An alert to the whole hotel, one online user, the users of one room, or the staff. */
export const HousekeepingHotelAlertView: FC = () => {
    const { isActionPending, sendHotelAlert } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [scope, setScope] = useState<HousekeepingAlertScope>('hotel');
    const [target, setTarget] = useState('');
    const [alertText, setAlertText] = useState('');
    const trimmedAlert = alertText.trim();
    const recipient = buildHousekeepingAlertRecipient(scope, target);
    const needsTarget = scope === 'user' || scope === 'room';

    const send = () => {
        if (recipient === null) return;

        const dispatch = async () => {
            const result = await sendHotelAlert(trimmedAlert, recipient);

            if (result?.ok) setAlertText('');
        };

        // A long alert to everyone is the one worth a second look.
        if (scope === 'hotel' && trimmedAlert.length >= HOTEL_ALERT_CONFIRM_THRESHOLD) {
            confirm(LocalizeText('housekeeping.hotel.alert.confirm', ['count'], [String(trimmedAlert.length)]), dispatch);

            return;
        }

        dispatch();
    };

    return (
        <HousekeepingSection icon={<FaBullhorn className="text-rose-500" size={9} />} title={LocalizeText('housekeeping.hotel.alert.label')} tone="danger">
            <HousekeepingSubTabs
                compact
                active={scope}
                tabs={HOUSEKEEPING_ALERT_SCOPES.map((id) => ({ id, icon: SCOPE_ICONS[id], label: LocalizeText(`housekeeping.hotel.alert.scope.${id}`) }))}
                onChange={(id) => {
                    setScope(id);
                    setTarget('');
                }}
            />
            {needsTarget && (
                <input
                    className={HOUSEKEEPING_INPUT_CLASS}
                    inputMode={scope === 'room' ? 'numeric' : 'text'}
                    placeholder={LocalizeText(`housekeeping.hotel.alert.target.${scope}`)}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                />
            )}
            <textarea
                className={`${HOUSEKEEPING_INPUT_CLASS} min-h-[90px] resize-y`}
                maxLength={HOTEL_ALERT_MAX}
                placeholder={LocalizeText('housekeeping.hotel.alert.placeholder')}
                value={alertText}
                onChange={(event) => setAlertText(event.target.value)}
            />
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-zinc-500">
                    {trimmedAlert.length}/{HOTEL_ALERT_MAX}
                </span>
                <HousekeepingButton
                    classNames={['ml-auto']}
                    disabled={isActionPending || !trimmedAlert.length || recipient === null}
                    gap={1}
                    variant="danger"
                    onClick={send}
                >
                    <FaBullhorn size={10} />
                    <span>{LocalizeText(`housekeeping.hotel.alert.send.${scope}`)}</span>
                </HousekeepingButton>
            </div>
            {trimmedAlert.length > 0 && (
                <div className="rounded border border-zinc-200 bg-white p-2 text-xs text-zinc-800">
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                        {LocalizeText('housekeeping.hotel.alert.preview')}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{trimmedAlert}</div>
                </div>
            )}
        </HousekeepingSection>
    );
};
