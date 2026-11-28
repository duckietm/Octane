/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    saveRoomSettings: vi.fn(),
    reloadRoomWired: vi.fn(),
    rollbackRoomWired: vi.fn(),
    send: vi.fn(),
    roomSettings: { isLoaded: true, canModify: true, canInspect: true, canManageSettings: true, inspectMask: 0, modifyMask: 2, timezone: 'UTC' },
    session: { roomId: 1, isRoomOwner: false, controllerLevel: 1, hotelTimeZone: 'UTC' }
}));

vi.mock('../../../hooks', () => ({
    useMessageEvent: () => undefined,
    useNotification: () => ({ showConfirm: null, simpleAlert: null }),
    useRoom: () => ({ roomSession: mocks.session }),
    useWiredTools: () => ({
        accountPreferences: { showToolbarButton: true, showInspectButton: true, playTestMode: false, showSystemNotifications: false, wiredStyle: '' },
        roomSettings: mocks.roomSettings,
        saveRoomSettings: mocks.saveRoomSettings,
        saveRoomTimezone: vi.fn(),
        reloadRoomWired: mocks.reloadRoomWired,
        rollbackRoomWired: mocks.rollbackRoomWired,
        setPlayTestMode: vi.fn(),
        updateAccountPreferences: vi.fn()
    })
}));

vi.mock('../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../api')>('../../../api');

    return {
        ...actual,
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        GetConfigurationList: () => [],
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string, parameters: string[] = [], values: string[] = []) =>
            (parameters ?? []).reduce((text, parameter, index) => text.replace(`%${parameter}%`, values[index] ?? ''), fallback),
        SendMessageComposer: mocks.send
    };
});

vi.mock('../../../common', async () => {
    const actual = await vi.importActual<typeof import('../../../common')>('../../../common');

    return { ...actual, LayoutRoomObjectImageView: () => null, LayoutAvatarImageView: () => null, LayoutPetImageView: () => null };
});

import { DESKTOP_LAYOUT, HandheldLayout } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';
import { WiredChestsTabView } from '../WiredChestsTabView';
import { WiredPagedTable } from '../WiredPagedTable';
import { NO_PAGE } from '../WiredPaging.helpers';
import { WiredToolsSettingsTabView } from '../WiredToolsSettingsTabView';
import { WiredVariableHolderPanelView } from '../WiredVariableHolderPanelView';
import { useWiredCreatorToolsUiStore } from '../wiredCreatorToolsUiStore';
import { HandheldWiredInspectionTab, HandheldWiredInspectionTabProps } from './HandheldWiredInspectionTab';
import { HandheldWiredMonitorTab, HandheldWiredMonitorTabProps } from './HandheldWiredMonitorTab';
import { HandheldWiredToolsView } from './HandheldWiredToolsView';
import { HandheldWiredVariablesTab } from './HandheldWiredVariablesTab';

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') =>
    act(() => useHandheldStore.setState({ layout: { active: true, orientation } as HandheldLayout }));

const withWindows = (node: ReactNode) => {
    const container = document.createElement('div');

    container.id = 'draggable-windows-container';
    document.body.appendChild(container);

    return render(<>{node}</>);
};

const TABS = [
    { id: 'monitor', label: 'Monitor' },
    { id: 'inspection', label: 'Inspection' }
];

const requests = () => ({
    requestPage: vi.fn(),
    requestFirstPage: vi.fn(),
    requestPreviousPage: vi.fn(),
    requestNextPage: vi.fn(),
    requestLastPage: vi.fn(),
    refresh: vi.fn(),
    canRequestNewPage: () => true
});

beforeEach(() => {
    useWiredCreatorToolsUiStore.setState({
        inspectionType: 'furni',
        variablesType: 'user',
        editingVariable: null,
        editingValue: '',
        isInspectionGiveOpen: false
    } as never);
});

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    vi.clearAllMocks();
});

describe('HandheldWiredToolsView', () => {
    const renderShell = (pickedKey: string, onTab = vi.fn()) =>
        withWindows(
            <HandheldWiredToolsView
                activeTab="inspection"
                pickHint="Tap a furni in the room"
                pickedKey={pickedKey}
                tabs={TABS}
                title="Wired"
                onClose={vi.fn()}
                onTab={onTab}
            >
                {({ startPicking }) => (
                    <button type="button" onClick={startPicking}>
                        pick
                    </button>
                )}
            </HandheldWiredToolsView>
        );

    it('shows the tabs as pills and hands a tab change to the tools', () => {
        phone();
        const onTab = vi.fn();

        renderShell('a', onTab);
        fireEvent.click(screen.getByRole('tab', { name: 'Monitor' }));

        expect(onTab).toHaveBeenCalledWith('monitor');
    });

    it('puts the sheet aside while picking and brings it back once something else is picked in the room', () => {
        phone();
        const view = renderShell('furni:1');
        const sheet = () => document.querySelector('[data-window-key="wired-creator-tools"]');

        fireEvent.click(screen.getByText('pick'));

        expect(sheet()?.hasAttribute('data-handheld-peeked')).toBe(true);
        expect(document.querySelector('.octane-handheld-peek-bar')?.textContent).toContain('Tap a furni in the room');

        view.rerender(
            <HandheldWiredToolsView
                activeTab="inspection"
                pickHint="Tap a furni in the room"
                pickedKey="furni:2"
                tabs={TABS}
                title="Wired"
                onClose={vi.fn()}
                onTab={vi.fn()}
            >
                {() => null}
            </HandheldWiredToolsView>
        );

        expect(sheet()?.hasAttribute('data-handheld-peeked')).toBe(false);
    });

    it('lets the room be looked at and comes back from the bar', () => {
        phone();
        renderShell('a');
        fireEvent.click(screen.getByTestId('wired-show-room'));

        expect(document.querySelector('[data-window-key="wired-creator-tools"]')?.hasAttribute('data-handheld-peeked')).toBe(true);

        fireEvent.click(document.querySelector('.octane-handheld-peek-bar__button') as HTMLElement);

        expect(document.querySelector('[data-window-key="wired-creator-tools"]')?.hasAttribute('data-handheld-peeked')).toBe(false);
    });
});

const inspectionProps = (overrides: Partial<HandheldWiredInspectionTabProps> = {}): HandheldWiredInspectionTabProps => ({
    selectedFurni: { objectId: 5, category: 10, info: { name: 'Trigger' } as never },
    selectedUser: null,
    roomId: 1,
    previewPlaceholder: 'Select a furni',
    keepSelected: false,
    onKeepSelectedChange: vi.fn(),
    displayedVariables: [
        { key: '@altitude', value: '125', editable: true },
        { key: '@id', value: '5', editable: false }
    ],
    selectedInspectionVariableKey: '@id',
    onSelectInspectionVariable: vi.fn(),
    onCancelVariableEdit: vi.fn(),
    onVariableInputKeyDown: vi.fn(),
    onBeginVariableEdit: vi.fn(),
    onCommitVariableEdit: vi.fn(),
    selectedInspectionGiveDefinition: { itemId: 1, name: 'score', hasValue: true },
    onSelectGiveVariable: vi.fn(),
    availableInspectionDefinitions: [{ itemId: 1, name: 'score', hasValue: true }],
    inspectionGiveValue: '0',
    onInspectionGiveValueChange: vi.fn(),
    canGiveInspectionVariable: true,
    onGiveInspectionVariable: vi.fn(),
    canRemoveInspectionVariable: false,
    onRemoveInspectionVariable: vi.fn(),
    canHighlightWireds: true,
    isHighlightingWireds: false,
    onToggleHighlightWireds: vi.fn(),
    onStartPicking: vi.fn(),
    ...overrides
});

describe('HandheldWiredInspectionTab', () => {
    it('picks a variable row, starts picking in the room and gates Remove on the desktop rule', () => {
        phone();
        const props = inspectionProps();

        render(<HandheldWiredInspectionTab {...props} />);
        fireEvent.click(screen.getByTestId('wired-variable-@altitude'));
        fireEvent.click(screen.getByTestId('wired-pick'));
        fireEvent.click(screen.getByTestId('wired-highlight-wireds'));

        expect(props.onSelectInspectionVariable).toHaveBeenCalledWith(props.displayedVariables[0]);
        expect(props.onStartPicking).toHaveBeenCalledTimes(1);
        expect(props.onToggleHighlightWireds).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('wired-remove-variable')).toBeDisabled();
    });

    it('edits a value in place with Save and Cancel', () => {
        phone();
        useWiredCreatorToolsUiStore.setState({ editingVariable: '@altitude', editingValue: '125' } as never);
        const props = inspectionProps();

        render(<HandheldWiredInspectionTab {...props} />);
        fireEvent.change(screen.getByRole('textbox', { name: '@altitude' }), { target: { value: '200' } });

        expect(useWiredCreatorToolsUiStore.getState().editingValue).toBe('200');

        fireEvent.click(screen.getByTestId('wired-variable-save'));
        fireEvent.click(screen.getByTestId('wired-variable-cancel'));

        expect(props.onCommitVariableEdit).toHaveBeenCalledTimes(1);
        expect(props.onCancelVariableEdit).toHaveBeenCalledTimes(1);
    });

    it('opens the Give form from the bar and creates through the desktop handler', () => {
        phone();
        const props = inspectionProps();

        render(<HandheldWiredInspectionTab {...props} />);
        fireEvent.click(screen.getByTestId('wired-give-variable'));
        fireEvent.click(screen.getByTestId('wired-give-create'));

        expect(useWiredCreatorToolsUiStore.getState().isInspectionGiveOpen).toBe(true);
        expect(props.onGiveInspectionVariable).toHaveBeenCalledTimes(1);
    });

    it('switches the element type through the store', () => {
        phone();
        render(<HandheldWiredInspectionTab {...inspectionProps()} />);
        fireEvent.click(screen.getByTestId('wired-choice-user'));

        expect(useWiredCreatorToolsUiStore.getState().inspectionType).toBe('user');
    });
});

const definition = (key: string) => ({ key, itemId: 1, variableId: '1', target: 'User', type: 'Created', hasValue: true, availability: 'Permanent' }) as never;

const variablesProps = () => ({
    variablePickerDefinitions: [definition('score'), definition('lives')],
    selectedVariableDefinition: definition('score'),
    onPickVariable: vi.fn(),
    canVariableHighlight: true,
    variableManageCanOpen: true,
    onOpenManagePanel: vi.fn(),
    arrayInspectorCanOpen: false,
    onOpenArrayInspector: vi.fn(),
    canVariableClear: false,
    onClearVariable: vi.fn(),
    selectedVariableProperties: [{ key: 'Type', value: 'Created' }],
    selectedVariableTextValues: []
});

describe('HandheldWiredVariablesTab', () => {
    it('opens a variable as a page upright and goes back to the list', () => {
        phone('portrait');
        const props = variablesProps();

        render(<HandheldWiredVariablesTab {...props} />);

        expect(screen.queryByTestId('wired-variable-detail')).toBeNull();

        fireEvent.click(screen.getByTestId('wired-picker-score'));

        expect(props.onPickVariable).toHaveBeenCalledWith('score');
        expect(screen.getByTestId('wired-variable-detail')).toBeInTheDocument();
        expect(screen.queryByTestId('wired-picker-lives')).toBeNull();

        fireEvent.click(screen.getByTestId('wired-variable-manage'));
        expect(props.onOpenManagePanel).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('wired-variable-clear')).toBeDisabled();
        expect(screen.getByTestId('wired-variable-contents')).toBeDisabled();

        fireEvent.click(screen.getByTestId('wired-back'));
        expect(screen.getByTestId('wired-picker-lives')).toBeInTheDocument();
    });

    it('shows the list and the picked variable side by side on its side', () => {
        phone('landscape');
        render(<HandheldWiredVariablesTab {...variablesProps()} />);

        expect(screen.getByTestId('wired-picker-lives')).toBeInTheDocument();
        expect(screen.getByTestId('wired-variable-detail')).toBeInTheDocument();
        expect(screen.queryByTestId('wired-back')).toBeNull();
    });
});

const monitorProps = (overrides: Partial<HandheldWiredMonitorTabProps> = {}): HandheldWiredMonitorTabProps => ({
    monitorStats: [{ label: 'Wired usage', value: '1/10' }],
    monitorLogs: [
        { errorId: 3, type: 'KILLED', category: 'ERROR', amount: '2', latest: 'now', latestReason: 'loop', latestSourceId: 9, latestSourceLabel: 'box' }
    ],
    monitorHistoryRows: [{ id: 'h' }],
    onOpenMonitorInfo: vi.fn(),
    onOpenMonitorHistory: vi.fn(),
    onOpenRoomLogs: vi.fn(),
    canClearLogs: false,
    onClearMonitorLogs: vi.fn(),
    onOpenMonitorLogDetails: vi.fn(),
    isHistoryOpen: false,
    onCloseHistory: vi.fn(),
    historyRows: [{ id: 'h', type: 'KILLED', category: 'ERROR', occurredAt: '20:00', reason: 'loop', sourceLabel: 'box', sourceId: 9 }],
    severityFilter: 'ALL',
    onSeverityFilterChange: vi.fn(),
    typeFilter: 'ALL',
    typeOptions: ['ALL'],
    onTypeFilterChange: vi.fn(),
    formatSource: (label) => label,
    onOpenHistoryDetails: vi.fn(),
    isInfoOpen: false,
    onCloseInfo: vi.fn(),
    infoSections: [],
    errorInfo: null,
    errorDetails: null,
    errorSource: '',
    onCloseError: vi.fn(),
    ...overrides
});

describe('HandheldWiredMonitorTab', () => {
    it('opens a log line through the desktop handler and keeps Clear all for those who may modify', () => {
        phone();
        const props = monitorProps();

        render(<HandheldWiredMonitorTab {...props} />);
        fireEvent.click(screen.getByTestId('wired-log-KILLED'));
        fireEvent.click(screen.getByTestId('wired-room-logs'));
        fireEvent.click(screen.getByTestId('wired-monitor-history'));

        expect(props.onOpenMonitorLogDetails).toHaveBeenCalledWith(
            'KILLED',
            expect.objectContaining({ errorId: 3, severity: 'ERROR', amount: '2', sourceId: 9 })
        );
        expect(props.onOpenRoomLogs).toHaveBeenCalledTimes(1);
        expect(props.onOpenMonitorHistory).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('wired-monitor-clear')).toBeDisabled();
    });

    it('shows an error as a page upright, with Back', () => {
        phone('portrait');
        const props = monitorProps({ errorInfo: { title: 'KILLED', severity: 'ERROR', description: ['Stopped.'] } });

        render(<HandheldWiredMonitorTab {...props} />);

        expect(screen.queryByTestId('wired-monitor-stats')).toBeNull();
        expect(within(screen.getByTestId('wired-monitor-error')).getByText('Stopped.')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('wired-back'));
        expect(props.onCloseError).toHaveBeenCalledTimes(1);
    });

    it('lists the history as a page whose lines open with their time', () => {
        phone('landscape');
        const props = monitorProps({ isHistoryOpen: true });

        render(<HandheldWiredMonitorTab {...props} />);
        fireEvent.click(screen.getByTestId('wired-history-entry'));

        expect(props.onOpenHistoryDetails).toHaveBeenCalledWith('KILLED', expect.objectContaining({ occurredAt: '20:00', sourceId: 9 }));
    });
});

describe('WiredPagedTable on a phone', () => {
    const table = (pageRequests: ReturnType<typeof requests>) => (
        <WiredPagedTable
            columns={[
                { id: 'name', title: 'Name', handheld: 'title' },
                { id: 'value', title: 'Value' }
            ]}
            currentPage={1}
            emptyText="Nothing"
            getCell={(row: { id: string; value: number }, column) => ({ content: column === 'name' ? row.id : String(row.value) })}
            getRowId={(row) => row.id}
            lastPage={3}
            requests={pageRequests as never}
            rows={[
                { id: 'Kim', value: 4 },
                { id: 'Jordy', value: 9 }
            ]}
            totalEntries={60}
        />
    );

    it('shows the rows as cards over a pager that asks through the same requests', () => {
        phone();
        const pageRequests = requests();

        render(table(pageRequests));

        expect(screen.getAllByTestId('wired-paged-entry')).toHaveLength(2);
        expect(document.querySelector('table')).toBeNull();
        expect(screen.getByTestId('wired-page-previous')).toBeDisabled();

        fireEvent.click(screen.getByTestId('wired-page-next'));
        expect(pageRequests.requestNextPage).toHaveBeenCalledTimes(1);
    });

    it('keeps the desktop table when no phone layout is on', () => {
        render(table(requests()));

        expect(document.querySelector('table')).not.toBeNull();
        expect(screen.queryByTestId('wired-paged-list')).toBeNull();
    });

    it('tells an empty page apart', () => {
        phone();
        render(
            <WiredPagedTable
                columns={[{ id: 'a', title: 'A' }]}
                currentPage={NO_PAGE}
                emptyText="Nothing yet"
                getCell={() => ({ content: '' })}
                getRowId={() => ''}
                lastPage={NO_PAGE}
                requests={requests() as never}
                rows={[]}
                totalEntries={0}
            />
        );

        expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    });
});

describe('holder page', () => {
    const holderProps = () => ({
        title: 'Kim',
        warningText: '',
        onRefresh: vi.fn(),
        onClose: vi.fn(),
        preview: null,
        infoLines: ['Name: Kim'],
        variablesTitle: 'Assigned variables:',
        entries: [{ id: '1', name: 'score', availability: '', hasValue: true, value: 4 }],
        selectedId: '1',
        onSelect: vi.fn(),
        canEdit: true,
        editingId: null,
        editingValue: '',
        onBeginEdit: vi.fn(),
        onEditingValueChange: vi.fn(),
        onEditBlur: vi.fn(),
        onEditKeyDown: vi.fn(),
        onCommitEdit: vi.fn(),
        isGiveOpen: false,
        onToggleGive: vi.fn(),
        giveOptions: [],
        giveSelectedId: '',
        onGiveSelect: vi.fn(),
        giveValue: '0',
        onGiveValueChange: vi.fn(),
        canGive: false,
        onGive: vi.fn(),
        canRemove: true,
        onRemove: vi.fn()
    });

    it('is a page on a phone: a second tap on the selected variable opens its value, Back closes it', () => {
        phone();
        const props = holderProps();

        withWindows(<WiredVariableHolderPanelView {...props} />);
        fireEvent.click(screen.getByTestId('wired-holder-variable-1'));
        fireEvent.click(screen.getByTestId('wired-holder-remove'));
        fireEvent.click(screen.getByTestId('wired-back'));

        expect(props.onBeginEdit).toHaveBeenCalledWith(props.entries[0]);
        expect(props.onRemove).toHaveBeenCalledTimes(1);
        expect(props.onClose).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('wired-holder-give')).toBeDisabled();
    });

    it('stays the desktop window without the phone layout', () => {
        withWindows(<WiredVariableHolderPanelView {...holderProps()} />);

        expect(document.querySelector('.octane-handheld-wired')).toBeNull();
        expect(document.querySelector('.octane-wired-holder')).not.toBeNull();
    });
});

describe('room tabs on a phone', () => {
    it('settings: implied boxes are locked, a box saves the masks, Rollback is for who may manage', () => {
        phone();
        mocks.roomSettings.canManageSettings = true;
        render(<WiredToolsSettingsTabView />);

        // "Users with rights" may modify, so it may inspect too: shown checked and locked.
        const settings = screen.getByTestId('wired-settings');
        const rights = within(settings).getAllByRole('checkbox', { name: 'Users with rights' });

        expect(rights[1]).toHaveAttribute('aria-checked', 'true');
        expect(rights[1]).toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(within(settings).getAllByRole('checkbox', { name: 'Group members' })[0]);
        expect(mocks.saveRoomSettings).toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('wired-reload'));
        expect(mocks.reloadRoomWired).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('wired-rollback')).not.toBeDisabled();
    });

    it('chests: only the room owner may lock every chest', () => {
        phone();
        mocks.session.isRoomOwner = false;
        render(<WiredChestsTabView />);

        expect(screen.getByTestId('wired-chests-lock-all')).toBeDisabled();
        expect(screen.getByTestId('wired-chests-lock-own')).not.toBeDisabled();
        expect(screen.getByText('Only the room owner can lock every chest.')).toBeInTheDocument();
    });
});
