import { GroupInformationEvent, GroupInformationParser } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent } from '../../../hooks';
import { GroupInformationView } from './GroupInformationView';

export const GroupInformationStandaloneView: FC<{}> = (props) => {
    const [groupInformation, setGroupInformation] = useState<GroupInformationParser>(null);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if ((groupInformation && groupInformation.id === parser.id) || parser.flag) setGroupInformation(parser);
    });

    if (!groupInformation) return null;

    return (
        <OctaneCardView className="octane-groups-window octane-group-information-standalone" theme="primary-slim" isResizable={false}>
            <OctaneCardHeaderView headerText={LocalizeText('group.window.title')} onCloseClick={(event) => setGroupInformation(null)} />
            <OctaneCardContentView className="octane-groups-content">
                <GroupInformationView groupInformation={groupInformation} onClose={() => setGroupInformation(null)} />
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
