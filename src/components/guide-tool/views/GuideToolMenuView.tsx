import { FC } from 'react';
import { CreateLinkEvent } from '@octane/renderer';
import { GetConfigurationValue, LocalizeText } from '../../../api';
import { Button, Column, Flex, Text } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { Checkbox } from '../../../common/Checkbox';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

interface GuideToolMenuViewProps {
    isOnDuty: boolean;
    isHandlingGuideRequests: boolean;
    setIsHandlingGuideRequests: (value: boolean) => void;
    isHandlingHelpRequests: boolean;
    setIsHandlingHelpRequests: (value: boolean) => void;
    isHandlingBullyReports: boolean;
    setIsHandlingBullyReports: (value: boolean) => void;
    guidesOnDuty: number;
    helpersOnDuty: number;
    guardiansOnDuty: number;
    /** AIR removes the bully report option without the JUDGE_CHAT_REVIEWS perk. */
    canJudgeChatReviews?: boolean;
    processAction: (action: string) => void;
}

export const GuideToolMenuView: FC<GuideToolMenuViewProps> = (props) => {
    const {
        isOnDuty = false,
        isHandlingGuideRequests = false,
        setIsHandlingGuideRequests = null,
        isHandlingHelpRequests = false,
        setIsHandlingHelpRequests = null,
        isHandlingBullyReports = false,
        setIsHandlingBullyReports = null,
        guidesOnDuty = 0,
        helpersOnDuty = 0,
        guardiansOnDuty = 0,
        canJudgeChatReviews = true,
        processAction = null
    } = props;

    return (
        <NativeTextTree>
            <div className="flex flex-col">
                <Flex alignItems="center" className="octane-card-panel p-2" gap={2}>
                    <BaseButton
                        aria-checked={isOnDuty}
                        aria-label={LocalizeText('guide.help.guide.tool.yourstatus')}
                        className="octane-guide-duty-switch"
                        role="switch"
                        onClick={() => processAction('toggle_duty')}
                    />
                    <Column gap={0}>
                        <Text className="octane-guide-tool__status-caption">{LocalizeText('guide.help.guide.tool.yourstatus')}</Text>
                        <Text>{LocalizeText(`guide.help.guide.tool.duty.${isOnDuty ? 'on' : 'off'}`)}</Text>
                    </Column>
                </Flex>
                <div className="flex flex-col gap-1">
                    <Text bold className="octane-guide-tool__heading-3">{LocalizeText('guide.help.guide.tool.tickettypeselection.caption')}</Text>
                    <div className="flex items-center gap-1">
                        <Checkbox checked={isHandlingGuideRequests} disabled={isOnDuty} onCheckedChange={(nextChecked) => setIsHandlingGuideRequests(nextChecked)} />
                        <Text>{LocalizeText('guide.help.guide.tool.tickettypeselection.guiderequests')}</Text>
                    </div>
                    <div className="flex items-center gap-1">
                        <Checkbox checked={isHandlingHelpRequests} disabled={isOnDuty} onCheckedChange={(nextChecked) => setIsHandlingHelpRequests(nextChecked)} />
                        <Text>{LocalizeText('guide.help.guide.tool.tickettypeselection.onlyhelprequests')}</Text>
                    </div>
                    {canJudgeChatReviews && (
                        <div className="flex items-center gap-1">
                            <Checkbox checked={isHandlingBullyReports} disabled={isOnDuty} onCheckedChange={(nextChecked) => setIsHandlingBullyReports(nextChecked)} />
                            <Text>{LocalizeText('guide.help.guide.tool.tickettypeselection.bullyreports')}</Text>
                        </div>
                    )}
                </div>
                <hr className="octane-card-divider m-0" />
                <div className="flex justify-enter items-center gap-2">
                    <div className="info-icon" />
                    <div className="flex flex-col gap-1">
                        <div dangerouslySetInnerHTML={{ __html: LocalizeText('guide.help.guide.tool.guidesonduty', ['amount'], [guidesOnDuty.toString()]) }} />
                        <div dangerouslySetInnerHTML={{ __html: LocalizeText('guide.help.guide.tool.helpersonduty', ['amount'], [helpersOnDuty.toString()]) }} />
                        <div
                            dangerouslySetInnerHTML={{ __html: LocalizeText('guide.help.guide.tool.guardiansonduty', ['amount'], [guardiansOnDuty.toString()]) }}
                        />
                    </div>
                </div>
                <hr className="octane-card-divider m-0" />
                <Flex gap={2} justifyContent="between">
                    <Button disabled onClick={(event) => processAction('forum_link')}>
                        {LocalizeText('guide.help.guide.tool.forum.link')}
                    </Button>
                    {/* Official guide_tool_talent: the helper talent track. */}
                    <Button disabled={!GetConfigurationValue<boolean>('talent.track.enabled', true)} onClick={() => CreateLinkEvent('talent/open/helper')}>
                        {LocalizeText('guide.help.guide.tool.skill.link')}
                    </Button>
                </Flex>
            </div>
        </NativeTextTree>
    );
};
