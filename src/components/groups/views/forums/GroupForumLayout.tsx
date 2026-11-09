import { CSSProperties, FC, ReactNode } from 'react';
import { FriendlyTime, LocalizeText } from '../../../../api';
import settingsIcon from '../../../../assets/images/groups/native/pursearea_settings_icon.png';
import { MessageData } from '@octane/renderer';
import { DraggableWindowPosition, LayoutBadgeImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { flatText, GroupText, GroupWindowTitle } from '../GroupNativeLayout';
import { BaseButton } from '../../../../common/BaseButton';

export const FORUM_PAGE_SIZE = 20;

// The texts reach the client cut at their first quote ("<a href"); the v75 html fields drop the stray bracket and show "a href".
export const stripTags = (text: string) => text.replace(/<[^>]*>/g, '').replace(/</g, '');

// The surface of the forum windows and the dark teal header band (HabboFriendBarCom groupforum_*).
export const FORUM_SURFACE = 0xe9e9e1;
export const FORUM_HEADER = 0x0e3f52;

/** GroupForumView.getAsDaysHoursMinutes: FriendlyTime with the ".ago" texts and a threshold of 1, so a unit rolls over as soon as the next bigger one is exceeded ("90 seconds" is "2 minutes ago"). */
export const forumAge = (seconds: number): string => FriendlyTime.format(seconds, '.ago', 1);

// MessageListView: a line that starts with ">" (and the one space after it) is quoted text.
const QUOTE_LINE = /^>(?: ?|$)/;

/**
 * ComposeMessageView.addQuote, without the text that is already in the field: "<age> <author> wrote:", then every line of the message behind "> ",
 * a run of lines that are quotes themselves collapsed to one "[quote skipped]" line, and a blank line after it.
 */
export const forumQuote = (message: MessageData): string =>
{
    const lines = [LocalizeText('groupforum.compose.reply_template', ['CREATION_TIME', 'AUTHOR_NAME', 'creation_time', 'author_name'], [forumAge(message.creationTime), message.authorName, forumAge(message.creationTime), message.authorName])];
    let skipping = false;

    for (const line of message.messageText.split(/\r\n|\r|\n/))
    {
        if (QUOTE_LINE.test(line))
        {
            if (!skipping)
            {
                skipping = true;
                lines.push('> ' + LocalizeText('groupforum.compose.skipped_quote'));
            }
        }
        else
        {
            lines.push('> ' + line);
            skipping = false;
        }
    }

    return lines.join('\n') + '\n\n';
};

interface ForumFrameProps {
    uniqueKey: string;
    className: string;
    title: string;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    isResizable?: boolean;
    initialPosition?: { x: number; y: number };
    onClose: () => void;
    onHelp?: () => void;
    children: ReactNode;
}

/** A group forum window: frame 3 with the help and close buttons, its client origin 6px right of and 25px below the frame corner. */
export const ForumFrame: FC<ForumFrameProps> = ({ uniqueKey, className, title, width, height, minWidth = width, minHeight = height, isResizable = false, initialPosition, onClose, onHelp, children }) => (
    <OctaneCardView
        aria-label={title}
        className={`octane-forum ${className}`}
        frameStyle={3}
        isResizable={isResizable}
        offsetLeft={initialPosition ? initialPosition.x - 50 : 0}
        offsetTop={initialPosition ? initialPosition.y - 50 : 0}
        windowPosition={initialPosition ? DraggableWindowPosition.TOP_LEFT : DraggableWindowPosition.CENTER}
        role="dialog"
        style={{ '--forum-width': width + 'px', '--forum-height': height + 'px', '--forum-min-width': minWidth + 'px', '--forum-min-height': minHeight + 'px' } as CSSProperties}
        uniqueKey={uniqueKey}
    >
        <OctaneCardHeaderView headerText="" onCloseClick={onClose}>
            {onHelp && <BaseButton aria-label={LocalizeText('help.button.tooltip')} className="octane-forum__help" type="button" onClick={onHelp} onMouseDown={(event) => event.stopPropagation()} />}
        </OctaneCardHeaderView>
        <GroupWindowTitle title={title} width={width} />
        <div className="octane-forum__client">{children}</div>
    </OctaneCardView>
);

interface ForumHeaderProps {
    title: string;
    description: string;
    /** Group forums show the group badge; the forum lists show a 44x43 list icon instead. */
    badge?: string;
    icon?: string;
    descriptionWidth?: number;
    canChangeSettings?: boolean;
    onSettings?: () => void;
    onClick?: () => void;
}

/** top_part: 550x80 band, a 80x80 black icon cell, the headline, the description and the optional Settings pill. */
export const ForumHeader: FC<ForumHeaderProps> = ({ title, description, badge, icon, descriptionWidth = 456, canChangeSettings = false, onSettings, onClick }) => (
    <div className="octane-forum__header">
        <BaseButton type="button" aria-label={title} className="octane-forum__header-click" onClick={onClick} />
        <div className="octane-forum__header-icon">
            {badge !== undefined && (
                <div className="octane-forum__header-badge">
                    <LayoutBadgeImageView badgeCode={badge} isGroup={true} />
                </div>
            )}
            {icon && <img alt="" draggable={false} src={icon} style={{ left: 18, top: 18 }} />}
        </div>
        <GroupText background={FORUM_HEADER} height={30} overrides={{ size: 24, color: 0xffffff }} text={title} textStyle="u_headline_big" width={460} x={90} y={10} />
        <GroupText background={FORUM_HEADER} height={40} overrides={flatText(12, { color: 0xffffff })} text={description} width={descriptionWidth} wrap x={90} y={40} />
        {canChangeSettings && (
            <BaseButton className="octane-forum__settings" type="button" onClick={onSettings}>
                <img alt="" draggable={false} src={settingsIcon} />
                <GroupText background={0x000000} overrides={flatText(11, { bold: true, color: 0xffffff, thickness: 15 })} text={LocalizeText('groupforum.view.settings.header')} x={17} y={1} />
            </BaseButton>
        )}
    </div>
);

interface ForumShortcutsProps {
    unreadCount?: number;
    onOpenList: (listMode: string) => void;
}

/** shortcuts: the white "Quick Links:" strip; the three links are html anchors in the texts, rendered here as their link text. */
export const ForumShortcuts: FC<ForumShortcutsProps> = ({ unreadCount = 0, onOpenList }) =>
{
    const strip = (key: string) => stripTags(LocalizeText(key));
    const mine = unreadCount > 0 ? stripTags(LocalizeText('groupforum.view.shortcuts.my.unread', ['UNREAD_COUNT'], [String(unreadCount)])) : strip('groupforum.view.shortcuts.my');

    return (
        <div className="octane-forum__shortcuts">
            <GroupText background={0xffffff} className="is-static" overrides={flatText(11, { bold: true })} text={LocalizeText('groupforum.view.shortcuts.header')} x={0} y={0} />
            <ForumShortcutLink text={mine} onClick={() => onOpenList('my')} />
            <ForumShortcutLink text={strip('groupforum.view.shortcuts.active')} onClick={() => onOpenList('active')} />
            <ForumShortcutLink text={strip('groupforum.view.shortcuts.popular')} onClick={() => onOpenList('popular')} />
        </div>
    );
};

const ForumShortcutLink: FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
    <BaseButton className="octane-forum__shortcut" type="button" onClick={onClick}>
        <GroupText background={0xffffff} className="is-static" overrides={flatText(11, { color: 0x1b79ab, underline: true })} text={text} x={0} y={0} />
    </BaseButton>
);

interface ForumButtonProps {
    label: string;
    /** Distance from the left edge of the footer, or from its right edge when `right` is given. */
    x?: number;
    right?: number;
    y?: number;
    width: number;
    height?: number;
    tint?: 'grey' | 'blue';
    disabled?: boolean;
    onClick: () => void;
}

/** container_button: shiny thick skin tinted 0xdddddd (grey) or 0x0a9bc5 (blue). */
export const ForumButton: FC<ForumButtonProps> = ({ label, x, right, y = 0, width, height = 30, tint = 'grey', disabled = false, onClick }) => (
    <BaseButton className={`octane-forum__button is-${tint}`} disabled={disabled} style={{ left: right === undefined ? x : undefined, right, top: y, width, height }} type="button" onClick={onClick}>
        <GroupText
            blend={tint === 'blue' ? 'screen' : 'multiply'}
            className="is-static"
            overrides={tint === 'blue' ? { color: 0xffffff } : undefined}
            text={label}
            textStyle="u_bold"
            x={0}
            y={0}
        />
    </BaseButton>
);

interface ForumPagerProps {
    pageIndex: number;
    pageCount: number;
    onPage: (pageIndex: number) => void;
}

/**
 * The 165x30 pager: first / previous, "n / total", next / last. GroupForumView.initCommonControls: the caption is
 * "<page + 1> / <pages>" with pages = ceil(total / 20), so an empty list reads "1 / 0"; << and < work from the
 * second page on, > and >> up to the one before the last.
 */
export const ForumPager: FC<ForumPagerProps> = ({ pageIndex, pageCount, onPage }) =>
{
    const canGoBack = pageIndex > 0;
    const canGoForward = pageIndex < (pageCount - 1);
    const buttons: [string, number, number, boolean][] = [
        ['<<', 0, 0, !canGoBack],
        ['<', 30, pageIndex - 1, !canGoBack],
        ['>', 110, pageIndex + 1, !canGoForward],
        ['>>', 140, pageCount - 1, !canGoForward]
    ];

    return (
        <div className="octane-forum__pager">
            {buttons.map(([label, x, target, isDisabled]) => (
                <BaseButton key={label} className="octane-forum__button is-plain" disabled={isDisabled} style={{ left: x, top: 0, width: 25, height: 30 }} type="button" onClick={() => onPage(target)}>
                    <GroupText blend="multiply" className="is-static" text={label} textStyle="u_bold" x={0} y={0} />
                </BaseButton>
            ))}
            <GroupText align="center" background={FORUM_SURFACE} overrides={flatText(12, { color: 0x949491 })} text={`${pageIndex + 1} / ${pageCount}`} width={50} x={58} y={5} />
        </div>
    );
};
