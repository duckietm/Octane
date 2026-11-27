import { FC } from 'react';
import { LocalizeText } from '../../../api';
import welcomeImage from '../../../assets/images/groups/native/group_welcome_info.png';
import { OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { GroupButton, GroupWindowTitle } from './GroupNativeLayout';
import { GroupRichText } from './GroupRichText';

// group_created_window: 358x381 frame, html text (22,10 311x150), group_welcome_info (20,140), Ok button (115,304 131x29),
// all below the 33px frame margin.
export const GroupCreatedView: FC<{ onClose: () => void }> = ({ onClose }) => (
    <OctaneCardView
        aria-label={LocalizeText('group.created.title')}
        className="octane-group-created"
        frameStyle={3}
        isResizable={false}
        role="dialog"
        uniqueKey="group-created"
    >
        <OctaneCardHeaderView headerText="" onCloseClick={onClose} />
        <GroupWindowTitle title={LocalizeText('group.created.title')} width={358} />
        <GroupRichText html={LocalizeText('group.created.info')} width={311} x={22} y={43} />
        <img alt="" className="octane-group-created__image" draggable={false} src={welcomeImage} />
        <GroupButton height={29} label={LocalizeText('group.created.ok')} width={131} x={115} y={337} onClick={onClose} />
    </OctaneCardView>
);
