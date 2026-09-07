import { GetCfhStatusMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { FaArrowCircleRight } from 'react-icons/fa';
import {
    CreateLinkEvent,
    DispatchUiEvent,
    GetConfigurationValue,
    LocalizeText,
    localizeWithFallback,
    ReportState,
    ReportType,
    SendMessageComposer
} from '../../../api';
import helpDuck from '../../../assets/images/help/help-duck.png';
import { Text } from '../../../common';
import { GuideToolEvent } from '../../../events';
import { useHabboWay, useHelp } from '../../../hooks';
import { MyReportsStatusView } from './MyReportsStatusView';

export const HelpIndexView: FC<{}> = (props) => {
    const { setActiveReport = null } = useHelp();
    const { showHabboWay = null } = useHabboWay();
    const [reportsStatusVisible, setReportsStatusVisible] = useState(false);

    const onReportClick = () => {
        setActiveReport((prevValue) => {
            const currentStep = ReportState.SELECT_USER;
            const reportType = ReportType.BULLY;

            return { ...prevValue, currentStep, reportType };
        });
    };

    /** Official habboway_link: the in-client booklet unless the hotel points it at a web page. */
    const onHabboWayClick = () => {
        const habboWayUrl = GetConfigurationValue<string>('habboway.url', '');

        if (!GetConfigurationValue<boolean>('habboway.enabled', true) && habboWayUrl.length) {
            window.open(habboWayUrl, 'habboMain');

            return;
        }

        showHabboWay();
    };

    return (
        <div className="flex flex-col gap-2 py-1">
            <Text bold fontSize={3}>
                {LocalizeText('help.main.frame.title')}
            </Text>
            <Text center className="text-[#5c5c5c]">
                {LocalizeText('help.main.frame.description')}
            </Text>
            <div className="flex justify-center py-1">
                <img src={helpDuck} alt="" className="h-[105px] w-auto [image-rendering:pixelated]" />
            </div>
            <div className="flex flex-col gap-1.5">
                <button type="button" className="habbo-btn-green" onClick={onReportClick}>
                    {LocalizeText('help.main.bully.subtitle')}
                </button>
                <button
                    type="button"
                    className="habbo-btn-green"
                    disabled={!GetConfigurationValue('guides.enabled')}
                    onClick={() => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.CREATE_HELP_REQUEST))}
                >
                    {LocalizeText('help.main.help.title')}
                </button>
            </div>
            <div className="flex flex-col gap-1 pt-1">
                <button type="button" className="help-link" onClick={() => CreateLinkEvent('habbopages/help')}>
                    <FaArrowCircleRight className="help-link__icon" />
                    {LocalizeText('help.main.faq.link.text')}
                </button>
                <button type="button" className="help-link" onClick={onHabboWayClick}>
                    <FaArrowCircleRight className="help-link__icon" />
                    {localizeWithFallback('help.main.self.habboway.title', 'The Habbo Way')}
                </button>
                <button type="button" className="help-link" onClick={() => SendMessageComposer(new GetCfhStatusMessageComposer(false))}>
                    <FaArrowCircleRight className="help-link__icon" />
                    {LocalizeText('help.main.my.sanction.status')}
                </button>
                {/* The official client opens its "My reports" table here; ours opens the same window over a stub until the renderer parses the packet. */}
                <button type="button" className="help-link" onClick={() => setReportsStatusVisible(true)}>
                    <FaArrowCircleRight className="help-link__icon" />
                    {LocalizeText('help.main.my.reports.status')}
                </button>
            </div>
            {reportsStatusVisible && <MyReportsStatusView onClose={() => setReportsStatusVisible(false)} />}
        </div>
    );
};
