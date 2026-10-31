import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

export const GuideToolUserSomethingWrogView: FC<{}> = (props) => {
    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <Text>{LocalizeText('guide.help.request.user.guide.disconnected.error.desc')}</Text>
            </div>
        </NativeTextTree>
    );
};
