import { FC, ReactNode } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { HandheldOrientation } from '../../../../api/handheld/handheldLayout';
import { LayoutBadgeImageView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { DraggableWindow } from '../../../../common/draggable-window';
import { HandheldSheetFrame, HandheldSheetTab } from '../../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { stripTags } from './GroupForumLayout';
import { ForumIcon } from './HandheldGroupForumParts';

/** The forum lists in the order of the tabs, by their name in "groupforum/list/<name>". */
export const HANDHELD_FORUM_LISTS = ['my', 'active', 'popular'] as const;

export type HandheldForumListName = (typeof HANDHELD_FORUM_LISTS)[number];
export type HandheldForumPane = 'list' | 'threads' | 'thread' | 'compose' | 'settings';

/** What the sheet is about: the list on screen (its picture) or the open forum (its group badge). */
export interface HandheldForumHeading {
    title: string;
    description: string;
    badge?: string;
    icon?: string;
    /** The forum's group details. */
    onOpen?: () => void;
    /** Given when the reader may change the forum's settings. */
    onSettings?: () => void;
}

interface HandheldGroupForumViewProps {
    orientation: HandheldOrientation;
    /** The list on screen, or null while a forum is open. */
    activeList: HandheldForumListName | null;
    unreadForumsCount: number;
    heading: HandheldForumHeading | null;
    list?: ReactNode;
    threads?: ReactNode;
    thread?: ReactNode;
    compose?: ReactNode;
    settings?: ReactNode;
    onOpenList: (list: HandheldForumListName) => void;
    onHelp: () => void;
    onClose: () => void;
}

/**
 * Which pages of the sheet are on screen. Upright one at a time: the settings over the composer over the thread over
 * the thread list. On its side there is room for two: the thread beside its thread list, or what is being written
 * (a post, the settings) beside what it belongs to.
 */
export const handheldForumPanes = (orientation: HandheldOrientation, mounted: Record<HandheldForumPane, boolean>): HandheldForumPane[] => {
    const getOverlay = (): HandheldForumPane | null => {
        if (mounted.settings) return 'settings';

        return mounted.compose ? 'compose' : null;
    };
    const getBase = (): HandheldForumPane => {
        if (mounted.thread) return 'thread';

        return mounted.threads ? 'threads' : 'list';
    };
    const overlay = getOverlay();
    const base = getBase();

    if (orientation !== 'landscape') return [overlay ?? base];
    if (overlay) return [base, overlay];
    if (base === 'thread' && mounted.threads) return ['threads', 'thread'];

    return [base];
};

/**
 * The group forums on a phone: one sheet in the Octane handheld look. The lists are its tabs (the desktop's quick
 * links, the unread forums counted on "mine"), the forum on screen is named under them, and the list, the threads, a
 * thread, the composer and the settings are its pages. GroupForumView keeps every state and packet and hands the pages
 * in; a page that is not on screen stays mounted and hidden, so what it loaded and what was typed in it are kept.
 */
export const HandheldGroupForumView: FC<HandheldGroupForumViewProps> = (props) => {
    const {
        orientation,
        activeList,
        unreadForumsCount,
        heading,
        list = null,
        threads = null,
        thread = null,
        compose = null,
        settings = null,
        onOpenList,
        onHelp,
        onClose
    } = props;
    const pages: [HandheldForumPane, ReactNode][] = [
        ['list', list],
        ['threads', threads],
        ['thread', thread],
        ['compose', compose],
        ['settings', settings]
    ];
    const shown = handheldForumPanes(orientation, { list: !!list, threads: !!threads, thread: !!thread, compose: !!compose, settings: !!settings });
    const tabs: HandheldSheetTab[] = HANDHELD_FORUM_LISTS.map((name) => ({
        id: name,
        label: stripTags(LocalizeText(`groupforum.view.shortcuts.${name}`)),
        count: name === 'my' ? unreadForumsCount : 0
    }));

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="group-forum">
                <HandheldSheetFrame
                    activeTab={activeList}
                    className="octane-handheld-forum"
                    headerExtra={
                        <BaseButton
                            aria-label={LocalizeText('help.button.tooltip')}
                            className="octane-handheld-sheet__caption-button octane-handheld-forum__help"
                            onClick={onHelp}
                        >
                            <ForumIcon name="help" />
                        </BaseButton>
                    }
                    icon="icon-me-forums"
                    tabs={tabs}
                    tabsLabel={localizeWithFallback('octane.handheld.forum.lists', 'Forum lists')}
                    title={LocalizeText('groupforum.view.window_title')}
                    onClose={onClose}
                    onTab={(id) => onOpenList(id as HandheldForumListName)}
                >
                    {heading && (
                        <div className="octane-handheld-forum__heading" data-testid="forum-heading">
                            {heading.badge !== undefined && (
                                <BaseButton
                                    aria-label={localizeWithFallback('octane.handheld.forum.group', 'Group details')}
                                    className="octane-handheld-forum__heading-badge"
                                    onClick={heading.onOpen}
                                >
                                    <LayoutBadgeImageView badgeCode={heading.badge} isGroup={true} />
                                </BaseButton>
                            )}
                            {heading.icon && (
                                <span className="octane-handheld-forum__heading-badge is-picture">
                                    <img alt="" draggable={false} src={heading.icon} />
                                </span>
                            )}
                            <div className="octane-handheld-forum__heading-text">
                                <div className="octane-handheld-forum__heading-title">{heading.title}</div>
                                {heading.description && <div className="octane-handheld-forum__heading-description">{heading.description}</div>}
                            </div>
                            {heading.onSettings && (
                                <BaseButton className="octane-handheld-forum__chip" data-testid="forum-settings" onClick={heading.onSettings}>
                                    <ForumIcon name="settings" />
                                    <span>{LocalizeText('groupforum.view.settings.header')}</span>
                                </BaseButton>
                            )}
                        </div>
                    )}
                    <div className="octane-handheld-forum__layout" data-columns={shown.length}>
                        {pages.map(([name, page]) =>
                            page ? (
                                <section key={name} className="octane-handheld-forum__pane" data-pane={name} hidden={!shown.includes(name)}>
                                    {page}
                                </section>
                            ) : null
                        )}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
