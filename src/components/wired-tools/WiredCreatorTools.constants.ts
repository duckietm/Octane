import contextInspectionIcon from '../../assets/images/wiredtools/context.png';
import furniInspectionIcon from '../../assets/images/wiredtools/furni.png';
import globalInspectionIcon from '../../assets/images/wiredtools/global.png';
import userInspectionIcon from '../../assets/images/wiredtools/user.png';
import { InspectionElementButton, VariablesElementButton, WiredToolsTab } from './WiredCreatorTools.types';

export const TABS: Array<{ key: WiredToolsTab; label: string }> = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'variables', label: 'Variables' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'chests', label: 'Chests' },
    { key: 'settings', label: 'Settings' },
    // Ours: AIR has no wired sharing.
    { key: 'share', label: 'Share' }
];

export const MONITOR_LOG_ORDER: string[] = ['EXECUTION_CAP', 'DELAYED_EVENTS_CAP', 'EXECUTOR_OVERLOAD', 'MARKED_AS_HEAVY', 'KILLED', 'RECURSION_TIMEOUT', 'NO_TARGETS', 'UNREACHABLE', 'WIRED_LOG'];

export const WIRED_MONITOR_ACTION_FETCH = 0;
export const WIRED_MONITOR_ACTION_CLEAR_LOGS = 1;
export const WIRED_MONITOR_POLL_MS = 250;
/** AIR WiredMenuMonitorTab.POLL_MONITOR_MS: the room stats request (1957) goes out this often while the tab is open. */
export const WIRED_MONITOR_ROOM_STATS_POLL_MS = 500;
export const WIRED_VARIABLES_POLL_MS = 250;
export const WIRED_VARIABLES_IDLE_POLL_MS = 2000;
// The inspection tab reads its object on its own (AIR `WiredGetVariablesForObject`), so only the overview needs the live room snapshot.
export const WIRED_VARIABLES_LIVE_TABS = ['variables'];
export const WIRED_INSPECTION_REFRESH_MS = 50;
export const WIRED_CLOCK_REFRESH_MS = 50;

export const MONITOR_ERROR_INFO: Record<string, { description: string[]; severity: string; title: string }> = {
    // AIR's rows 7 and 8 have no `wiredmenu.error_info.<id>` text in the external texts; these stand in for it.
    TRANSACTION_FAILURE: {
        title: 'TRANSACTION_FAILURE',
        severity: 'ERROR',
        description: ['A wired transaction (a payment, trade or reward contract) could not be completed.']
    },
    PLACEMENT_FAILURE: {
        title: 'PLACEMENT_FAILURE',
        severity: 'ERROR',
        description: [
            'Place Furni could not place one or more of its copies: the room was full, the tile was taken, or a gate or roller was in the way.',
            'The room log shows which box failed and why.'
        ]
    },
    VARIABLE_FX_LIMIT: {
        title: 'VARIABLE_FX_LIMIT',
        severity: 'ERROR',
        description: ['The room shows as many variable effects as it may; a new one is not shown.']
    },
    WIRED_LOG: {
        title: 'WIRED_LOG',
        severity: 'INFO',
        description: [
            'A line a "write to logs" box in this room wrote, at the level the box was set to.',
            'Nothing is wrong with the engine: the room itself asked for this line, usually to show what a setup is doing while it is being built.',
            'Open the room log to read the lines and filter them by level.'
        ]
    },
    UNREACHABLE: {
        title: 'UNREACHABLE',
        severity: 'WARNING',
        description: [
            'A furni in this room is waiting on something the room has no way of producing, so it will sit there doing nothing.',
            'A highscore board is the usual case: it only fills when a game ends, and a game can only end through a game timer. Without one in the room the board stays empty forever.',
            'Nothing has failed. The furni is fine and so is the engine - the room is simply missing the piece that would feed it.'
        ]
    },
    NO_TARGETS: {
        title: 'NO_TARGETS',
        severity: 'WARNING',
        description: [
            'A chain fired and one of its effects had nothing to act on, so it did nothing.',
            'The reason names which source came back empty. "The triggering item" is empty when the trigger is not about a furni at all; "the selector" is empty when no selector picked anything; "the picked furni" is empty when the chosen furni have since been taken up.',
            'This is not an engine error. It means the setup asked for something that was not there, which until now was the one way a chain could fail in complete silence.'
        ]
    },
    EXECUTION_CAP: {
        title: 'EXECUTION_CAP',
        severity: 'ERROR',
        description: [
            'This error occurs when the maximum Wired usage limit is about to be exceeded by a Wired execution.',
            'When this happens, the current execution is cancelled so the room never goes over the configured usage budget.',
            'If this happens too often, it usually means the setup is too complex for the amount of triggers firing in a short time.'
        ]
    },
    DELAYED_EVENTS_CAP: {
        title: 'DELAYED_EVENTS_CAP',
        severity: 'ERROR',
        description: [
            'Delayed Wired events happen when effects are scheduled to run later.',
            'There is a limit to how many delayed events can be pending at the same time. Once the limit is reached, new delayed executions are refused.',
            'If this appears often, the setup is likely relying too heavily on delayed effects and should be simplified.'
        ]
    },
    EXECUTOR_OVERLOAD: {
        title: 'EXECUTOR_OVERLOAD',
        severity: 'ERROR',
        description: [
            'This error occurs when the Wired engine is receiving a lot of instructions and the room cannot keep up with the execution time.',
            'This can be a sign of server pressure or of a setup that is too expensive to evaluate repeatedly.',
            'If the room is also marked as heavy, it is a good sign that the setup should be reduced or optimized.'
        ]
    },
    MARKED_AS_HEAVY: {
        title: 'MARKED_AS_HEAVY',
        severity: 'WARNING',
        description: [
            'The room is being considered heavy because its Wired usage stays high across multiple monitor windows.',
            'This is not a fatal error by itself, but it means the room is consuming a significant portion of the execution budget.',
            'If the room is not intentionally complex, it is worth reviewing the setup before it starts triggering harder limits.'
        ]
    },
    KILLED: {
        title: 'KILLED',
        severity: 'ERROR',
        description: [
            'This happens when the room is temporarily halted by the protection layer because the Wired flow looks abusive or unstable.',
            'While the room is killed, Wired execution is paused for a cooldown period.',
            'This is usually caused by loops, event spam, or repeated limit violations.'
        ]
    },
    RECURSION_TIMEOUT: {
        title: 'RECURSION_TIMEOUT',
        severity: 'ERROR',
        description: [
            'Recursive Wired events happen when signals keep re-triggering other stacks in the same room.',
            'When the recursion depth limit is reached, execution is stopped to prevent runaway loops.',
            'In most cases this means two or more stacks are indirectly calling each other too many times.'
        ]
    }
};

export const INSPECTION_ELEMENTS: InspectionElementButton[] = [
    { key: 'furni', label: 'Furni', icon: furniInspectionIcon },
    { key: 'user', label: 'User', icon: userInspectionIcon },
    { key: 'global', label: 'Global', icon: globalInspectionIcon }
];

export const VARIABLES_ELEMENTS: VariablesElementButton[] = [
    { key: 'furni', label: 'Furni', icon: furniInspectionIcon },
    { key: 'user', label: 'User', icon: userInspectionIcon },
    { key: 'global', label: 'Global', icon: globalInspectionIcon },
    { key: 'context', label: 'Context', icon: contextInspectionIcon }
];

export const EDITABLE_FURNI_VARIABLES: string[] = [
    '@position_x',
    '@position_y',
    '@rotation',
    '@altitude',
    '@state',
    '@opacity',
    '@gravity',
    '@wallitem_offset',
    '~recolorable_furni.color.rgb',
    '~recolorable_furni.color.rgb.red',
    '~recolorable_furni.color.rgb.green',
    '~recolorable_furni.color.rgb.blue'
];
export const WIRED_FURNI_RUNTIME_ACTION_READ = 0;
export const WIRED_FURNI_RUNTIME_ACTION_WRITE = 1;
export const EDITABLE_USER_VARIABLES: string[] = ['@position_x', '@position_y', '@direction'];

/** Official text connectors of built-in variables: the label shown after a value, per holder. */
export const WIRED_BUILTIN_TEXT_CONNECTORS: Record<'furni' | 'user', Record<string, Record<number, string>>> = {
    furni: {
        '@type': { 0: 'Normal', 1: 'BC', 2: 'Temp' }
    },
    user: {
        '@direction': { 0: 'N', 1: 'NE', 2: 'E', 3: 'SE', 4: 'S', 5: 'SW', 6: 'W', 7: 'NW' },
        '@gender': { [-1]: 'Unknown', 0: 'M', 1: 'F' },
        '@type': { 1: 'User', 2: 'Pet', 3: 'Old bot', 4: 'Bot' }
    }
};

/** The built-in text connector label of a value, or undefined. */
export const getBuiltinTextConnectorLabel = (holder: 'furni' | 'user', key: string, value: number): string | undefined =>
    WIRED_BUILTIN_TEXT_CONNECTORS[holder][key]?.[value];

export const WIRED_FREEZE_EFFECT_IDS: Set<number> = new Set([218, 12, 11, 53, 163]);

export const TEAM_COLOR_NAMES: Record<number, string> = {
    1: 'red',
    2: 'green',
    3: 'blue',
    4: 'yellow'
};

export const WEEKDAY_NAMES: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTH_NAMES: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The built-ins Habbo sends packed (an empty text table, RoomWiredInternalVariables `packed()`): one value
 * that holds several, shown unpacked. The inspection explains them with `wiredmenu.inspection.packed_variable.desc`.
 */
export const PACKED_WIRED_VARIABLE_KEYS: ReadonlySet<string> = new Set(['@position', '@occupation', '~recolorable_furni.color.rgb']);
