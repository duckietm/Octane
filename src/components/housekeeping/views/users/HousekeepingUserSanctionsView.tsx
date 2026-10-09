import { Dispatch, FC, SetStateAction, useMemo } from 'react';
import { FaBan, FaBolt, FaGavel, FaLock, FaPlug, FaUndo, FaUserSlash, FaVolumeMute } from 'react-icons/fa';
import {
    findTemplateById,
    getHousekeepingSanctionTemplates,
    HousekeepingSanctionType,
    IHousekeepingUser,
    localizeSanctionTemplate,
    LocalizeText
} from '../../../../api';
import { useHousekeeping } from '../../../../hooks';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingField, HousekeepingNumberField, HousekeepingSection } from '../common/HousekeepingParts';

export interface HousekeepingSanctionDraft {
    templateId: string;
    reason: string;
    banHours: number;
    muteMinutes: number;
    tradeLockHours: number;
}

export const DEFAULT_SANCTION_DRAFT: HousekeepingSanctionDraft = { templateId: '', reason: '', banHours: 18, muteMinutes: 60, tradeLockHours: 168 };

/** The reason typed by the operator, or the localized default one. */
export const sanctionReason = (draft: HousekeepingSanctionDraft): string => draft.reason.trim() || LocalizeText('housekeeping.reason.default');

interface HousekeepingUserSanctionsViewProps {
    user: IHousekeepingUser;
    isInCurrentRoom: boolean;
    draft: HousekeepingSanctionDraft;
    setDraft: Dispatch<SetStateAction<HousekeepingSanctionDraft>>;
}

/** Timed sanctions with a shared reason and template, plus the in-room shortcuts. */
export const HousekeepingUserSanctionsView: FC<HousekeepingUserSanctionsViewProps> = ({ user, isInCurrentRoom, draft, setDraft }) => {
    const {
        isActionPending,
        banUser,
        unbanUser,
        kickUser,
        muteUser,
        forceDisconnectUser,
        tradeLockUser,
        kickFromCurrentRoom,
        banFromCurrentRoom,
        muteInCurrentRoom
    } = useHousekeeping();
    const reason = sanctionReason(draft);
    const templates = useMemo(() => getHousekeepingSanctionTemplates(), []);
    const update = <K extends keyof HousekeepingSanctionDraft>(key: K, value: HousekeepingSanctionDraft[K]) =>
        setDraft((previous) => ({ ...previous, [key]: value }));

    const applyTemplate = (id: string) => {
        const template = findTemplateById(id, templates);

        setDraft((previous) => {
            if (!template) return { ...previous, templateId: id };

            return {
                ...previous,
                templateId: id,
                reason: localizeSanctionTemplate(template).reason,
                banHours: template.type === HousekeepingSanctionType.BAN ? template.durationValue : previous.banHours,
                muteMinutes: template.type === HousekeepingSanctionType.MUTE ? template.durationValue : previous.muteMinutes,
                tradeLockHours: template.type === HousekeepingSanctionType.TRADE_LOCK ? template.durationValue : previous.tradeLockHours
            };
        });
    };

    return (
        <div className="flex flex-col gap-2">
            {isInCurrentRoom && (
                <HousekeepingSection icon={<FaBolt className="text-amber-500" size={9} />} title={LocalizeText('housekeeping.user.live.label')} tone="warning">
                    <div className="flex flex-wrap items-center gap-1">
                        <HousekeepingButton disabled={isActionPending} size="sm" variant="warning" onClick={() => kickFromCurrentRoom(user.id)}>
                            {LocalizeText('housekeeping.user.live.kick')}
                        </HousekeepingButton>
                        <HousekeepingButton disabled={isActionPending} size="sm" variant="warning" onClick={() => muteInCurrentRoom(user.id, 2)}>
                            {LocalizeText('housekeeping.user.live.mute_2m')}
                        </HousekeepingButton>
                        <HousekeepingButton disabled={isActionPending} size="sm" variant="warning" onClick={() => muteInCurrentRoom(user.id, 10)}>
                            {LocalizeText('housekeeping.user.live.mute_10m')}
                        </HousekeepingButton>
                        <HousekeepingButton disabled={isActionPending} size="sm" variant="danger" onClick={() => banFromCurrentRoom(user.id, 'hour')}>
                            {LocalizeText('housekeeping.user.live.ban_h')}
                        </HousekeepingButton>
                        <HousekeepingButton disabled={isActionPending} size="sm" variant="danger" onClick={() => banFromCurrentRoom(user.id, 'day')}>
                            {LocalizeText('housekeeping.user.live.ban_d')}
                        </HousekeepingButton>
                    </div>
                </HousekeepingSection>
            )}

            <HousekeepingSection icon={<FaGavel className="text-rose-500" size={9} />} title={LocalizeText('housekeeping.user.section.sanctions')}>
                <div className="grid grid-cols-[180px_1fr] gap-1.5">
                    <HousekeepingField label={LocalizeText('housekeeping.field.template')}>
                        <select className={HOUSEKEEPING_INPUT_CLASS} value={draft.templateId} onChange={(event) => applyTemplate(event.target.value)}>
                            <option value="">{LocalizeText('housekeeping.field.template.none')}</option>
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {localizeSanctionTemplate(template).name}
                                </option>
                            ))}
                        </select>
                    </HousekeepingField>
                    <HousekeepingField label={LocalizeText('housekeeping.field.reason')}>
                        <input
                            className={HOUSEKEEPING_INPUT_CLASS}
                            placeholder={LocalizeText('housekeeping.field.reason.placeholder')}
                            value={draft.reason}
                            onChange={(event) => update('reason', event.target.value)}
                        />
                    </HousekeepingField>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1">
                        <HousekeepingNumberField
                            unit={LocalizeText('housekeeping.unit.hours')}
                            value={draft.banHours}
                            onChange={(value) => update('banHours', value)}
                        />
                        <HousekeepingButton
                            classNames={['grow']}
                            disabled={isActionPending}
                            gap={1}
                            variant="danger"
                            onClick={() => banUser(user.id, reason, draft.banHours)}
                        >
                            <FaBan size={10} />
                            <span>{LocalizeText('housekeeping.action.ban_h', ['h'], [String(draft.banHours)])}</span>
                        </HousekeepingButton>
                    </div>
                    <div className="flex items-center gap-1">
                        <HousekeepingNumberField
                            unit={LocalizeText('housekeeping.unit.minutes')}
                            value={draft.muteMinutes}
                            onChange={(value) => update('muteMinutes', value)}
                        />
                        <HousekeepingButton
                            classNames={['grow']}
                            disabled={isActionPending}
                            gap={1}
                            variant="warning"
                            onClick={() => muteUser(user.id, reason, draft.muteMinutes)}
                        >
                            <FaVolumeMute size={10} />
                            <span>{LocalizeText('housekeeping.action.mute_min', ['m'], [String(draft.muteMinutes)])}</span>
                        </HousekeepingButton>
                    </div>
                    <div className="flex items-center gap-1">
                        <HousekeepingNumberField
                            unit={LocalizeText('housekeeping.unit.hours')}
                            value={draft.tradeLockHours}
                            onChange={(value) => update('tradeLockHours', value)}
                        />
                        <HousekeepingButton
                            classNames={['grow']}
                            disabled={isActionPending}
                            gap={1}
                            variant="warning"
                            onClick={() => tradeLockUser(user.id, draft.tradeLockHours, reason)}
                        >
                            <FaLock size={10} />
                            <span>{LocalizeText('housekeeping.action.trade_lock_h', ['h'], [String(draft.tradeLockHours)])}</span>
                        </HousekeepingButton>
                    </div>
                    <HousekeepingButton disabled={isActionPending} gap={1} variant="warning" onClick={() => kickUser(user.id, reason)}>
                        <FaUserSlash size={10} />
                        <span>{LocalizeText('housekeeping.action.kick')}</span>
                    </HousekeepingButton>
                    <HousekeepingButton disabled={isActionPending || !user.isBanned} gap={1} variant="success" onClick={() => unbanUser(user.id)}>
                        <FaUndo size={10} />
                        <span>{LocalizeText('housekeeping.action.unban')}</span>
                    </HousekeepingButton>
                    <HousekeepingButton
                        disabled={isActionPending || !user.online}
                        gap={1}
                        variant="danger"
                        onClick={() => forceDisconnectUser(user.id, reason)}
                    >
                        <FaPlug size={10} />
                        <span>{LocalizeText('housekeeping.action.force_disconnect')}</span>
                    </HousekeepingButton>
                </div>
            </HousekeepingSection>
        </div>
    );
};
