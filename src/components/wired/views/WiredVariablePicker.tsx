import { Popover } from '@base-ui/react/popover';
import { CSSProperties, FC, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GetRoomSession, LocalizeText } from '../../../api';
import cancelSearchIcon from '../../../assets/images/wired/var/ar_picker_cancel_search.png';
import allIcon from '../../../assets/images/wired/var/var_picker_all.png';
import internalIcon from '../../../assets/images/wired/var/var_picker_internal.png';
import recentIcon from '../../../assets/images/wired/var/var_picker_recent.png';
import searchIcon from '../../../assets/images/wired/var/var_picker_search.png';
import smartIcon from '../../../assets/images/wired/var/var_picker_smart.png';
import userMadeIcon from '../../../assets/images/wired/var/var_picker_usermade.png';
import {
    buildWiredVariableNodes,
    canSelectWiredVariableNode,
    flattenWiredVariablePickerEntries,
    isWiredVariableNodeDisabled,
    IWiredVariableNode,
    IWiredVariablePickerEntry,
    WIRED_VARIABLE_TYPE_DYNAMIC,
    WIRED_VARIABLE_TYPE_INTERNAL,
    WIRED_VARIABLE_TYPE_USER,
    WIRED_VARIABLE_TYPE_USER_DERIVED
} from './WiredVariablePickerData';
import { addWiredVariablePickerHistory, getWiredVariablePickerHistory, registerWiredVariablePickerFinalizer } from './WiredVariablePickerHistory';
import { BaseButton } from '../../../common/BaseButton';
import { TabBar, TabBarTab } from '../../../common/TabBar';

/*
 * Port of the AIR variable picker, build WIN63-202610131318-860371703, under
 * com/sulake/habbo/roomevents/wired_setup/uibuilder/presets/newvariablepicker/:
 * NewVariablePicker.as, ExpandedVariablePickerView.as, overview/VariableNode(ListView|View).as and
 * tabbuttons/TabButton(Config|Configs|View).as. Line numbers below are in those files.
 */

interface WiredVariablePickerProps {
    emptyText?: string;
    entries: IWiredVariablePickerEntry[];
    placeholder?: string;
    /** Kept for the callers; AIR keys its history by room and variable target, not by editor. */
    recentScope?: string;
    selectedToken: string;
    onSelect: (entry: IWiredVariablePickerEntry) => void;
    /** NewVariablePicker.select(null): the search field was emptied or cancelled (NewVariablePicker.as:276-291, 496-500, 571-578). */
    onClear?: () => void;
}

/** TabButtonConfigs.as:56-66. */
const ALL_TAB_ID = 0;
const RECENT_TAB_ID = 1;
const USER_CREATED_TAB_ID = 2;
const DYNAMIC_TAB_ID = 3;
const INTERNAL_TAB_ID = 4;
const SEARCH_TAB_ID = 5;

/** TabButtonConfigs.as:76: id, asset and tooltip of the six tab buttons, in order. */
const TAB_BUTTONS: ReadonlyArray<{ id: number; icon: string; tooltip: string }> = [
    { id: ALL_TAB_ID, icon: allIcon, tooltip: 'wiredfurni.variable_picker.tab.all' },
    { id: RECENT_TAB_ID, icon: recentIcon, tooltip: 'wiredfurni.variable_picker.tab.recent' },
    { id: USER_CREATED_TAB_ID, icon: userMadeIcon, tooltip: 'wiredfurni.variable_picker.tab.user_created' },
    { id: DYNAMIC_TAB_ID, icon: smartIcon, tooltip: 'wiredfurni.variable_picker.tab.dynamic' },
    { id: INTERNAL_TAB_ID, icon: internalIcon, tooltip: 'wiredfurni.variable_picker.tab.internal' },
    { id: SEARCH_TAB_ID, icon: searchIcon, tooltip: 'wiredfurni.variable_picker.tab.search' }
];

/** TabButtonView.as:226-236, 288-306: border/shadow colours and icon blend per state. */
const TAB_COLORS = {
    active: { border: '#e0e0e0', shadow: '#aaaaaa', blend: 0.6 },
    hover: { border: '#efefef', shadow: '#cccccc', blend: 0.5 },
    none: { border: '#fafafa', shadow: '#dddddd', blend: 0.4 }
};

/** VariableNodeView.as:156-160, 218-232: hover and alternating row backgrounds. */
const NODE_HOVER_BG = '#e0e0e0';
const NODE_MODE1_BG = '#efefef';
const NODE_MODE2_BG = '#fafafa';
/** VariableNodeView.as:198-199: disabled nodes draw name and arrow at 0.55. */
const NODE_DISABLED_BLEND = 0.55;
/** VariableNodeListView.as:11-13. */
const MAX_LIST_HEIGHT = 300;
// AIR's list scrollbar is 9px; the rows here make room for the interface's classic 17px one.
const SCROLLBAR_WIDTH = 17;
/** VariableNodeListView.as:70: an empty list is 10px high. */
const EMPTY_LIST_HEIGHT = 10;
/*
 * The search_tree_dropdown layout is not in the index; these were measured on the live AIR client (same build, hhus,
 * 2026-10-16, 1x): 20px rows; the popup has a 1px #848484 frame and its rows leave a 1px gutter on the right;
 * a sub-list (window style 12) is a 1px black frame with 2px above the rows and 1px + a #ccc line below and to the
 * right, so it is 6px taller than its rows, and it starts on the parent frame's last column.
 */
const NODE_HEIGHT = 20;
const ROOT_ROW_GUTTER = 1;
const SUBLIST_EXTRA_HEIGHT = 6;
const SUBLIST_EXTRA_WIDTH = 2;

/** AIR does not flip or shift the open picker: it sits exactly over the collapsed field. */
const NO_COLLISION = { side: 'none', align: 'none', fallbackAxisSide: 'none' } as const;
const LIST_SELECTOR = '.octane-wired__vpicker-list';
const isInsideList = (node: EventTarget | null) => node instanceof Element && !!node.closest(LIST_SELECTOR);

const isUserCreated = (entry: IWiredVariablePickerEntry) =>
    entry.variableType === undefined ? entry.kind === 'custom' : entry.variableType === WIRED_VARIABLE_TYPE_USER || entry.variableType === WIRED_VARIABLE_TYPE_USER_DERIVED;
const isInternal = (entry: IWiredVariablePickerEntry) => (entry.variableType === undefined ? entry.kind === 'internal' : entry.variableType === WIRED_VARIABLE_TYPE_INTERNAL);
const isDynamic = (entry: IWiredVariablePickerEntry) => entry.variableType === WIRED_VARIABLE_TYPE_DYNAMIC;

/** TabButtonConfigs.as:122-209: each tab's filter over the picker's variables. */
const nodesForTab = (tabId: number, variables: IWiredVariablePickerEntry[], query: string, recentTokens: string[]): IWiredVariableNode => {
    switch (tabId) {
        case RECENT_TAB_ID: {
            const recent: IWiredVariablePickerEntry[] = [];

            for (const token of recentTokens) {
                const entry = variables.find((variable) => variable.token === token);

                if (entry) recent.push(entry);
            }

            return buildWiredVariableNodes(recent, true);
        }
        case USER_CREATED_TAB_ID:
            return buildWiredVariableNodes(variables.filter(isUserCreated));
        case DYNAMIC_TAB_ID:
            return buildWiredVariableNodes(variables.filter(isDynamic));
        case INTERNAL_TAB_ID:
            return buildWiredVariableNodes(variables.filter(isInternal));
        case SEARCH_TAB_ID: {
            if (!query.length) return buildWiredVariableNodes([]);

            const words = query.split(' ').map((word) => word.toLowerCase());

            return buildWiredVariableNodes(
                variables.filter((variable) => words.every((word) => variable.displayLabel.toLowerCase().includes(word))),
                true
            );
        }
        default:
            return buildWiredVariableNodes(variables);
    }
};

/** NewVariablePicker.determineInitialTab (NewVariablePicker.as:396-411). */
const determineInitialTab = (selected: IWiredVariablePickerEntry | null) => {
    if (!selected) return USER_CREATED_TAB_ID;
    if (isDynamic(selected)) return DYNAMIC_TAB_ID;
    if (isInternal(selected)) return INTERNAL_TAB_ID;

    return USER_CREATED_TAB_ID;
};

/** ExpandedVariablePickerView.as:48-62: (width - 3) / tab count, the remainder spread over the first tabs. */
const tabWidths = (width: number) => {
    const count = TAB_BUTTONS.length;
    const base = Math.trunc((width - 3) / count);
    let remainder = base % count;

    return TAB_BUTTONS.map(() => {
        let extra = 0;

        if (remainder > 0) {
            extra = 1;
            remainder -= 1;
        }

        return base + extra;
    });
};

const listHeight = (count: number) => (count ? Math.min(count * NODE_HEIGHT, MAX_LIST_HEIGHT) : EMPTY_LIST_HEIGHT);

interface INodeListProps {
    nodes: IWiredVariableNode[];
    width: number;
    isRoot: boolean;
    position?: { left: number; top: number };
    /** Sub-lists are fixed to the viewport, so they render beside the picker's popup instead of inside its positioned box. */
    portalTarget: HTMLElement | null;
    onSelect: (entry: IWiredVariablePickerEntry) => void;
}

/** VariableNodeListView + VariableNodeView: one list level; hovering a node with children opens its sub-list beside it. */
const WiredVariableNodeList: FC<INodeListProps> = ({ nodes, width, isRoot, position, portalTarget, onSelect }) => {
    const [hover, setHover] = useState<{ index: number; left: number; top: number } | null>(null);
    const height = listHeight(nodes.length);
    // VariableNodeListView.as:52-66, 74-77: rows are the list width less the scrollbar, and 3px less inside a sub-list.
    const scrollbarWidth = nodes.length * NODE_HEIGHT > MAX_LIST_HEIGHT ? SCROLLBAR_WIDTH : 0;
    const rowWidth = width - scrollbarWidth - (isRoot ? ROOT_ROW_GUTTER : 3);
    const hoveredNode = hover ? nodes[hover.index] : null;

    // VariableNodeListView.setHover (VariableNodeListView.as:79-95): nodes only react to WME_OVER, so a node stays
    // hovered (and its sub-list open) until another node of the same list is hovered.
    const hoverNode = (index: number, element: HTMLElement) => {
        if (hover?.index === index) return;

        const rect = element.getBoundingClientRect();
        const node = nodes[index];
        // VariableNodeView.initSublist (VariableNodeView.as:269-292): x = node right + parent scrollbar, y = node top,
        // pushed up to stay on the desktop but never above its top.
        let top = rect.top;

        if (node.children.size) {
            const sublistHeight = listHeight(node.children.size) + SUBLIST_EXTRA_HEIGHT;

            if (top + sublistHeight > window.innerHeight) top = Math.max(0, window.innerHeight - sublistHeight);
        }

        // No horizontal clamp: AIR lets a deep sub-list run past the window edge.
        setHover({ index, left: rect.left + rowWidth + (isRoot ? ROOT_ROW_GUTTER : 1) + scrollbarWidth, top });
    };

    const style: CSSProperties = isRoot
        ? { width, height }
        : { position: 'fixed', left: position?.left ?? 0, top: position?.top ?? 0, width, height: height + SUBLIST_EXTRA_HEIGHT };

    return (
        <>
            <div className={`octane-wired__vpicker-list ${isRoot ? '' : 'is-sublist'}`} role="listbox" style={style}>
                {nodes.map((node, index) => {
                    const selectable = canSelectWiredVariableNode(node);
                    const disabled = isWiredVariableNodeDisabled(node);
                    const hovered = hover?.index === index;
                    // VariableNodeView.as:203-214.
                    const tooltip = disabled
                        ? LocalizeText('wiredfurni.variable_picker.tooltip_disabled')
                        : !selectable
                          ? LocalizeText('wiredfurni.variable_picker.tooltip_not_selectable')
                          : undefined;

                    return (
                        <div
                            key={`${index}:${node.name}`}
                            aria-disabled={!selectable}
                            className={`octane-wired__vpicker-node ${selectable ? 'is-selectable' : ''}`}
                            role="option"
                            title={tooltip}
                            style={{
                                width: rowWidth,
                                height: NODE_HEIGHT,
                                background: hovered ? NODE_HOVER_BG : index % 2 === 0 ? NODE_MODE1_BG : NODE_MODE2_BG
                            }}
                            onMouseEnter={(event) => hoverNode(index, event.currentTarget)}
                            onClick={(event: MouseEvent<HTMLDivElement>) => {
                                hoverNode(index, event.currentTarget);
                                // VariableNodeView.onClick (VariableNodeView.as:234-241).
                                if (selectable) onSelect(node.entry);
                            }}
                        >
                            <span className="octane-wired__vpicker-node-name" style={{ opacity: disabled ? NODE_DISABLED_BLEND : 1 }}>
                                {node.name}
                            </span>
                            {node.children.size > 0 && (
                                <span aria-hidden="true" className="octane-wired__vpicker-node-arrow" style={{ opacity: disabled ? NODE_DISABLED_BLEND : 1 }} />
                            )}
                        </div>
                    );
                })}
            </div>
            {hover &&
                hoveredNode &&
                hoveredNode.children.size > 0 &&
                portalTarget &&
                createPortal(
                    <div className="octane-wired octane-wired__variable-picker-portal">
                        <WiredVariableNodeList
                            key={`${hover.index}:${hoveredNode.name}`}
                            nodes={[...hoveredNode.children.values()]}
                            width={rowWidth - SUBLIST_EXTRA_WIDTH}
                            isRoot={false}
                            position={{ left: hover.left, top: hover.top }}
                            portalTarget={portalTarget}
                            onSelect={onSelect}
                        />
                    </div>,
                    portalTarget
                )}
        </>
    );
};

export const WiredVariablePicker: FC<WiredVariablePickerProps> = (props) => {
    const {
        entries = [],
        selectedToken = '',
        onSelect,
        onClear,
        placeholder = LocalizeText('wiredfurni.variable_picker.search'),
        emptyText = LocalizeText('wiredfurni.variable_picker.empty')
    } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tabId, setTabId] = useState<number | null>(null);
    const [tabLoad, setTabLoad] = useState(0);
    const [hoveredTab, setHoveredTab] = useState<number | null>(null);
    const [text, setText] = useState('');
    // NewVariablePicker.var_1006: the field was typed in since the last selection.
    const [dirty, setDirty] = useState(false);
    const [panelRect, setPanelRect] = useState<{ width: number; height: number } | null>(null);
    const portalTarget = typeof document !== 'undefined' ? (document.getElementById('draggable-windows-container') ?? document.body) : null;

    // NewVariablePicker.filteredAllVariables (NewVariablePicker.as:256-274): every variable with a name; invisible
    // ones only when they are the stored selection.
    // Pre-grouped entries from older callers are read as their leaves.
    const leaves = useMemo(() => flattenWiredVariablePickerEntries(entries).filter((entry) => !entry.children?.length), [entries]);
    const variables = useMemo(
        () => leaves.filter((entry) => !!entry.displayLabel && !(entry.isInvisible && entry.token !== selectedToken)),
        [leaves, selectedToken]
    );
    const selected = useMemo(() => leaves.find((entry) => entry.token === selectedToken) ?? null, [leaves, selectedToken]);
    const variableTarget = selected?.target ?? leaves[0]?.target ?? '';
    const roomId = () => GetRoomSession()?.roomId ?? 0;

    const latestSelected = useRef(selected);
    latestSelected.current = selected;

    useEffect(
        () =>
            registerWiredVariablePickerFinalizer(() => {
                const current = latestSelected.current;

                if (current) addWiredVariablePickerHistory(roomId(), current.target, current.token);
            }),
        []
    );

    // NewVariablePicker.select sets the field to the variable's name (NewVariablePicker.as:276-291).
    useEffect(() => {
        setText(selected?.displayLabel ?? '');
        setDirty(false);
    }, [selected?.displayLabel]);

    const collapse = () => {
        // NewVariablePicker.collapseView (NewVariablePicker.as:338-353): the open list is disposed, the tab is kept.
        setIsExpanded(false);
        setPanelRect(null);
        setHoveredTab(null);
    };

    const select = (entry: IWiredVariablePickerEntry | null) => {
        collapse();
        setText(entry?.displayLabel ?? '');
        setDirty(false);

        if (entry) onSelect(entry);
        else if (onClear) onClear();
        else setText(selected?.displayLabel ?? '');
    };

    // NewVariablePicker.filteredVariableByDisplayName (NewVariablePicker.as:469-489).
    const byDisplayName = (name: string) => {
        const lower = name.toLowerCase();

        return variables.find((variable) => variable.selectable && variable.displayLabel.toLowerCase() === lower) ?? null;
    };

    const expand = () => {
        if (isExpanded) return;

        const rect = containerRef.current?.getBoundingClientRect();

        // NewVariablePicker.expandView (NewVariablePicker.as:355-383): the popup takes the picker's width and sits so
        // that its search field covers the collapsed field.
        setPanelRect({ width: Math.round(rect?.width ?? 0), height: Math.round(rect?.height ?? 0) });
        setIsExpanded(true);
        setDirty(false);

        if (tabId === null) setTabId(determineInitialTab(selected));
        setTabLoad((value) => value + 1);
    };

    const selectTab = (nextTabId: number, reload = false) => {
        // ExpandedVariablePickerView.selectTab (ExpandedVariablePickerView.as:107-129).
        if (nextTabId !== tabId || reload) setTabLoad((value) => value + 1);

        setTabId(nextTabId);
        inputRef.current?.focus();
    };

    // NewVariablePicker.onDeactivate/completeDeactivation (NewVariablePicker.as:421-467): a press outside the open
    // picker (Base UI's outside press / focus-out dismissal) takes a typed exact name, otherwise the field falls back
    // to the current selection. The lists, sub-lists included, count as inside.
    const onOpenChange = (open: boolean, details: { reason: string; event: Event; cancel: () => void }) => {
        if (open) return;

        if (details.reason === 'escape-key') {
            collapse();
            return;
        }

        const next = typeof FocusEvent !== 'undefined' && details.event instanceof FocusEvent ? details.event.relatedTarget : (details.event?.target ?? null);

        if (isInsideList(next) || (next instanceof Node && containerRef.current?.contains(next))) {
            details.cancel();
            return;
        }

        const match = dirty ? byDisplayName(text) : null;

        if (match) {
            select(match);
            return;
        }

        if (dirty) {
            setText(selected?.displayLabel ?? '');
            setDirty(false);
        }

        collapse();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        // NewVariablePicker.onKeyUp (NewVariablePicker.as:491-535).
        if (event.key === 'Escape') {
            if (isExpanded) {
                event.stopPropagation();
                collapse();
            }

            return;
        }

        if (event.key !== 'Enter') return;

        const match = byDisplayName(text);

        if (match) {
            select(match);
            return;
        }

        if (text === '') {
            select(null);
            return;
        }

        if (isExpanded && tabId === SEARCH_TAB_ID) {
            const first = searchNodes[0];

            if (first) {
                if (first.entry && canSelectWiredVariableNode(first)) select(first.entry);
            } else {
                select(null);
            }
        }
    };

    const onChangeText = (value: string) => {
        // NewVariablePicker.onChangeQuery (NewVariablePicker.as:545-553).
        setText(value);
        setDirty(true);

        if (isExpanded) selectTab(SEARCH_TAB_ID, true);
    };

    const onCancelSearch = () => {
        // NewVariablePicker.onCancelSearch (NewVariablePicker.as:571-578).
        setText('');

        if (onClear) onClear();

        setDirty(false);
        inputRef.current?.focus();
        expand();
    };

    const root = useMemo(
        () => (isExpanded && tabId !== null ? nodesForTab(tabId, variables, text, getWiredVariablePickerHistory(roomId(), variableTarget)) : null),
        // tabLoad re-runs the tab's filter like ExpandedVariablePickerView.loadTab.
        [isExpanded, tabId, tabLoad, variables, variableTarget, text]
    );
    const rootNodes = root ? [...root.children.values()] : [];
    const searchNodes = tabId === SEARCH_TAB_ID ? rootNodes : [];
    const widths = panelRect ? tabWidths(panelRect.width) : [];

    const input = (
        <div className="octane-wired__vpicker-input-region" onClick={() => expand()}>
            <input
                ref={inputRef}
                className="octane-wired__vpicker-input"
                placeholder={placeholder}
                type="text"
                value={text}
                onChange={(event) => onChangeText(event.target.value)}
                onFocus={() => expand()}
                onKeyDown={onKeyDown}
            />
            {isExpanded && text.length > 0 && (
                <BaseButton aria-label="cancel" className="octane-wired__vpicker-cancel" type="button" onClick={onCancelSearch}>
                    <img alt="" src={cancelSearchIcon} />
                </BaseButton>
            )}
        </div>
    );

    return (
        <div className="octane-wired__vpicker" ref={containerRef}>
            <div className="octane-wired__vpicker-collapsed" style={isExpanded ? { visibility: 'hidden' } : undefined}>
                {!isExpanded && input}
            </div>

            <Popover.Root modal={false} open={isExpanded && !!panelRect} onOpenChange={onOpenChange}>
                <Popover.Portal container={portalTarget}>
                    <Popover.Positioner
                        align="start"
                        anchor={containerRef}
                        className="octane-wired octane-wired__vpicker-positioner"
                        collisionAvoidance={NO_COLLISION}
                        positionMethod="fixed"
                        side="bottom"
                        sideOffset={-(panelRect?.height ?? 0)}
                    >
                        <Popover.Popup className="octane-wired__vpicker-expanded" finalFocus={false} initialFocus={inputRef} style={{ width: panelRect?.width }}>
                            <TabBar className="octane-wired__vpicker-tabs" value={tabId}>
                                {TAB_BUTTONS.map((tab, index) => {
                                    const colors = tab.id === tabId ? TAB_COLORS.active : hoveredTab === tab.id ? TAB_COLORS.hover : TAB_COLORS.none;

                                    return (
                                        <TabBarTab
                                            key={tab.id}
                                            value={tab.id}
                                            className="octane-wired__vpicker-tab"
                                            title={LocalizeText(tab.tooltip)}
                                            style={{ width: widths[index], background: colors.border, borderBottom: `1px solid ${colors.shadow}` }}
                                            onClick={() => selectTab(tab.id)}
                                            onMouseEnter={() => setHoveredTab(tab.id)}
                                            onMouseLeave={() => setHoveredTab(null)}
                                        >
                                            <img alt={LocalizeText(tab.tooltip)} src={tab.icon} style={{ opacity: colors.blend }} />
                                        </TabBarTab>
                                    );
                                })}
                            </TabBar>
                            {/* Live AIR: the tab row is above the search field. */}
                            <div className="octane-wired__vpicker-search">{input}</div>
                            <div className="octane-wired__vpicker-content">
                                {rootNodes.length && panelRect ? (
                                    <WiredVariableNodeList
                                        key={`${tabId}:${tabLoad}`}
                                        isRoot
                                        nodes={rootNodes}
                                        width={panelRect.width - 2}
                                        portalTarget={portalTarget}
                                        onSelect={select}
                                    />
                                ) : (
                                    <div className="octane-wired__vpicker-empty">{emptyText}</div>
                                )}
                            </div>
                        </Popover.Popup>
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>
        </div>
    );
};
