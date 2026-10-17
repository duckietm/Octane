import { GetCfhStatusMessageComposer, GetMyReportsStatusMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, DispatchUiEvent, GetConfigurationValue, localizeWithFallback, ReportState, ReportType, SendMessageComposer } from '../../../api';
import bullyImage from '../../../assets/images/help/help-bully.png';
import confusedImage from '../../../assets/images/help/help-confused.png';
import needHelpImage from '../../../assets/images/help/help-need-help.png';
import { GuideToolEvent } from '../../../events';
import { useHelp } from '../../../hooks';
import { Checkbox } from '../../../common/Checkbox';
import { BaseButton } from '../../../common/BaseButton';

/* Official main_help: a 420 px page of sections, each headed by its title: the help of the guides,
   the report of a bully, the self-help links, and the emergency box with its way out of the room. */
export const HelpIndexView: FC<{}> = () => {
    const { setActiveReport = null } = useHelp();
    const [leaveRoom, setLeaveRoom] = useState(false);

    const startReport = (reportType: number) => {
        setActiveReport((prevValue) => ({
            ...prevValue,
            currentStep: ReportState.SELECT_USER,
            reportType,
            leaveRoom: reportType === ReportType.EMERGENCY && leaveRoom
        }));
    };

    const openFaq = () => CreateLinkEvent('habbopages/help');

    return (
        <div className="octane-help-index">
            <div className="octane-help-index__section-title">{localizeWithFallback('help.main.help.section.title', 'DO YOU NEED HELP?')}</div>
            <div className="octane-help-index__row">
                <img alt="" className="octane-help-index__image" src={needHelpImage} draggable={false} />
                <div className="octane-help-index__copy">
                    <div className="octane-help-index__heading">{localizeWithFallback('help.main.help.title', 'I need help using something')}</div>
                    <div className="octane-help-index__text">{localizeWithFallback('help.main.help.content', 'The Habbo helpers are here to give you assistance.')}</div>
                    <BaseButton
                        className="octane-help-index__button"
                        disabled={!GetConfigurationValue('guides.enabled')}
                        type="button"
                        onClick={() => DispatchUiEvent(new GuideToolEvent(GuideToolEvent.CREATE_HELP_REQUEST))}
                    >
                        {localizeWithFallback('help.main.help.button', 'Ask for instructions')}
                    </BaseButton>
                </div>
            </div>

            <div className="octane-help-index__section-title">{localizeWithFallback('help.main2.bully.title', 'SOMEONE IS BEHAVING BADLY')}</div>
            <div className="octane-help-index__row">
                <div className="octane-help-index__pictures">
                    <img alt="" className="octane-help-index__image is-confused" src={confusedImage} draggable={false} />
                    <img alt="" className="octane-help-index__image is-bully" src={bullyImage} draggable={false} />
                </div>
                <div className="octane-help-index__copy">
                    <div className="octane-help-index__heading">{localizeWithFallback('help.main2.bully.subtitle', 'Report a case of bullying')}</div>
                    <div className="octane-help-index__text">{localizeWithFallback('help.main2.bully.description', 'If you see others behaving badly, report it.')}</div>
                    <BaseButton className="octane-help-index__button" type="button" onClick={() => startReport(ReportType.BULLY)}>
                        {localizeWithFallback('help.main2.bully.button', 'Report a case of bullying')}
                    </BaseButton>
                </div>
            </div>

            <div className="octane-help-index__section-title is-left">{localizeWithFallback('help.main.self.section.title', 'SELF-HELP')}</div>
            <div className="octane-help-index__self">
                <div className="octane-help-index__self-column">
                    <BaseButton className="octane-help-index__link" type="button" onClick={openFaq}>
                        {localizeWithFallback('help.main.self.tips.title', 'Player support')}
                    </BaseButton>
                    <BaseButton className="octane-help-index__link is-plain" type="button" onClick={openFaq}>
                        {localizeWithFallback('help.main.self.tips.content', 'Find answers in the FAQ.')}
                    </BaseButton>
                </div>
                <div className="octane-help-index__self-column">
                    <BaseButton className="octane-help-index__link" type="button" onClick={openFaq}>
                        {localizeWithFallback('help.main.self.habboway.title', 'The Habbo Way')}
                    </BaseButton>
                    <BaseButton className="octane-help-index__link" type="button" onClick={openFaq}>
                        {localizeWithFallback('help.main.self.safetybooklet.title', 'Safety rules')}
                    </BaseButton>
                </div>
            </div>

            <div className="octane-help-index__emergency">
                <div className="octane-help-index__emergency-copy">
                    <div className="octane-help-index__emergency-title">{localizeWithFallback('help.main2.emergency.title', 'This is an emergency!')}</div>
                    <div className="octane-help-index__emergency-sub">{localizeWithFallback('help.main2.emergency.subtitle', '(URGENT MATTERS ONLY)')}</div>
                </div>
                <div className="octane-help-index__emergency-actions">
                    <BaseButton className="octane-help-index__button is-red" type="button" onClick={() => startReport(ReportType.EMERGENCY)}>
                        {localizeWithFallback('help.main2.emergency.button', 'Get help now!')}
                    </BaseButton>
                    <label className="octane-help-index__leave">
                        <Checkbox checked={leaveRoom} onCheckedChange={(nextChecked) => setLeaveRoom(nextChecked)} />
                        <span>{localizeWithFallback('help.main2.emergency.leave', 'I want to leave the room')}</span>
                    </label>
                </div>
            </div>

            <div className="octane-help-index__status">
                <BaseButton className="octane-help-index__link" type="button" onClick={() => SendMessageComposer(new GetCfhStatusMessageComposer(false))}>
                    {localizeWithFallback('help.main.my.sanction.status', 'My sanction status')}
                </BaseButton>
                <BaseButton className="octane-help-index__link" type="button" onClick={() => SendMessageComposer(new GetMyReportsStatusMessageComposer())}>
                    {localizeWithFallback('help.main.my.reports.status', 'My reports')}
                </BaseButton>
            </div>
        </div>
    );
};
