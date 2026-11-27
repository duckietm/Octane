import { ExtendedForumData, UpdateForumSettingsMessageComposer } from '@octane/renderer';
import { FC, useRef, useState } from 'react';
import { CreateLinkEvent, LocalizeText, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_HEADER, ForumButton, ForumFrame } from './GroupForumLayout';
import { BaseButton } from '../../../../common/BaseButton';
import { useIsHandheld } from '../../../../hooks/handheld/useHandheldLayout';
import { HandheldGroupForumSettingsView } from './HandheldGroupForumSettingsView';

// Permission levels: 0 everybody, 1 group members, 2 group administrators, 3 the owner.
const OPTION_KEYS = [
    'groupforum.permissions.option_all',
    'groupforum.permissions.option_group_members',
    'groupforum.permissions.option_group_admins',
    'groupforum.permissions.option_owner'
];

interface Section {
    labelKey: string;
    y: number;
    levels: number[];
}

// groupforum_forum_settings: four sections at client y 100, 190, 300 and 410; each radio row is 20px high.
const SECTIONS: Section[] = [
    { labelKey: 'groupforum.permissions.read_label', y: 100, levels: [0, 1, 2] },
    { labelKey: 'groupforum.permissions.post_message_label', y: 190, levels: [0, 1, 2, 3] },
    { labelKey: 'groupforum.permissions.post_thread_label', y: 300, levels: [0, 1, 2, 3] },
    { labelKey: 'groupforum.permissions.moderate_label', y: 410, levels: [2, 3] }
];

/**
 * AIR ForumSettingsView.setSelectorState: the lowest level each section may take. Posting cannot be more open than
 * reading, starting threads not more open than posting, and moderating is the administrators at least.
 */
export const forumPermissionMinimums = (levels: readonly number[]): number[] => [0, levels[0], levels[1], 2];

/** Raises every level that is below its minimum, from reading down to moderating, as AIR does when a choice changes. */
export const normalizeForumPermissions = (levels: readonly number[]): number[] => {
    const read = Math.max(0, levels[0] ?? 0);
    const postMessage = Math.max(read, levels[1] ?? 0);
    const postThread = Math.max(postMessage, levels[2] ?? 0);
    const moderate = Math.max(2, levels[3] ?? 0);

    return [read, postMessage, postThread, moderate];
};

interface GroupForumSettingsViewProps {
    forumData: ExtendedForumData;
    groupId: number;
    /** The newest forum data of the group, read when OK is pressed. */
    readForumData: () => ExtendedForumData | null;
    initialPosition: { x: number; y: number };
    onClose: () => void;
}

export const GroupForumSettingsView: FC<GroupForumSettingsViewProps> = ({ forumData, groupId, readForumData, initialPosition, onClose }) => {
    const [levels, setLevels] = useState<number[]>(() =>
        normalizeForumPermissions([forumData.readPermissions, forumData.postMessagePermissions, forumData.postThreadPermissions, forumData.moderatePermissions])
    );
    const minimums = forumPermissionMinimums(levels);

    // Two presses before the window closes still send one update.
    const saved = useRef<boolean>(false);

    const save = () => {
        const live = readForumData();

        // The right to change the settings is checked at the moment of sending: it can have been taken away while the window was open.
        if (saved.current || !live || live.groupId !== groupId || !live.canChangeSettings) {
            if (!saved.current) onClose();

            return;
        }

        saved.current = true;
        SendMessageComposer(new UpdateForumSettingsMessageComposer(groupId, levels[0], levels[1], levels[2], levels[3]));
        onClose();
    };
    const pick = (sectionIndex: number, level: number) => setLevels((previous) => normalizeForumPermissions(previous.map((value, index) => (index === sectionIndex ? level : value))));
    const isHandheld = useIsHandheld();

    // Phone layout: the same four choices, their rules and OK as a page of the phone sheet (HandheldGroupForumView).
    if (isHandheld)
        return (
            <HandheldGroupForumSettingsView
                levels={levels}
                minimums={minimums}
                sections={SECTIONS.map((section) => ({
                    label: LocalizeText(section.labelKey),
                    options: section.levels.map((level) => ({ level, label: LocalizeText(OPTION_KEYS[level]) }))
                }))}
                onCancel={onClose}
                onPick={pick}
                onSave={save}
            />
        );

    return (
        <ForumFrame
            className="octane-group-forum-settings"
            height={545}
            initialPosition={initialPosition}
            title={LocalizeText('groupforum.settings.window_title')}
            uniqueKey="group-forum-settings"
            width={350}
            onClose={onClose}
            onHelp={() => CreateLinkEvent('habbopages/forums')}
        >
            <div className="octane-forum__header" style={{ width: 348 }}>
                <div className="octane-forum__header-icon">
                    <div className="octane-forum__header-badge">
                        <LayoutBadgeImageView badgeCode={forumData.icon} isGroup={true} />
                    </div>
                </div>
                <GroupText background={FORUM_HEADER} height={30} overrides={{ size: 24, color: 0xffffff }} text={forumData.name} textStyle="u_headline_big" width={255} x={90} y={10} />
                <GroupText background={FORUM_HEADER} height={40} overrides={flatText(12, { color: 0xffffff })} text={forumData.description} width={254} wrap x={90} y={40} />
            </div>
            {SECTIONS.map((section, sectionIndex) => (
                <div key={section.labelKey} className="octane-forum__section" style={{ top: section.y }}>
                    <GroupText text={LocalizeText(section.labelKey)} x={0} y={0} />
                    {section.levels.map((level, row) => {
                        // An option more open than the section above allows is greyed and cannot be picked.
                        const locked = level < minimums[sectionIndex];

                        return (
                            <div key={level} className={locked ? 'octane-forum__option is-locked' : 'octane-forum__option'}>
                                <BaseButton
                                    aria-checked={levels[sectionIndex] === level}
                                    aria-label={`${LocalizeText(section.labelKey)} ${LocalizeText(OPTION_KEYS[level])}`}
                                    className={`octane-group-native__check is-radio${levels[sectionIndex] === level ? ' is-checked' : ''}`}
                                    disabled={locked}
                                    role="radio"
                                    style={{ left: 20, top: 23 + row * 20 }}
                                    type="button"
                                    onClick={() => pick(sectionIndex, level)}
                                />
                                <GroupText text={LocalizeText(OPTION_KEYS[level])} x={40} y={20 + row * 20} />
                            </div>
                        );
                    })}
                </div>
            ))}
            <ForumButton label={LocalizeText('groupforum.settings.cancel')} width={120} x={25} y={478} onClick={onClose} />
            <ForumButton label={LocalizeText('groupforum.settings.ok')} tint="blue" width={120} x={190} y={478} onClick={save} />
        </ForumFrame>
    );
};
