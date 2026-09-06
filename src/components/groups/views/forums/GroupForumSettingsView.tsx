import { ExtendedForumData, UpdateForumSettingsMessageComposer } from '@octane/renderer';
import { FC, useCallback, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';

// Permission levels: 0 = EVERYONE, 1 = MEMBERS, 2 = ADMINS, 3 = OWNER
const PERMISSION_EVERYONE = 0;
const PERMISSION_MEMBERS = 1;
const PERMISSION_ADMINS = 2;
const PERMISSION_OWNER = 3;

interface GroupForumSettingsViewProps {
    groupId: number;
    forumData: ExtendedForumData;
    onBack: () => void;
}

export const GroupForumSettingsView: FC<GroupForumSettingsViewProps> = (props) => {
    const { groupId = 0, forumData = null, onBack = null } = props;
    const effectiveGroupId = forumData?.groupId || groupId;
    const [readPermission, setReadPermission] = useState<number>(forumData?.readPermissions ?? PERMISSION_EVERYONE);
    const [postMessagePermission, setPostMessagePermission] = useState<number>(forumData?.postMessagePermissions ?? PERMISSION_MEMBERS);
    const [postThreadPermission, setPostThreadPermission] = useState<number>(forumData?.postThreadPermissions ?? PERMISSION_MEMBERS);
    const [moderatePermission, setModeratePermission] = useState<number>(forumData?.moderatePermissions ?? PERMISSION_ADMINS);

    const saveSettings = useCallback(() => {
        SendMessageComposer(
            new UpdateForumSettingsMessageComposer(effectiveGroupId, readPermission, postMessagePermission, postThreadPermission, moderatePermission)
        );

        onBack();
    }, [effectiveGroupId, readPermission, postMessagePermission, postThreadPermission, moderatePermission, onBack]);

    const getPermissionOptions = (includeOwner: boolean = false) => {
        const options = [
            { value: PERMISSION_EVERYONE, label: LocalizeText('groupforum.permissions.option_all') },
            { value: PERMISSION_MEMBERS, label: LocalizeText('groupforum.permissions.option_group_members') },
            { value: PERMISSION_ADMINS, label: LocalizeText('groupforum.permissions.option_group_admins') }
        ];

        if (includeOwner) {
            options.push({ value: PERMISSION_OWNER, label: LocalizeText('groupforum.permissions.option_owner') });
        }

        return options;
    };

    return (
        <Column className="h-full p-3" gap={3}>
            <Flex gap={2} alignItems="center">
                <Text pointer bold onClick={onBack}>
                    <span className="inline-block w-[7px] h-[7px] border-l-2 border-b-2 border-current rotate-45 mr-1 align-middle" />{' '}
                    {LocalizeText('groupforum.view.back')}
                </Text>
            </Flex>
            <Text bold>{LocalizeText('groupforum.settings.window_title')}</Text>
            <Column gap={2}>
                <Column gap={1}>
                    <Text bold small>
                        {LocalizeText('groupforum.permissions.read_label')}
                    </Text>
                    <select className="form-select form-select-sm" value={readPermission} onChange={(e) => setReadPermission(parseInt(e.target.value))}>
                        {getPermissionOptions().map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </Column>
                <Column gap={1}>
                    <Text bold small>
                        {LocalizeText('groupforum.permissions.post_message_label')}
                    </Text>
                    <select
                        className="form-select form-select-sm"
                        value={postMessagePermission}
                        onChange={(e) => setPostMessagePermission(parseInt(e.target.value))}
                    >
                        {getPermissionOptions(true).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </Column>
                <Column gap={1}>
                    <Text bold small>
                        {LocalizeText('groupforum.permissions.post_thread_label')}
                    </Text>
                    <select
                        className="form-select form-select-sm"
                        value={postThreadPermission}
                        onChange={(e) => setPostThreadPermission(parseInt(e.target.value))}
                    >
                        {getPermissionOptions(true).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </Column>
                <Column gap={1}>
                    <Text bold small>
                        {LocalizeText('groupforum.permissions.moderate_label')}
                    </Text>
                    <select className="form-select form-select-sm" value={moderatePermission} onChange={(e) => setModeratePermission(parseInt(e.target.value))}>
                        {[
                            { value: PERMISSION_ADMINS, label: LocalizeText('groupforum.permissions.option_group_admins') },
                            { value: PERMISSION_OWNER, label: LocalizeText('groupforum.permissions.option_owner') }
                        ].map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </Column>
            </Column>
            <Flex className="mt-auto" gap={2} justifyContent="end">
                <Button variant="secondary" className="btn-sm" onClick={onBack}>
                    {LocalizeText('generic.cancel')}
                </Button>
                <Button variant="primary" className="btn-sm" onClick={saveSettings}>
                    {LocalizeText('groupforum.settings.ok')}
                </Button>
            </Flex>
        </Column>
    );
};
