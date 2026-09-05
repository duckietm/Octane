import { RelationshipStatusEnum, RelationshipStatusInfoMessageParser } from '@octane/renderer';
import { FC } from 'react';
import { CreateLinkEvent, GetUserProfile, LocalizeText } from '../../api';
import { Flex, LayoutAvatarImageView } from '../../common';

interface RelationshipsContainerViewProps {
    relationships: RelationshipStatusInfoMessageParser;
}

interface RelationshipsContainerRelationshipViewProps {
    type: number;
}

export const RelationshipsContainerView: FC<RelationshipsContainerViewProps> = (props) => {
    const { relationships = null } = props;

    const RelationshipComponent = ({ type }: RelationshipsContainerRelationshipViewProps) => {
        const relationshipInfo = relationships && relationships.relationshipStatusMap.hasKey(type) ? relationships.relationshipStatusMap.getValue(type) : null;
        const relationshipName = RelationshipStatusEnum.RELATIONSHIP_NAMES[type].toLocaleLowerCase();

        return (
            <div className="octane-extended-profile__relationship">
                <Flex center className="octane-extended-profile__relationship-icon">
                    <i className={`octane-friends-spritesheet icon-${relationshipName}`} />
                </Flex>
                <div className="octane-extended-profile__relationship-copy">
                    <div className="octane-extended-profile__relationship-box">
                        <p
                            className="octane-extended-profile__relationship-name"
                            onClick={(event) =>
                                relationshipInfo && relationshipInfo.randomFriendId >= 1
                                    ? GetUserProfile(relationshipInfo.randomFriendId)
                                    : CreateLinkEvent('friends/toggle')
                            }
                        >
                            {(!relationshipInfo || relationshipInfo.friendCount === 0) && LocalizeText('extendedprofile.add.friends')}
                            {relationshipInfo && relationshipInfo.friendCount >= 1 && relationshipInfo.randomFriendName}
                        </p>
                        {relationshipInfo && relationshipInfo.friendCount >= 1 && (
                            <div className="octane-extended-profile__relationship-head">
                                <LayoutAvatarImageView direction={2} figure={relationshipInfo.randomFriendFigure} headOnly={true} />
                            </div>
                        )}
                    </div>
                    <p className="octane-extended-profile__relationship-subcopy">
                        {(!relationshipInfo || relationshipInfo.friendCount === 0) && LocalizeText('extendedprofile.no.friends.in.this.category')}
                        {relationshipInfo &&
                            relationshipInfo.friendCount > 1 &&
                            LocalizeText(`extendedprofile.relstatus.others.${relationshipName}`, ['count'], [(relationshipInfo.friendCount - 1).toString()])}
                        &nbsp;
                    </p>
                </div>
            </div>
        );
    };

    return (
        <>
            <RelationshipComponent type={RelationshipStatusEnum.HEART} />
            <RelationshipComponent type={RelationshipStatusEnum.SMILE} />
            <RelationshipComponent type={RelationshipStatusEnum.BOBBA} />
        </>
    );
};
