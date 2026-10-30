import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

export const GuideToolUserThanksView: FC<{}> = (props) => {
    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <Text bold className="octane-guide-tool__heading-2">{LocalizeText('guide.help.request.user.thanks.info.title')}</Text>
                <Text>{LocalizeText('guide.help.request.user.thanks.info.desc')}</Text>
            </div>
        </NativeTextTree>
    );
};
