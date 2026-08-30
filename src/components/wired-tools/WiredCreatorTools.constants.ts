import contextInspectionIcon from '../../assets/images/wiredtools/context.png';
import furniInspectionIcon from '../../assets/images/wiredtools/furni.png';
import globalInspectionIcon from '../../assets/images/wiredtools/global.png';
import userInspectionIcon from '../../assets/images/wiredtools/user.png';
import { InspectionElementButton, VariableDefinition, VariablesElementButton, VariablesElementType, WiredToolsTab } from './WiredCreatorTools.types';

export const TABS: Array<{ key: WiredToolsTab; label: string }> = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'variables', label: 'Variables' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'chests', label: 'Chests' },
    { key: 'settings', label: 'Settings' }
];

export const MONITOR_LOG_ORDER: string[] = ['EXECUTION_CAP', 'DELAYED_EVENTS_CAP', 'EXECUTOR_OVERLOAD', 'MARKED_AS_HEAVY', 'KILLED', 'RECURSION_TIMEOUT', 'NO_TARGETS'];

export const WIRED_MONITOR_ACTION_FETCH = 0;
export const WIRED_MONITOR_ACTION_CLEAR_LOGS = 1;
export const WIRED_MONITOR_POLL_MS = 250;
export const WIRED_VARIABLES_POLL_MS = 250;
export const WIRED_INSPECTION_REFRESH_MS = 50;
export const WIRED_CLOCK_REFRESH_MS = 50;

export const MONITOR_ERROR_INFO: Record<string, { description: string[]; severity: string; title: string }> = {
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

export const INTERNAL_FURNI_OPACITY_VARIABLE_ITEM_ID = -1001;
export const INTERNAL_FURNI_GRAVITY_VARIABLE_ITEM_ID = -1002;

export const EDITABLE_FURNI_VARIABLES: string[] = ['@position_x', '@position_y', '@rotation', '@altitude', '@state', '@opacity', '@gravity', '@wallitem_offset'];
export const WIRED_FURNI_RUNTIME_ACTION_READ = 0;
export const WIRED_FURNI_RUNTIME_ACTION_WRITE = 1;
export const EDITABLE_USER_VARIABLES: string[] = ['@position_x', '@position_y', '@direction'];

const createVariableDefinition = (
    key: string,
    target: 'Furni' | 'User' | 'Global' | 'Context',
    availability: string = 'Always',
    canWriteTo = false
): VariableDefinition => ({
    key,
    target,
    type: 'Internal',
    hasValue: true,
    availability,
    canWriteTo,
    canCreateDelete: false,
    canIntercept: false,
    hasCreationTime: false,
    hasUpdateTime: false,
    isTextConnected: false,
    isAlwaysAvailable: availability === 'Always'
});

export const VARIABLE_DEFINITIONS: Record<VariablesElementType, VariableDefinition[]> = {
    furni: [
        createVariableDefinition('~teleport.target_id', 'Furni', 'Conditional'),
        createVariableDefinition('@id', 'Furni'),
        createVariableDefinition('@class_id', 'Furni'),
        createVariableDefinition('@height', 'Furni'),
        createVariableDefinition('@state', 'Furni', 'Always', true),
        createVariableDefinition('@position_x', 'Furni', 'Always', true),
        createVariableDefinition('@position_y', 'Furni', 'Always', true),
        createVariableDefinition('@rotation', 'Furni', 'Always', true),
        createVariableDefinition('@altitude', 'Furni', 'Always', true),
        createVariableDefinition('@opacity', 'Furni', 'Always', true),
        createVariableDefinition('@gravity', 'Furni', 'Always', true),
        createVariableDefinition('@is_invisible', 'Furni', 'Conditional'),
        createVariableDefinition('@wallitem_offset', 'Furni', 'Conditional', true),
        createVariableDefinition('@type', 'Furni'),
        createVariableDefinition('@can_sit_on', 'Furni', 'Conditional'),
        createVariableDefinition('@can_lay_on', 'Furni', 'Conditional'),
        createVariableDefinition('@can_stand_on', 'Furni', 'Conditional'),
        createVariableDefinition('@is_stackable', 'Furni', 'Conditional'),
        createVariableDefinition('@dimensions.x', 'Furni'),
        createVariableDefinition('@dimensions.y', 'Furni'),
        createVariableDefinition('@owner_id', 'Furni')
    ],
    user: [
        createVariableDefinition('@index', 'User'),
        createVariableDefinition('@type', 'User'),
        createVariableDefinition('@gender', 'User'),
        createVariableDefinition('@level', 'User'),
        createVariableDefinition('@achievement_score', 'User'),
        createVariableDefinition('@is_hc', 'User', 'Conditional'),
        createVariableDefinition('@has_rights', 'User', 'Conditional'),
        createVariableDefinition('@is_owner', 'User', 'Conditional'),
        createVariableDefinition('@is_group_admin', 'User', 'Conditional'),
        createVariableDefinition('@is_muted', 'User', 'Conditional'),
        createVariableDefinition('@is_trading', 'User', 'Conditional'),
        createVariableDefinition('@is_frozen', 'User', 'Conditional'),
        createVariableDefinition('@effect_id', 'User', 'Conditional'),
        createVariableDefinition('@team_score', 'User', 'Conditional'),
        createVariableDefinition('@team_color', 'User', 'Conditional'),
        createVariableDefinition('@team_type', 'User', 'Conditional'),
        createVariableDefinition('@sign', 'User', 'Conditional'),
        createVariableDefinition('@dance', 'User', 'Conditional'),
        createVariableDefinition('@is_idle', 'User', 'Conditional'),
        createVariableDefinition('@handitem_id', 'User', 'Conditional'),
        createVariableDefinition('@position_x', 'User', 'Always', true),
        createVariableDefinition('@position_y', 'User', 'Always', true),
        createVariableDefinition('@direction', 'User', 'Always', true),
        createVariableDefinition('@altitude', 'User'),
        createVariableDefinition('@favourite_group_id', 'User', 'Conditional'),
        createVariableDefinition('@room_entry.method', 'User', 'Conditional'),
        createVariableDefinition('@room_entry.teleport_id', 'User', 'Conditional'),
        createVariableDefinition('@user_id', 'User', 'Conditional'),
        createVariableDefinition('@bot_id', 'User', 'Conditional'),
        createVariableDefinition('@pet_id', 'User', 'Conditional'),
        createVariableDefinition('@pet_owner_id', 'User', 'Conditional')
    ],
    global: [
        createVariableDefinition('@furni_count', 'Global'),
        createVariableDefinition('@user_count', 'Global'),
        createVariableDefinition('@wired_timer', 'Global'),
        createVariableDefinition('@team_red_score', 'Global'),
        createVariableDefinition('@team_green_score', 'Global'),
        createVariableDefinition('@team_blue_score', 'Global'),
        createVariableDefinition('@team_yellow_score', 'Global'),
        createVariableDefinition('@team_red_size', 'Global'),
        createVariableDefinition('@team_green_size', 'Global'),
        createVariableDefinition('@team_blue_size', 'Global'),
        createVariableDefinition('@team_yellow_size', 'Global'),
        createVariableDefinition('@room_id', 'Global'),
        createVariableDefinition('@group_id', 'Global'),
        createVariableDefinition('@timezone_server', 'Global'),
        createVariableDefinition('@timezone_client', 'Global'),
        createVariableDefinition('@current_time', 'Global'),
        createVariableDefinition('@current_time.millisecond_of_second', 'Global'),
        createVariableDefinition('@current_time.seconds_of_minute', 'Global'),
        createVariableDefinition('@current_time.minute_of_hour', 'Global'),
        createVariableDefinition('@current_time.hour_of_day', 'Global'),
        createVariableDefinition('@current_time.day_of_week', 'Global'),
        createVariableDefinition('@current_time.day_of_month', 'Global'),
        createVariableDefinition('@current_time.day_of_year', 'Global'),
        createVariableDefinition('@current_time.week_of_year', 'Global'),
        createVariableDefinition('@current_time.month_of_year', 'Global'),
        createVariableDefinition('@current_time.year', 'Global')
    ],
    context: [
        createVariableDefinition('@selector_furni_count', 'Context', 'Conditional'),
        createVariableDefinition('@selector_user_count', 'Context', 'Conditional'),
        createVariableDefinition('@signal_furni_count', 'Context', 'Conditional'),
        createVariableDefinition('@signal_user_count', 'Context', 'Conditional'),
        createVariableDefinition('@antenna_id', 'Context', 'Conditional'),
        createVariableDefinition('@chat_type', 'Context', 'Conditional'),
        createVariableDefinition('@chat_style', 'Context', 'Conditional')
    ]
};

export const WIRED_FREEZE_EFFECT_IDS: Set<number> = new Set([218, 12, 11, 53, 163]);

export const TEAM_COLOR_NAMES: Record<number, string> = {
    1: 'red',
    2: 'green',
    3: 'blue',
    4: 'yellow'
};

export const WEEKDAY_NAMES: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTH_NAMES: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DIRECTION_NAMES: string[] = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
