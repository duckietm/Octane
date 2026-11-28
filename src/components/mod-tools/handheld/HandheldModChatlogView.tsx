import { ChatlineData } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { chatlineMatches } from '../views/chatlogFilter';
import { Evidence, headerOf } from '../views/EvidenceChatlogList';
import { HandheldModChip, HandheldModNote, HandheldModPage, handheldModLoading } from './HandheldModPage';

interface HandheldModChatlogListProps {
    evidence: Evidence | null;
    query?: string;
    onOpenUserInfo: (userId: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

const chatterName = (line: ChatlineData) =>
    line.userId > 0 ? line.userName : line.userId === 0 ? localizeWithFallback('octane.mod_tools.bot_pet', 'Bot / pet') : '-';

/**
 * A chatlog as cards: each record opens with what it is of and its buttons (as the desktop rows: Room tool, View room,
 * Open thread, ...), then one card per line with the time, who said it (a link to their user info) and what was said.
 * The users the log was opened for are marked as on the desktop (`data-mark` 0 / 1), a highlighted line is bold.
 */
export const HandheldModChatlogList: FC<HandheldModChatlogListProps> = ({ evidence, query = '', onOpenUserInfo, onOpenRoomTool, onEnterRoom }) => {
    if (!evidence) return <HandheldModNote text={handheldModLoading()} />;

    const filtering = query.trim().length > 0;
    const records = evidence.records
        .map((record) => ({ record, lines: filtering ? record.chatlog.filter((line) => chatlineMatches(line.userName, line.message, query)) : record.chatlog }))
        .filter((entry) => !filtering || entry.lines.length > 0);

    return (
        <NativeTextTree>
            <div className="octane-handheld-modtools__chatlog" data-testid="mod-chatlog">
                {!records.length && (
                    <HandheldModNote
                        text={
                            filtering
                                ? localizeWithFallback('generic.no_results_found', 'No results found')
                                : localizeWithFallback('modtools.native.chatlog.empty', 'No chat lines')
                        }
                    />
                )}
                {records.map(({ record, lines }, recordIndex) => {
                    const heading = headerOf(record, { onEnterRoom, onOpenRoomTool });

                    return (
                        <section key={`${evidence.serial}:${recordIndex}`} className="octane-handheld-modtools__record">
                            <div className="octane-handheld-modtools__record-head">
                                <span className="octane-handheld-modtools__record-title">{heading.label}</span>
                                {heading.action && <HandheldModChip label={heading.action.label} onClick={heading.action.onClick} />}
                                {heading.action2 && <HandheldModChip label={heading.action2.label} onClick={heading.action2.onClick} />}
                            </div>
                            {!lines.length && <HandheldModNote text={localizeWithFallback('modtools.native.chatlog.empty', 'No chat lines')} />}
                            {lines.map((line, index) => {
                                const mark = evidence.highlights.get(line.userId);

                                return (
                                    <div key={index} className="octane-handheld-modtools__line" data-mark={mark}>
                                        <div className="octane-handheld-modtools__line-head">
                                            {line.userId > 0 ? (
                                                <BaseButton
                                                    className="octane-handheld-modtools__line-user"
                                                    type="button"
                                                    onClick={() => onOpenUserInfo(line.userId)}
                                                >
                                                    {chatterName(line)}
                                                </BaseButton>
                                            ) : (
                                                <span className="octane-handheld-modtools__line-user is-plain">{chatterName(line)}</span>
                                            )}
                                            <span className="octane-handheld-modtools__line-time">{line.timestamp}</span>
                                        </div>
                                        <p className={`octane-handheld-modtools__line-text${line.hasHighlighting ? ' is-bold' : ''}`}>{line.message}</p>
                                    </div>
                                );
                            })}
                        </section>
                    );
                })}
            </div>
        </NativeTextTree>
    );
};

interface HandheldModChatlogPageViewProps extends HandheldModChatlogListProps {
    title: string;
    query: string;
    countText: string;
    onQuery: (query: string) => void;
    onClose: () => void;
}

/** A chatlog window as a page (EvidenceChatlogView's twin): the find field and its count over the cards. */
export const HandheldModChatlogPageView: FC<HandheldModChatlogPageViewProps> = ({
    title,
    evidence,
    query,
    countText,
    onQuery,
    onClose,
    onOpenUserInfo,
    onOpenRoomTool,
    onEnterRoom
}) => (
    <NativeTextTree>
        <HandheldModPage className="is-chatlog" title={title} onClose={onClose}>
            <div className="octane-handheld-modtools__find">
                <input
                    aria-label={localizeWithFallback('generic.search', 'Search')}
                    className="octane-handheld-modtools__field"
                    data-testid="mod-chatlog-find"
                    placeholder={localizeWithFallback('generic.search', 'Search')}
                    spellCheck={false}
                    type="text"
                    value={query}
                    onChange={(event) => onQuery(event.target.value)}
                />
                {evidence && <span className="octane-handheld-modtools__find-count">{countText}</span>}
            </div>
            <HandheldModChatlogList
                evidence={evidence}
                query={query}
                onEnterRoom={onEnterRoom}
                onOpenRoomTool={onOpenRoomTool}
                onOpenUserInfo={onOpenUserInfo}
            />
        </HandheldModPage>
    </NativeTextTree>
);
