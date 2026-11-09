import { GuideSessionRequesterCancelsMessageComposer } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../api';
import { Button, Column, Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

interface GuideToolUserPendingViewProps {
    helpRequestDescription: string;
    helpRequestAverageTime: number;
}

export const GuideToolUserPendingView: FC<GuideToolUserPendingViewProps> = (props) => {
    const { helpRequestDescription = null, helpRequestAverageTime = 0 } = props;

    const cancelRequest = () => SendMessageComposer(new GuideSessionRequesterCancelsMessageComposer());

    return (
        <NativeTextTree>
            <div className="flex flex-col">
                <Column className="octane-card-panel p-2" gap={0}>
                    <Text bold className="octane-guide-tool__heading-2">{LocalizeText('guide.help.request.guide.accept.request.title')}</Text>
                    <Text variant="muted">{LocalizeText('guide.help.request.type.1')}</Text>
                    <Text textBreak wrap>
                        {helpRequestDescription}
                    </Text>
                </Column>
                <div className="flex flex-col gap-1">
                    <Text bold className="octane-guide-tool__heading-1">{LocalizeText('guide.help.request.user.pending.info.title')}</Text>
                    <Text>{LocalizeText('guide.help.request.user.pending.info.message')}</Text>
                    <Text>{LocalizeText('guide.help.request.user.pending.info.waiting', ['waitingtime'], [helpRequestAverageTime.toString()])}</Text>
                </div>
                <Button variant="danger" onClick={cancelRequest}>
                    {LocalizeText('guide.help.request.user.pending.cancel.button')}
                </Button>
            </div>
        </NativeTextTree>
    );
};
