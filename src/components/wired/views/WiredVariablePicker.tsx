import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronRight } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import searchClearIcon from '../../../assets/images/wired/var/ar_picker_cancel_search.png';
import allIcon from '../../../assets/images/wired/var/var_picker_all.png';
import internalIcon from '../../../assets/images/wired/var/var_picker_internal.png';
import recentIcon from '../../../assets/images/wired/var/var_picker_recent.png';
import searchIcon from '../../../assets/images/wired/var/var_picker_search.png';
import smartIcon from '../../../assets/images/wired/var/var_picker_smart.png';
import userMadeIcon from '../../../assets/images/wired/var/var_picker_usermade.png';
import { Text } from '../../../common';
import { flattenWiredVariablePickerEntries, IWiredVariablePickerEntry } from './WiredVariablePickerData';

type WiredVariablePickerMode = 'all' | 'recent' | 'usermade' | 'smart' | 'internal' | 'search';

interface WiredVariablePickerProps {
    emptyText?: string;
    entries: IWiredVariablePickerEntry[];
    placeholder?: string;
    recentScope: string;
    selectedToken: string;
    onSelect: (entry: IWiredVariablePickerEntry) => void;
}

const RECENT_PICKER_LIMIT = 12;
const RECENT_STORAGE_PREFIX = 'nitro.wired.variable-picker.recent';

const PICKER_MODES: Array<{ icon: string; key: WiredVariablePickerMode }> = [
    { key: 'all', icon: allIcon },
    { key: 'recent', icon: recentIcon },
    { key: 'usermade', icon: userMadeIcon },
    { key: 'smart', icon: smartIcon },
    { key: 'internal', icon: internalIcon },
    { key: 'search', icon: searchIcon }
];

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase();

const applyQuery = (entries: IWiredVariablePickerEntry[], query: string): IWiredVariablePickerEntry[] => {
    if (!query) return entries;

    const nextEntries: IWiredVariablePickerEntry[] = [];

    for (const entry of entries) {
        const ownMatch = entry.searchableText.toLocaleLowerCase().includes(query);
        const matchingChildren = entry.children?.length ? applyQuery(entry.children, query) : [];

        if (!ownMatch && !matchingChildren.length) continue;

        nextEntries.push(matchingChildren.length ? { ...entry, children: matchingChildren } : entry);
    }

    return nextEntries;
};

const applyMode = (entries: IWiredVariablePickerEntry[], mode: WiredVariablePickerMode, recentTokens: string[]): IWiredVariablePickerEntry[] => {
    const recentSet = new Set(recentTokens);

    const filterEntries = (items: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => {
        const filtered: IWiredVariablePickerEntry[] = [];

        for (const entry of items) {
            if (mode === 'smart') continue;

            const nextChildren = entry.children?.length ? filterEntries(entry.children) : [];
            const childVisible = !!nextChildren.length;
            const selfVisible = (() => {
                switch (mode) {
                    case 'recent':
                        return recentSet.has(entry.token);
                    case 'usermade':
                        return entry.kind === 'custom';
                    case 'internal':
                        return entry.kind === 'internal';
                    case 'search':
                    case 'all':
                    default:
                        return true;
                }
            })();

            if (!selfVisible && !childVisible) continue;

            filtered.push(childVisible ? { ...entry, children: nextChildren } : entry);
        }

        return filtered;
    };

    if (mode === 'recent') {
        const flatEntries = flattenWiredVariablePickerEntries(entries)
            .filter((entry) => recentSet.has(entry.token))
            .sort((left, right) => recentTokens.indexOf(left.token) - recentTokens.indexOf(right.token))
            .map((entry) => ({ ...entry, label: entry.displayLabel }));

        return flatEntries.filter((entry) => !entry.children?.length);
    }

    return filterEntries(entries);
};

export const WiredVariablePicker: FC<WiredVariablePickerProps> = (props) => {
    const {
        entries = [],
        selectedToken = '',
        onSelect,
        recentScope,
        placeholder = LocalizeText('wiredfurni.variable_picker.search'),
        emptyText = 'Nothing to display'
    } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);
    const storageKey = `${RECENT_STORAGE_PREFIX}.${recentScope}`;
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<WiredVariablePickerMode>('all');
    const [query, setQuery] = useState('');
    const [recentTokens, setRecentTokens] = useState<string[]>([]);
    const [activeParentToken, setActiveParentToken] = useState('');
    const [panelPosition, setPanelPosition] = useState<{ left: number; top: number; width: number } | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState<{ left: number; top: number } | null>(null);

    const allEntries = flattenWiredVariablePickerEntries(entries);
    const selectedEntry = allEntries.find((entry) => entry.token === selectedToken) || null;
    const modeEntries = applyMode(entries, mode, recentTokens);
    const filteredEntries = applyQuery(modeEntries, normalizeSearch(query));
    const activeParent = filteredEntries.find((entry) => entry.token === activeParentToken && entry.children?.length) || null;
    const portalTarget = typeof document !== 'undefined' ? (document.getElementById('draggable-windows-container') ?? document.body) : null;

    useEffect(() => {
        try {
            const rawValue = window.localStorage.getItem(storageKey);

            if (!rawValue) {
                setRecentTokens([]);
                return;
            }

            const parsedValue = JSON.parse(rawValue) as string[];

            setRecentTokens(Array.isArray(parsedValue) ? parsedValue.filter((token) => typeof token === 'string') : []);
        } catch {
            setRecentTokens([]);
        }
    }, [storageKey]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClick = (event: MouseEvent) => {
            if (containerRef.current?.contains(event.target as Node)) return;
            if (panelRef.current?.contains(event.target as Node)) return;
            if (submenuRef.current?.contains(event.target as Node)) return;

            setIsOpen(false);
            setActiveParentToken('');
            setPanelPosition(null);
            setSubmenuPosition(null);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            setIsOpen(false);
            setActiveParentToken('');
            setPanelPosition(null);
            setSubmenuPosition(null);
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen) {
            setPanelPosition(null);
            return;
        }

        const updatePanelPosition = () => {
            const triggerRect = containerRef.current?.getBoundingClientRect();

            if (!triggerRect) {
                setPanelPosition(null);
                return;
            }

            const panelWidth = Math.max(202, Math.ceil(triggerRect.width));
            const viewportPadding = 8;
            const left = Math.min(Math.max(viewportPadding, triggerRect.left), Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding));

            setPanelPosition({
                left,
                top: triggerRect.bottom + 2,
                width: panelWidth
            });
            setActiveParentToken('');
            setSubmenuPosition(null);
        };

        updatePanelPosition();

        window.addEventListener('resize', updatePanelPosition);
        window.addEventListener('scroll', updatePanelPosition, true);

        return () => {
            window.removeEventListener('resize', updatePanelPosition);
            window.removeEventListener('scroll', updatePanelPosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (mode !== 'search') return;

        searchInputRef.current?.focus();
    }, [isOpen, mode]);

    useEffect(() => {
        if (!activeParentToken) return;
        if (filteredEntries.some((entry) => entry.token === activeParentToken && entry.children?.length)) return;

        setActiveParentToken('');
        setSubmenuPosition(null);
    }, [activeParentToken, filteredEntries]);

    const rememberSelection = (token: string) => {
        if (!token) return;

        const nextRecentTokens = [token, ...recentTokens.filter((currentToken) => currentToken !== token)].slice(0, RECENT_PICKER_LIMIT);

        setRecentTokens(nextRecentTokens);

        try {
            window.localStorage.setItem(storageKey, JSON.stringify(nextRecentTokens));
        } catch {}
    };

    const handleSelect = (entry: IWiredVariablePickerEntry) => {
        if (!entry.selectable) return;

        rememberSelection(entry.token);
        onSelect(entry);
        setIsOpen(false);
        setActiveParentToken('');
        setSubmenuPosition(null);
    };

    const activateParent = (entry: IWiredVariablePickerEntry, element: HTMLButtonElement) => {
        if (!entry.children?.length) {
            setActiveParentToken('');
            setSubmenuPosition(null);
            return;
        }

        const rowRect = element.getBoundingClientRect();
        const panelRect = panelRef.current?.getBoundingClientRect();
        const submenuWidth = 140;
        const submenuHeight = Math.min(entry.children.length * 20 + 22, 168);
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const leftAnchor = panelRect ? panelRect.right : rowRect.right;
        const rightSpace = viewportWidth - leftAnchor;
        const canOpenRight = rightSpace >= submenuWidth + 8;
        const left = canOpenRight ? leftAnchor + 6 : Math.max(8, (panelRect ? panelRect.left : rowRect.left) - submenuWidth - 6);
        const top = Math.min(Math.max(8, rowRect.top), Math.max(8, viewportHeight - submenuHeight - 8));

        setSubmenuPosition({
            left,
            top
        });
        setActiveParentToken(entry.token);
    };

    const renderEntry = (entry: IWiredVariablePickerEntry) => {
        const hasChildren = !!entry.children?.length;

        return (
            <button
                key={entry.id}
                type="button"
                className={`octane-wired__variable-picker-row ${entry.selectable ? '' : 'is-disabled'} ${selectedToken === entry.token ? 'is-selected' : ''}`}
                onMouseEnter={(event) => activateParent(entry, event.currentTarget)}
                onClick={(event) => {
                    if (hasChildren) {
                        activateParent(entry, event.currentTarget);
                        return;
                    }

                    if (entry.selectable) handleSelect(entry);
                }}
            >
                <span className="octane-wired__variable-picker-row-label">{entry.label}</span>
                {hasChildren && <FaChevronRight className="octane-wired__variable-picker-row-arrow" />}
            </button>
        );
    };

    const renderPanel = () => {
        if (!panelPosition) return null;

        return (
            <div
                ref={panelRef}
                className="octane-wired__variable-picker-panel is-portal"
                style={{ left: panelPosition.left, top: panelPosition.top, width: panelPosition.width }}
            >
                <div className="octane-wired__variable-picker-toolbar">
                    {PICKER_MODES.map((button) => (
                        <button
                            key={button.key}
                            type="button"
                            className={`octane-wired__variable-picker-mode ${mode === button.key ? 'is-active' : ''}`}
                            onClick={() => {
                                setMode(button.key);
                                if (button.key === 'search') setTimeout(() => searchInputRef.current?.focus(), 0);
                            }}
                        >
                            <img src={button.icon} alt={button.key} />
                        </button>
                    ))}
                </div>

                <div className="octane-wired__variable-picker-search">
                    <img className="octane-wired__variable-picker-search-icon" src={searchIcon} alt="search" />
                    <input
                        ref={searchInputRef}
                        className="octane-wired__variable-picker-search-input"
                        placeholder={placeholder}
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    {!!query.length && (
                        <button type="button" className="octane-wired__variable-picker-clear" onClick={() => setQuery('')}>
                            <img src={searchClearIcon} alt="clear" />
                        </button>
                    )}
                </div>

                <div className="octane-wired__variable-picker-list">
                    {filteredEntries.length ? (
                        filteredEntries.map(renderEntry)
                    ) : (
                        <Text small className="octane-wired__variable-picker-empty">
                            {emptyText}
                        </Text>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="octane-wired__variable-picker" ref={containerRef}>
            <button type="button" className="form-select form-select-sm octane-wired__variable-picker-trigger" onClick={() => setIsOpen((value) => !value)}>
                <span className={selectedEntry ? '' : 'octane-wired__variable-picker-placeholder'}>{selectedEntry?.displayLabel || placeholder}</span>
            </button>

            {isOpen &&
                panelPosition &&
                portalTarget &&
                createPortal(
                    <div className="octane-wired octane-wired__variable-picker-portal">
                        {renderPanel()}

                        {activeParent?.children?.length && submenuPosition && (
                            <div
                                ref={submenuRef}
                                className="octane-wired__variable-picker-submenu"
                                style={{ left: submenuPosition.left, top: submenuPosition.top }}
                            >
                                {activeParent.children.map((child) => (
                                    <button
                                        key={child.id}
                                        type="button"
                                        className={`octane-wired__variable-picker-row octane-wired__variable-picker-subrow ${child.selectable ? '' : 'is-disabled'} ${selectedToken === child.token ? 'is-selected' : ''}`}
                                        onClick={() => handleSelect(child)}
                                    >
                                        <span className="octane-wired__variable-picker-row-label">{child.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>,
                    portalTarget
                )}
        </div>
    );
};
