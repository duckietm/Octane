import { FC } from 'react';
import { CatalogPageName, CreateLinkEvent, LocalizeText } from '../../../api';
import vipIcon from '../../../assets/images/groups/native/icon-vip-square.png';
import { OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { flatText, GroupButton, GroupText, GroupWindowTitle } from './GroupNativeLayout';
import { GroupRichText } from './GroupRichText';

/**
 * The "Habbo Club required" window the groups manager opens when a join is refused because the user is in as many groups as a
 * user without Habbo Club may be (join failure reason 4): the explanation, a link to the Habbo Club centre and the join button.
 */
export const GroupHcRequiredView: FC<{ onClose: () => void }> = ({ onClose }) => (
    <OctaneCardView
        aria-label={LocalizeText('group.hcrequired.title')}
        className="octane-group-hc"
        frameStyle={3}
        isResizable={false}
        role="dialog"
        uniqueKey="group-hc-required"
    >
        <OctaneCardHeaderView headerText="" onCloseClick={onClose} />
        <GroupWindowTitle title={LocalizeText('group.hcrequired.title')} width={300} />
        <img alt="" className="octane-group-hc__icon" draggable={false} src={vipIcon} />
        <GroupRichText html={LocalizeText('group.hcrequired.info.join')} width={226} x={60} y={43} />
        <GroupText
            className="is-link"
            overrides={flatText(12, { underline: true })}
            text={LocalizeText('group.hcrequired.moreinfo')}
            x={60}
            y={86}
            onClick={() => CreateLinkEvent('habboUI/open/hccenter')}
        />
        <GroupButton
            height={29}
            label={LocalizeText('group.hcrequired.join')}
            width={120}
            x={90}
            y={112}
            onClick={() => {
                CreateLinkEvent('catalog/open/' + CatalogPageName.HC_MEMBERSHIP);
                onClose();
            }}
        />
    </OctaneCardView>
);
