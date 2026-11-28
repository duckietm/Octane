import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { HandheldModButton, HandheldModFact, HandheldModFacts, HandheldModNote, useHandheldModPageTitle } from './HandheldModPage';

export interface HandheldModUserAction {
    id: string;
    label: string;
    enabled: boolean;
    tone?: 'primary' | 'danger' | 'plain';
    onClick: () => void;
}

interface HandheldModUserInfoPanelProps {
    /** Null until the answer for this user arrives. */
    name: string | null;
    /** The user is in the moderator's room. */
    present: boolean;
    facts: HandheldModFact[];
    actions: HandheldModUserAction[];
    loadingText: string;
    /** The panel is the user info page: the page's tab carries the user's name. */
    pageTitle?: boolean;
}

/**
 * The user info panel on a phone (UserInfoPanel's twin): the user's name, the facts of the desktop panel as rows (a count
 * above zero links to its records), and the panel's buttons, finger-sized and enabled by the same rules.
 */
export const HandheldModUserInfoPanel: FC<HandheldModUserInfoPanelProps> = ({ name, present, facts, actions, loadingText, pageTitle = false }) => {
    useHandheldModPageTitle(pageTitle && name ? name : null);

    if (name === null) {
        return (
            <NativeTextTree>
                <div className="octane-handheld-modtools__card" data-testid="mod-user-loading">
                    <HandheldModNote text={loadingText} />
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-handheld-modtools__user" data-testid="mod-user-info">
                <div className="octane-handheld-modtools__card octane-handheld-modtools__user-head">
                    <span className={`octane-handheld-modtools__dot${present ? ' is-present' : ''}`} />
                    <span className="octane-handheld-modtools__user-name">{name}</span>
                    {present && (
                        <span className="octane-handheld-modtools__tag">{localizeWithFallback('octane.handheld.mod_tools.in_room', 'In your room')}</span>
                    )}
                </div>
                <div className="octane-handheld-modtools__card">
                    <HandheldModFacts facts={facts} testId="mod-user-facts" />
                </div>
                <div className="octane-handheld-modtools__actions">
                    {actions.map((action) => (
                        <HandheldModButton
                            key={action.id}
                            disabled={!action.enabled}
                            label={action.label}
                            testId={`mod-user-${action.id}`}
                            tone={action.tone}
                            onClick={action.onClick}
                        />
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};
