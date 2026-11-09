import { GroupInformationEvent, GroupInformationParser, HabboGroupDeactivatedMessageEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent } from '../../../hooks';
import { GroupInformationNativeView } from './GroupInformationNativeView';
import { GroupWindowTitle } from './GroupNativeLayout';

export const GroupInformationStandaloneView: FC<{}> = (props) => {
    const [groupInformation, setGroupInformation] = useState<GroupInformationParser>(null);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if ((groupInformation && groupInformation.id === parser.id) || parser.flag) setGroupInformation(parser);
    });

    // A deleted group closes its window.
    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, (event) => {
        if (groupInformation && event.getParser().groupId === groupInformation.id) setGroupInformation(null);
    });

    if (!groupInformation) return null;

    return (
        <OctaneCardView
            aria-label={LocalizeText('group.window.title')}
            className="octane-group-info"
            frameStyle={3}
            isResizable={false}
            role="dialog"
            uniqueKey="group-information"
        >
            <OctaneCardHeaderView headerText="" onCloseClick={() => setGroupInformation(null)} />
            <GroupWindowTitle title={LocalizeText('group.window.title')} width={363} />
            <GroupInformationNativeView groupInformation={groupInformation} />
        </OctaneCardView>
    );
};
