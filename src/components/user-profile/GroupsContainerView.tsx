import { GroupInformationComposer, GroupInformationEvent, GroupInformationParser, HabboGroupEntryData } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, SanitizeHtml, SendMessageComposer, ToggleFavoriteGroup } from '../../api';
import { Column, GridProps, LayoutBadgeImageView, LayoutGridItem } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../hooks';
import { GroupInformationView } from '../groups/views/GroupInformationView';

interface GroupsContainerViewProps extends GridProps {
    itsMe: boolean;
    groups: HabboGroupEntryData[];
    onLeaveGroup: () => void;
}

export const GroupsContainerView: FC<GroupsContainerViewProps> = (props) => {
    const { itsMe = null, groups = null, onLeaveGroup = null } = props;
    const [selectedGroupId, setSelectedGroupId] = useState<number>(null);
    const selectedGroupIdRef = useRef<number>(null);
    selectedGroupIdRef.current = selectedGroupId;
    const [groupInformation, setGroupInformation] = useState<GroupInformationParser>(null);

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if (!selectedGroupId || selectedGroupId !== parser.id || parser.flag) return;

        setGroupInformation(parser);
    });

    useEffect(() => {
        if (!selectedGroupId) return;

        SendMessageComposer(new GroupInformationComposer(selectedGroupId, false));
    }, [selectedGroupId]);

    useEffect(() => {
        setGroupInformation(null);

        if (groups.length > 0) {
            // The same group again does not change the state, so the effect above will not ask: ask here, outside the
            // updater, which may run twice (StrictMode).
            if (selectedGroupIdRef.current === groups[0].groupId) {
                SendMessageComposer(new GroupInformationComposer(groups[0].groupId, false));
            }

            setSelectedGroupId(groups[0].groupId);
        }
    }, [groups]);

    if (!groups || !groups.length) {
        return (
            <NativeTextTree>
                <Column center fullHeight className="octane-extended-profile-groups">
                    <div className="flex justify-center gap-2">
                        <div className="no-group-spritesheet image-1" />
                        <div className="no-group-spritesheet image-2" />
                        <div className="no-group-spritesheet image-3" />
                    </div>
                </Column>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-extended-profile-groups">
                <div className="octane-extended-profile-groups__sidebar">
                    <div
                        className="octane-extended-profile-groups__count"
                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('extendedprofile.groups.count', ['count'], [groups.length.toString()])) }}
                    />
                    <div className="octane-extended-profile-groups__list">
                        {groups.map((group, index) => {
                            return (
                                <LayoutGridItem
                                    key={index}
                                    className="octane-extended-profile-groups__item p-1"
                                    itemActive={selectedGroupId === group.groupId}
                                    overflow="unset"
                                    onClick={() => setSelectedGroupId(group.groupId)}
                                >
                                    {itsMe && (
                                        <i
                                            className={
                                                'absolute inset-e-0 top-0 z-20 octane-icon icon-group-' + (group.favourite ? 'favorite' : 'not-favorite')
                                            }
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                ToggleFavoriteGroup(group);
                                            }}
                                        />
                                    )}
                                    <LayoutBadgeImageView badgeCode={group.badgeCode} isGroup={true} />
                                </LayoutGridItem>
                            );
                        })}
                    </div>
                </div>
                <div className="octane-extended-profile-groups__details">
                    {groupInformation && <GroupInformationView groupInformation={groupInformation} onClose={onLeaveGroup} />}
                </div>
            </div>
        </NativeTextTree>
    );
};
