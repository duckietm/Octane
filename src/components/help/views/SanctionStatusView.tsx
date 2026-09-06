import { FC } from 'react';
import { FaArrowCircleRight } from 'react-icons/fa';
import { CreateLinkEvent, LocalizeText } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useHelp } from '../../../hooks';

export const SanctionSatusView: FC<{}> = (props) => {
    const { sanctionInfo = null, setSanctionInfo = null } = useHelp();

    const sanctionLocalization = (param: string, sanctionName: string, length?: number) => {
        let localizationName = `help.sanction.${param}`;

        switch (sanctionName) {
            case 'ALERT':
                localizationName = localizationName + '.alert';
                break;
            case 'MUTE':
                localizationName = localizationName + '.mute';
                break;
            case 'BAN_PERMANENT':
                localizationName = localizationName + '.permban';
                break;
            default:
                localizationName = localizationName + '.ban';
                if (length > 24) {
                    localizationName = localizationName + '.days';
                    return LocalizeText(localizationName, ['days'], [(length / 24).toString()]);
                }
        }

        return LocalizeText(localizationName, ['hours'], [length.toString()]);
    };

    if (!sanctionInfo) return null;

    return (
        <OctaneCardView className="octane-help min-w-0 w-[min(420px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('help.sanction.info.title')} onCloseClick={() => setSanctionInfo(null)} />
            <OctaneCardContentView className="text-black">
                <div className="flex min-h-[170px] flex-col">
                    <div className="flex flex-col gap-1">
                        {sanctionInfo.sanctionReason === 'cfh.reason.EMPTY' ? (
                            <div className="font-bold">{LocalizeText('help.sanction.current.none')}</div>
                        ) : (
                            <>
                                {(sanctionInfo.probationHoursLeft > 0 || sanctionInfo.isSanctionActive) && (
                                    <div className="font-bold">{LocalizeText('help.sanction.probation.reminder')}</div>
                                )}
                                <div className={`font-bold ${sanctionInfo.isSanctionNew ? 'text-danger' : ''}`}>
                                    {LocalizeText('help.sanction.last.sanction')}{' '}
                                    {sanctionLocalization('current', sanctionInfo.sanctionName, sanctionInfo.sanctionLengthHours)}
                                </div>
                                <div>
                                    {LocalizeText('generic.start.time')} {sanctionInfo.sanctionCreationTime}
                                </div>
                                <div>
                                    {LocalizeText('generic.reason')} {sanctionInfo.sanctionReason}
                                </div>
                                <div>
                                    {LocalizeText('help.sanction.probation.days.left')} {Math.trunc(sanctionInfo.probationHoursLeft / 24) + 1}
                                </div>
                            </>
                        )}
                        {sanctionInfo.hasCustomMute && !sanctionInfo.isSanctionActive && (
                            <div className="font-bold">{LocalizeText('help.sanction.custom.mute')}</div>
                        )}
                        {sanctionInfo.tradeLockExpiryTime && sanctionInfo.tradeLockExpiryTime.length > 0 && (
                            <div className="font-bold">
                                {LocalizeText('trade.locked.until')} {sanctionInfo.tradeLockExpiryTime}
                            </div>
                        )}
                        {sanctionInfo.sanctionReason !== 'cfh.reason.EMPTY' && (
                            <div>{sanctionLocalization('next', sanctionInfo.nextSanctionName, sanctionInfo.nextSanctionLengthHours)}</div>
                        )}
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                        <button type="button" className="help-link" onClick={() => CreateLinkEvent('habbopages/help')}>
                            <FaArrowCircleRight className="help-link__icon" />
                            {LocalizeText('help.main.faq.link.text')}
                        </button>
                        <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={() => setSanctionInfo(null)}>
                            {LocalizeText('habbo.way.ok.button')}
                        </button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
