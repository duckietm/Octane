import { WiredActionLayoutCode } from './WiredActionLayoutCode';
import { WiredAddonLayoutCode } from './WiredAddonLayoutCode';
import { WiredConditionlayout } from './WiredConditionLayoutCode';
import { WiredTriggerLayout } from './WiredTriggerLayoutCode';

export type WiredHolderKind = 'trigger' | 'action' | 'condition' | 'addon' | 'selector' | 'variable';

/** The official header button modes (HeaderPreset.as). */
export type WiredHeaderButtonMode = 'apply_snapshot' | 'view_in_menu' | 'view_logs' | 'web_api_docs';

export const WIRED_HEADER_BUTTON_KEYS: Record<WiredHeaderButtonMode, { key: string; fallback: string }> = {
    apply_snapshot: { key: 'wiredfurni.applysnapshot', fallback: 'Apply settings to the picked furni' },
    view_in_menu: { key: 'wiredfurni.view_in_menu', fallback: 'View in menu' },
    view_logs: { key: 'wiredfurni.params.write_to_logs.view', fallback: 'View the logs' },
    web_api_docs: { key: 'wiredfurni.params.web_api.link', fallback: 'Open API docs' }
};

/**
 * Which header button an element shows, as the official client decides: the snapshot boxes (match
 * to snapshot, "furni state is changed" and place furni) apply their saved state, variables open the
 * variable overview, the log action opens the logs and the web API add-on opens its docs.
 */
export const resolveWiredHeaderButton = (holder: WiredHolderKind, code: number): WiredHeaderButtonMode | null => {
    switch (holder) {
        case 'condition':
            return code === WiredConditionlayout.STATES_MATCH || code === WiredConditionlayout.NOT_STATES_MATCH ? 'apply_snapshot' : null;
        case 'trigger':
            return code === WiredTriggerLayout.STATE_CHANGE ? 'apply_snapshot' : null;
        case 'action':
            if (code === WiredActionLayoutCode.SET_FURNI_STATE || code === WiredActionLayoutCode.PLACE_FURNI) return 'apply_snapshot';
            return code === WiredActionLayoutCode.WRITE_TO_LOGS || code === WiredActionLayoutCode.WRITE_TO_LOGS_NEGATIVE ? 'view_logs' : null;
        case 'addon':
            return code === WiredAddonLayoutCode.VARIABLES_WEB_API ? 'web_api_docs' : null;
        case 'variable':
            return 'view_in_menu';
        default:
            return null;
    }
};

/** Official: the editor title is "kind: name"; the kind goes on its own upper-cased line. */
export const splitWiredName = (name: string): { kind: string; title: string } => {
    const text = name ?? '';
    const index = text.indexOf(':');

    if (index < 0) return { kind: '', title: text };

    return { kind: text.slice(0, index).trim().toUpperCase(), title: text.slice(index + 1).trim() };
};
