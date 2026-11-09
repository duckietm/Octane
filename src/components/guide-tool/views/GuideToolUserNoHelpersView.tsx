import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

export const GuideToolUserNoHelpersView: FC<{}> = (props) => {
    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <Text bold className="octane-guide-tool__heading-1">{LocalizeText('guide.help.request.no_tour_guides.title')}</Text>
                <Text>{LocalizeText('guide.help.request.no_tour_guides.message')}</Text>
            </div>
        </NativeTextTree>
    );
};
