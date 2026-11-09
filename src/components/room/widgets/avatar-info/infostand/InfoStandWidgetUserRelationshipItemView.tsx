import { RelationshipStatusEnum, RelationshipStatusInfo } from '@octane/renderer';
import { FC } from 'react';
import { GetUserProfile, LocalizeText, localizeWithFallback } from '../../../../../api';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface InfoStandWidgetUserRelationshipsRelationshipItemViewProps {
    type: number;
    relationship: RelationshipStatusInfo;
}

export const InfoStandWidgetUserRelationshipsRelationshipItemView: FC<InfoStandWidgetUserRelationshipsRelationshipItemViewProps> = (props) => {
    const { type = -1, relationship = null } = props;

    if (!relationship) return null;

    const relationshipName = RelationshipStatusEnum.RELATIONSHIP_NAMES[type].toLocaleLowerCase();

    const others =
        relationship.friendCount > 1
            ? localizeWithFallback(
                  `infostand.relstatus.${relationshipName}.others`,
                  LocalizeText(`extendedprofile.relstatus.others.${relationshipName}`, ['count'], [(relationship.friendCount - 1).toString()]),
                  ['amount'],
                  [(relationship.friendCount - 1).toString()]
              )
            : null;

    // AIR relationship_<type>: a 16px row, a 17x14 icon slot, the friend as a bold underlined link, then "others".
    return (
        <NativeTextTree>
            <div className="octane-infostand__relationship">
                <span className="octane-infostand__relationship-icon">
                    <i className={`octane-friends-spritesheet icon-${relationshipName}`} />
                </span>
                <BaseButton type="button" className="octane-infostand__relationship-name" onClick={() => GetUserProfile(relationship.randomFriendId)}>
                    {relationship.randomFriendName}
                </BaseButton>
                {others && <span className="octane-infostand__relationship-others">{' ' + others}</span>}
            </div>
        </NativeTextTree>
    );
};
