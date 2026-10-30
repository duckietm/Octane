import { FC, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Native0Frame, Native0Input, Native0Text } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { chatlineMatches } from './chatlogFilter';
import { EvidenceChatlogKind, EvidenceChatlogList, useEvidence } from './EvidenceChatlogList';

export type { EvidenceChatlogKind };

/** The find row kept from the earlier chatlog window, above the evidence list. */
const SEARCH_ROW = 22;

export interface EvidenceChatlogProps {
    kind: EvidenceChatlogKind;
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
    onOpenUserInfo: (userId: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

// Classic v75 chatlog window (Q5, evidence_frame): the request for its subject goes out when it opens and the window only appears when the answer arrives, captioned by what
// was asked for. Each record starts with a header row (what the log is of, with its buttons), then one row per line; the rows alternate between a pale blue and white and the
// chatters the window was opened for take 0xf0d6a3 (the reported user) or 0xa3bdf0 (the caller). A line is 17px at least and as high as its wrapped message plus 5px.
// Kept from the earlier chatlog window: a find field over the list (a user's chatlog opens filtered on the user's name) with the count of the lines it keeps.
export const EvidenceChatlogView: FC<EvidenceChatlogProps> = ({ kind, id, x, y, width, height, onClose, onResize, onOpenUserInfo, onOpenRoomTool, onEnterRoom }) => {
    const evidence = useEvidence(kind, id);
    const [query, setQuery] = useState<string>(null);
    const [inputActive, setInputActive] = useState(false);
    // a user's own chatlog is read for that user: it opens filtered on the name once the answer (and so the name) is there
    const userName = kind === 'user' && evidence ? evidence.caption.replace(/^User Chatlog: /, '') : '';
    const currentQuery = query ?? userName;
    const counts = useMemo(() => {
        let total = 0;
        let kept = 0;

        for (const record of evidence?.records ?? []) {
            for (const line of record.chatlog) {
                total++;

                if (chatlineMatches(line.userName, line.message, currentQuery)) kept++;
            }
        }

        return { total, kept };
    }, [evidence, currentQuery]);

    if (!evidence) return null;

    const listHeight = height - SEARCH_ROW;

    // the list is 420 wide at the default 480 while its scroller (at 451) shows, 22px wider (443) while the scroller is hidden
    return (
        <NativeTextTree>
            <NativeWindowShell type={`${kind}Chatlog` as 'userChatlog'} windowKey={`${id}`} x={x} y={y}>
                <Native0Frame caption={evidence.caption} height={height} width={width} onClose={onClose} onResize={onResize}>
                    <Native0Input active={inputActive || currentQuery.length > 0} height={18} value={currentQuery} width={width - 80} x={0} y={0} onChange={setQuery} onFocus={() => setInputActive(true)} />
                    <Native0Text color={0xffffff} text={currentQuery.trim().length ? `${counts.kept}/${counts.total}` : `${counts.total}`} width={60} x={width - 76} y={3} />
                    <div style={{ position: 'absolute', left: 0, top: SEARCH_ROW, width: width - 12, height: listHeight - 32 }}>
                        {/* the scroller column sits on a slightly darker blue that reaches 8px to its left; the rest of the frame is the plain frame blue */}
                        <div className="native0-box" style={{ left: width - 37, top: 0, width: 25, height: listHeight - 32, backgroundColor: '#4184b0' }} />
                        <EvidenceChatlogList
                            emptyText={localizeWithFallback('modtools.native.chatlog.empty', 'No chat lines')}
                            evidence={evidence}
                            lineFollowsList
                            listWidth={width - 60}
                            noMatchText={localizeWithFallback('generic.no_results_found', 'No results found')}
                            query={currentQuery}
                            scrollbarHeight={listHeight - 32}
                            scrollbarX={width - 29}
                            viewHeight={listHeight - 35}
                            viewportWidth={width - 37}
                            onEnterRoom={onEnterRoom}
                            onOpenRoomTool={onOpenRoomTool}
                            onOpenUserInfo={onOpenUserInfo}
                        />
                    </div>
                </Native0Frame>
            </NativeWindowShell>
        </NativeTextTree>
    );
};
