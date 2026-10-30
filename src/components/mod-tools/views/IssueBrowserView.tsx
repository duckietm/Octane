import { FC, useMemo, useRef, useState } from 'react';
import issueBrowserXml from '../../../assets/mod-tools/xml/issue_browser.xml?raw';
import roomIcon from '../../../assets/mod-tools/images/room_icon.png';
import userIcon from '../../../assets/mod-tools/images/user_icon.png';
import { bundlesFor, IssueBundle, IssueManagerContext, IssueTab, pickBundle, pickNext, releaseAll, releaseBundle, sortBundles, useIssueManagerStore } from '../../../hooks';
import { findNativeNode, nativeCaption, nativeFollow, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Border, Native0Button, Native0Frame, Native0Rows, Native0Scrollbar, Native0Tab, Native0Text } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const SHADE = 0xb2e6fa;
const ROW_HEIGHT = 24;
const TABS: { tab: IssueTab; name: string }[] = [
    { tab: 'open', name: 'open_issues' },
    { tab: 'my', name: 'my_issues' },
    { tab: 'picked', name: 'picked_issues' }
];

// Classic GI.Y5 text tables: the "Type" column is the issue's source, the category the topic text.
const SOURCES: Record<number, string> = { 1: 'Normal', 2: 'Normal', 3: 'Automatic', 4: 'Automatic IM', 5: 'Guide System', 6: 'IM', 7: 'Room', 8: 'Panic', 9: 'Guardian', 10: 'Automatic Helper', 11: 'Discussion', 12: 'Selfie', 14: 'Photo', 15: 'Ambassador' };
const CATEGORIES: Record<number, string> = {
    0: 'Automatic', 101: 'Sex', 102: 'PII', 103: 'Scam', 104: 'Bullying', 105: 'Disruption', 106: 'Other', 111: 'Sex', 112: 'Scam', 113: 'Disruption', 114: 'Other', 121: 'Sex', 122: 'PII',
    123: 'Bullying', 124: 'Other', 130: 'Hate', 131: 'Violence', 132: 'Sex', 133: 'Illegal', 134: 'PII', 135: 'Copyright', 136: 'Spam', 1024: 'Guide', 1025: 'Bullying', 1026: 'Severe Alert'
};

export interface IssueBrowserProps {
    x: number;
    y: number;
    width: number;
    height: number;
    context: IssueManagerContext;
    localize: (key: string) => string;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
}

// Classic v75 issue browser (dme, issue_browser): three tabs (Open Issues, My issues, Picked Issues) over the bundles of the issue manager, lowest priority first, with a pick
// button per open row, handle / release per held row and "release all"; "Give me the next priority issue" picks the best open bundle. It opens on the Open Issues tab and
// re-reads its lists when the manager changes and every 15 seconds. Kept from the earlier ticket window: a second click on a pick within two seconds does not pick again
// (the open issue count moved to the start panel and the toolbar).
export const IssueBrowserView: FC<IssueBrowserProps> = ({ x, y, width, height, context, localize, onClose, onResize }) => {
    const root = useMemo(() => parseNativeLayout(issueBrowserXml), []);
    const [tab, setTab] = useState<IssueTab>('open');
    const [offset, setOffset] = useState(0);
    // bundles a pick was just sent for: a double click must not send the pick twice
    const recentPicksRef = useRef<Map<string, number>>(new Map());
    const guardedPick = (key: string, pick: () => void) => {
        const now = Date.now();

        if ((recentPicksRef.current.get(key) ?? 0) > now - 2000) return;

        recentPicksRef.current.set(key, now);
        pick();
    };
    // the lists are re-read when the manager changes (version) and on its 15 second tick
    useIssueManagerStore((state) => state.version);

    const context0 = rectOf(findNativeNode(root, 'tab_context'));
    const protoRect0 = rectOf(findNativeNode(root, 'open_issues_prototype'));
    const contentAt = rectOf(findNativeNode(root, 'tab_content'));
    const prototype = findNativeNode(root, `${TABS.find((entry) => entry.tab === tab).name}_prototype`);
    const inner = prototype.children[0];
    const header = inner.children[0];
    const list = findNativeNode(inner, 'issue_list');
    const prototypeRow = findNativeNode(list, 'item_prototype');
    const texts = findNativeNode(prototypeRow, 'texts_container');
    const scroller = inner.children.find((node) => node.tag === 'scrollbar_vertical');
    // the tab's container resizes the prototype to its own size when it shows it (566 x 184 against the 557 x 177 of the XML): the list stretches, the scroller and the
    // buttons on the right move with the new right edge, the scroller and the list follow the new height
    // and the window's own size change from the XML's (585 x 273) reaches the tab container, the prototype and everything in it through their scale bits (AIR WindowController
    // .updateScaleRelativeToParent): stretch both ways down to the list, stretch the width of the header, the row and its fields marked so, move the right-hand fields and buttons
    const frameChangeX = width - nativeNumber(root, 'width');
    const frameChangeY = height - nativeNumber(root, 'height');
    const stretchX = context0.width - protoRect0.width + frameChangeX;
    const stretchY = context0.height - 20 - protoRect0.height + frameChangeY;
    const listRect = { ...rectOf(list), width: rectOf(list).width + stretchX, height: rectOf(list).height + stretchY };
    const innerRect = rectOf(inner);
    const protoRect = rectOf(prototype);
    // the list sits at (tab_content + prototype + inner + list) inside the frame client area
    const base = { x: contentAt.x + protoRect.x + innerRect.x, y: contentAt.y + protoRect.y + innerRect.y };
    const bundles = sortBundles(bundlesFor(tab, context.userId));
    const contentHeight = bundles.length * ROW_HEIGHT;
    const clamped = Math.max(0, Math.min(Math.max(0, contentHeight - listRect.height), offset));
    // params bit 64 anchors a field to the right edge: it moves with the stretch of the prototype
    const movesRight = (node: NativeNode) => (Number(node.attrs.params) & 64) !== 0;
    const field = (name: string) => {
        const node = findNativeNode(texts, name);
        const rect = rectOf(node);

        const follow = nativeFollow(node, 'x');

        return follow === 'stretch' ? { ...rect, width: rect.width + stretchX } : movesRight(node) ? { ...rect, x: rect.x + stretchX } : rect;
    };
    const buttonOf = (name: string) => findNativeNode(prototypeRow, name);
    const releaseAllNode = findNativeNode(prototype, 'release_all');
    const autoPick = findNativeNode(root, 'auto_pick');
    const panel = { x: context0.x, y: context0.y + 20, width: context0.width + frameChangeX, height: context0.height - 20 + frameChangeY };

    const sourceOf = (bundle: IssueBundle) => SOURCES[bundle.primary?.issue.categoryId] ?? 'Unknown';
    const categoryOf = (bundle: IssueBundle) => {
        const id = bundle.primary?.issue.reportedCategoryId;
        const text = localize(`help.cfh.topic.${id}`);

        return text && text !== `help.cfh.topic.${id}` ? text : (CATEGORIES[id] ?? 'Unknown');
    };

    const rowColors = bundles.map((_, index) => (index % 2 === 0 ? SHADE : 0xffffff));
    const label = (node: NativeNode) => nativeCaption(node);

    return (
        <NativeTextTree>
            <NativeWindowShell type="issueBrowser" windowKey="main" x={x} y={y}>
                <Native0Frame caption={nativeCaption(root)} height={height} width={width} onClose={onClose} onResize={onResize}>
                    <Native0Border {...panel} />
                    {TABS.map((entry) => {
                        const node = findNativeNode(root, entry.name);

                        return (
                            <Native0Tab
                                key={entry.tab}
                                height={nativeNumber(node, 'height')}
                                label={label(node)}
                                selected={tab === entry.tab}
                                width={nativeNumber(node, 'width')}
                                x={context0.x + 6 + nativeNumber(node, 'x')}
                                y={context0.y + nativeNumber(node, 'y')}
                                onClick={() => {
                                    setTab(entry.tab);
                                    setOffset(0);
                                }}
                            />
                        );
                    })}
                    {/* the tab's content is clipped by the panel's inner edge (the bottom "release all" button loses its lower border row) */}
                    <div style={{ position: 'absolute', left: base.x, top: base.y, width: panel.x + panel.width - 1 - base.x, height: panel.y + panel.height - 1 - base.y, overflow: 'hidden' }}>
                        {header.children.map((node, index) => (
                            <Native0Text key={index} bold text={label(node)} width={nativeNumber(node, 'width')} x={nativeNumber(node, 'x') + (movesRight(node) ? stretchX : 0) - (label(node) === 'Msgs' ? 1 : 0)} y={nativeNumber(node, 'y')} />
                        ))}
                        <div className="native0-list" style={{ left: listRect.x, top: listRect.y, width: listRect.width, height: listRect.height }} onWheel={(event) => setOffset(Math.max(0, Math.min(Math.max(0, contentHeight - listRect.height), clamped + event.deltaY * 0.75)))}>
                            <div style={{ position: 'absolute', left: 0, top: -clamped, width: listRect.width, height: contentHeight }}>
                                <Native0Rows colors={rowColors} height={contentHeight} rowHeight={ROW_HEIGHT} width={listRect.width} />
                                {bundles.map((bundle, index) => (
                                    <div key={bundle.id} style={{ position: 'absolute', left: 0, top: index * ROW_HEIGHT, width: listRect.width, height: ROW_HEIGHT }}>
                                        <div style={{ position: 'absolute', left: rectOf(texts).x, top: rectOf(texts).y, width: rectOf(texts).width + (nativeFollow(texts, 'x') === 'stretch' ? stretchX : 0), height: rectOf(texts).height, overflow: 'hidden' }}>
                                            <Native0Text clip height={17} text={`${bundle.priority}`} width={field('score').width} x={field('score').x} y={field('score').y} />
                                            <Native0Text clip height={17} text={categoryOf(bundle)} width={field('category').width} x={field('category').x} y={field('category').y} />
                                            <Native0Text clip height={19} text={sourceOf(bundle)} width={field('source').width} x={field('source').x} y={field('source').y} />
                                            {(
                                                <Native0Text clip height={19} text={bundle.primary?.issue.reportedUserId ? (bundle.primary.issue.reportedUserName ?? '') : ''} width={field('target_name').width} x={field('target_name').x} y={field('target_name').y} />
                                            )}
                                            <img alt="" src={bundle.primary?.issue.reportedUserId ? userIcon : roomIcon} style={{ position: 'absolute', left: field('target_icon').x, top: field('target_icon').y, width: 20, height: 20, imageRendering: 'pixelated' }} />
                                            <Native0Text height={19} text={bundle.openTime()} width={field('time').width} x={field('time').x} y={field('time').y} />
                                            {tab === 'my' && <Native0Text height={19} text={`${bundle.messageCount}`} width={field('msgs').width} x={field('msgs').x} y={field('msgs').y} />}
                                            {tab === 'picked' && <Native0Text clip height={19} text={bundle.pickerName} width={field('picker').width} x={field('picker').x} y={field('picker').y} />}
                                        </div>
                                        {tab === 'open' && (
                                            <Native0Button height={rectOf(buttonOf('pick_button')).height} label={label(buttonOf('pick_button'))} width={60} x={rectOf(buttonOf('pick_button')).x + stretchX} y={rectOf(buttonOf('pick_button')).y} onClick={() => guardedPick(`bundle:${bundle.id}`, () => pickBundle(bundle.id, 'pick button', context))} />
                                        )}
                                        {tab === 'my' && (
                                            <>
                                                <Native0Button height={rectOf(buttonOf('handle_button')).height} label={label(buttonOf('handle_button'))} width={60} x={rectOf(buttonOf('handle_button')).x + stretchX} y={rectOf(buttonOf('handle_button')).y} onClick={() => context.openHandler(bundle.id)} />
                                                <Native0Button height={rectOf(buttonOf('release_button')).height} label={label(buttonOf('release_button'))} width={60} x={rectOf(buttonOf('release_button')).x + stretchX} y={rectOf(buttonOf('release_button')).y} onClick={() => releaseBundle(bundle.id, context)} />
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Native0Scrollbar contentHeight={contentHeight} height={listRect.height} offset={clamped} viewHeight={listRect.height} x={rectOf(scroller).x + stretchX} y={rectOf(scroller).y} onOffset={setOffset} />
                        {tab === 'my' && releaseAllNode && (
                            <Native0Button height={rectOf(releaseAllNode).height} label={label(releaseAllNode)} width={rectOf(releaseAllNode).width} x={rectOf(releaseAllNode).x + stretchX} y={rectOf(releaseAllNode).y + stretchY} onClick={() => releaseAll(context)} />
                        )}
                    </div>
                    <Native0Button height={rectOf(autoPick).height} label={label(autoPick)} width={rectOf(autoPick).width} x={rectOf(autoPick).x} y={rectOf(autoPick).y + frameChangeY} onClick={() => guardedPick('next', () => pickNext('issue browser pick next', context))} />
                </Native0Frame>
            </NativeWindowShell>
        </NativeTextTree>
    );
};
