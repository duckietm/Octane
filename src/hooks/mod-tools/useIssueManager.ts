import {
    GetSessionDataManager,
    IssueDeletedMessageEvent,
    IssueInfoMessageEvent,
    IssuePickFailedMessageEvent,
    ModeratorInitMessageEvent,
    ModeratorToolPreferencesEvent,
    PickIssuesMessageComposer,
    ReleaseIssuesMessageComposer
} from '@octane/renderer';
import { useEffect, useMemo } from 'react';
import { PlaySound, SendMessageComposer, SoundNames, localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { showModAlert } from './modAlertStore';
import {
    bundlesFor,
    IssueManagerContext,
    ISSUE_STATE_OPEN,
    onIssueDeleted,
    onIssueInfo,
    pickNext,
    releaseBundle,
    useIssueManagerStore
} from './issueManagerStore';
import { MOD_WINDOW_SIZE, useModWindowTrackerStore } from './modWindowTrackerStore';

/** Classic GI.update: the browser re-reads its lists every 15 seconds (`_rd13dc7dad9d4b9`). */
const UPDATE_INTERVAL = 15000;

/**
 * Classic ModerationMessageHandler / IssueManager wiring: issue messages feed the manager (and the init message's issue list), a failed pick retries or alerts, and the tick
 * keeps the browser rows current. The returned context is what the manager calls out to (sending picks and releases, opening handlers).
 */
export const useIssueManager = (): IssueManagerContext => {
    const context = useMemo<IssueManagerContext>(
        () => ({
            get userId() {
                return GetSessionDataManager().userId;
            },
            pick: (issueIds, retry, retryCount, reason) => SendMessageComposer(new PickIssuesMessageComposer(issueIds, retry, retryCount, reason)),
            release: (issueIds) => SendMessageComposer(new ReleaseIssuesMessageComposer(issueIds)),
            // GI._rf0cee18d10867c: the handler of a bundle opens at the saved position (explicit position flag), replacing one that is already open
            openHandler: (bundleId) => {
                const { preferences } = useIssueManagerStore.getState();

                useModWindowTrackerStore.getState().show({ type: 'issueHandler', key: `${bundleId}`, ...MOD_WINDOW_SIZE.issueHandler, parent: null, at: { x: preferences.x, y: preferences.y } });
            },
            closeHandler: (bundleId) => useModWindowTrackerStore.getState().close('issueHandler', `${bundleId}`),
            refreshHandler: () => undefined,
            notifyNewIssue: () => PlaySound(SoundNames.MODTOOLS_NEW_TICKET),
            isBrowserOpen: () => {
                const entry = useModWindowTrackerStore.getState().get('issueBrowser', 'main');

                return entry != null && !entry.hidden;
            }
        }),
        []
    );

    useMessageEvent<ModeratorInitMessageEvent>(ModeratorInitMessageEvent, (event) => {
        for (const issue of event.getParser()?.data?.issues ?? []) onIssueInfo(issue, context);
    });

    // vT: the handler window's saved geometry (_r5a5d3ab441458f)
    useMessageEvent<ModeratorToolPreferencesEvent>(ModeratorToolPreferencesEvent, (event) => {
        const parser = event.getParser();

        if (parser) useIssueManagerStore.setState({ preferences: { x: parser.windowX, y: parser.windowY, width: parser.windowWidth, height: parser.windowHeight } });
    });

    useMessageEvent<IssueInfoMessageEvent>(IssueInfoMessageEvent, (event) => {
        const issue = event.getParser()?.issueData;

        if (issue) onIssueInfo(issue, context);
    });

    useMessageEvent<IssueDeletedMessageEvent>(IssueDeletedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser) onIssueDeleted(parser.issueId);
    });

    // _rc6201b5d59dcf6: when another moderator already holds an issue, its bundle is released again and, with retries on, the next open issue is picked; otherwise the alert shows
    useMessageEvent<IssuePickFailedMessageEvent>(IssuePickFailedMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        let heldByOthers = false;

        for (const issue of parser.issues ?? []) {
            if (issue.pickerUserId !== -1 && issue.pickerUserId !== context.userId) heldByOthers = true;

            for (const bundle of useIssueManagerStore.getState().bundles.values()) {
                if (bundle.contains(issue.issueId)) {
                    context.closeHandler(bundle.id);
                    releaseBundle(bundle.id, context);
                    break;
                }
            }
        }

        if (heldByOthers && parser.retryEnabled && parser.retryCount < 10) pickNext('pick failed retry', context, parser.retryEnabled, parser.retryCount);
        else showModAlert(localizeWithFallback('octane.mod_tools.issue_picking_failed', 'Issue picking failed'), 'Error');
    });

    useEffect(() => {
        const timer = window.setInterval(() => useIssueManagerStore.setState((state) => ({ version: state.version + 1 })), UPDATE_INTERVAL);

        return () => window.clearInterval(timer);
    }, []);

    return context;
};

export { bundlesFor, ISSUE_STATE_OPEN };
