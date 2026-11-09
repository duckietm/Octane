import { IssueMessageData } from '@octane/renderer';
import { createOctaneStore } from '../../state/createOctaneStore';

export const ISSUE_STATE_OPEN = 1;
export const ISSUE_STATE_PICKED = 2;
export const ISSUE_STATE_CLOSED = 3;

/** An issue as the moderator tool holds it: the message plus the time it arrived (the classic client's `getTimer()` stamp). */
export interface TrackedIssue {
    issue: IssueMessageData;
    receivedAt: number;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Classic `qc._ra5299c27b0a858`: how long one issue has been open, "hh:mm". */
export const issueOpenTime = (tracked: TrackedIssue, clock = now()): string => {
    const minutes = Math.floor(Math.floor((tracked.issue.issueAgeInMilliseconds + clock - tracked.receivedAt) / 1000) / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return `${hours < 10 ? '0' : ''}${hours}:${rest < 10 ? '0' : ''}${rest}`;
};

/** Classic `ame` (issue bundle): issues about the same subject (grouping id and reported user) in the same state and picker are shown as one row. */
export class IssueBundle {
    public readonly issues = new Map<number, TrackedIssue>();
    public state: number;
    public pickerUserId: number;
    public pickerName: string;
    public readonly reportedUserId: number;
    public readonly groupingId: number;
    private _messageCount = 0;
    private _newest: TrackedIssue = null;
    private _primary: TrackedIssue = null;

    constructor(public readonly id: number, first: TrackedIssue) {
        this.state = first.issue.state;
        this.pickerUserId = first.issue.pickerUserId;
        this.pickerName = first.issue.pickerUserName ?? '';
        this.reportedUserId = first.issue.reportedUserId;
        this.groupingId = first.issue.groupingId;
        this.add(first);
    }

    public matches(issue: IssueMessageData, ignoreStatePicker = false): boolean {
        return !(
            this.groupingId === 0 ||
            issue.groupingId === 0 ||
            this.groupingId !== issue.groupingId ||
            this.reportedUserId !== issue.reportedUserId ||
            (!ignoreStatePicker && (this.state !== issue.state || this.pickerUserId !== issue.pickerUserId))
        );
    }

    public contains(issueId: number): boolean {
        return this.issues.has(issueId);
    }

    public replace(tracked: TrackedIssue): void {
        this.remove(tracked.issue.issueId);
        this.add(tracked);
    }

    public remove(issueId: number): TrackedIssue {
        const removed = this.issues.get(issueId) ?? null;

        this.issues.delete(issueId);

        if (removed) {
            if ((removed.issue.message ?? '') !== '') this._messageCount--;

            if (this._newest === removed) this._newest = null;
            if (this._primary === removed) this._primary = null;
        }

        return removed;
    }

    private add(tracked: TrackedIssue): void {
        this.issues.set(tracked.issue.issueId, tracked);

        if ((tracked.issue.message ?? '') !== '') this._messageCount++;

        if (this._newest == null || tracked.issue.issueAgeInMilliseconds > this._newest.issue.issueAgeInMilliseconds) this._newest = tracked;

        this._primary = null;
    }

    public get issueIds(): number[] {
        return [...this.issues.keys()];
    }

    public get count(): number {
        return this.issues.size;
    }

    public get messageCount(): number {
        return this._messageCount;
    }

    /** The age of the newest issue (the sort key after the priority). */
    public get age(): number {
        return this._newest?.issue.issueAgeInMilliseconds ?? 0;
    }

    /** `_r6652783bf1648b`: of the issues, the lowest priority one whose reported category is in 1..99, else the lowest priority one of the rest. */
    public get primary(): TrackedIssue {
        if (this._primary) return this._primary;

        if (this.issues.size < 1) return null;

        let preferred: TrackedIssue = null;
        let other: TrackedIssue = null;

        for (const tracked of this.issues.values()) {
            const { reportedCategoryId, priority } = tracked.issue;

            if (reportedCategoryId > 0 && reportedCategoryId < 100) {
                if (preferred == null || preferred.issue.priority > priority) preferred = tracked;
            } else if (other == null || other.issue.priority > priority) other = tracked;
        }

        this._primary = preferred ?? other;

        return this._primary;
    }

    public get priority(): number {
        return this.primary?.issue.priority ?? 0;
    }

    /** `_ra5299c27b0a858`: how long the newest issue has been open as "hh:mm": its age plus the time since it arrived. */
    public openTime(clock = now()): string {
        let newest: TrackedIssue = null;

        for (const tracked of this.issues.values()) {
            if (newest == null || tracked.issue.issueAgeInMilliseconds > newest.issue.issueAgeInMilliseconds) newest = tracked;
        }

        if (!newest) return '';

        const minutes = Math.floor(Math.floor((newest.issue.issueAgeInMilliseconds + clock - newest.receivedAt) / 1000) / 60);
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;

        return `${hours < 10 ? '0' : ''}${hours}:${rest < 10 ? '0' : ''}${rest}`;
    }
}

interface IssueManagerState {
    issues: Map<number, TrackedIssue>;
    bundles: Map<number, IssueBundle>;
    issueBundle: Map<number, number>;
    nextBundleId: number;
    /** Issues the moderator asked to pick that have not been answered yet (`_r6d54f7f16cbe62`): their answer opens the handler. */
    pendingPick: number[];
    /** Issues the moderator asked to release (`_r65a92c25921a0c`). */
    pendingRelease: number[];
    /** The saved position of the issue handler window (ModeratorToolPreferences): the handler opens at x, y (0, 0 until the server says otherwise). */
    preferences: { x: number; y: number; width: number; height: number };
    /** Bumped on every change: the views re-read the manager. */
    version: number;
}

export const useIssueManagerStore = createOctaneStore<IssueManagerState>()(() => ({
    issues: new Map(),
    bundles: new Map(),
    issueBundle: new Map(),
    nextBundleId: 1,
    pendingPick: [],
    pendingRelease: [],
    preferences: { x: 0, y: 0, width: 0, height: 0 },
    version: 0
}));

const touch = () => useIssueManagerStore.setState((state) => ({ version: state.version + 1 }));

/**
 * Forgets the tracked issues before a full ModeratorInit list replaces them: the list only ever merged, so a ticket
 * closed while the socket was down stayed in the browser after the reconnect and picking it failed.
 */
export const resetTrackedIssues = () =>
    useIssueManagerStore.setState((state) => ({
        issues: new Map(),
        bundles: new Map(),
        issueBundle: new Map(),
        pendingPick: [],
        pendingRelease: [],
        version: state.version + 1
    }));

export interface IssueManagerContext {
    userId: number;
    /** Sends a pick for the issues (`EF`): the retry flag, the retry count and the reason of the call. */
    pick: (issueIds: number[], retry: boolean, retryCount: number, reason: string) => void;
    /** Sends a release for the issues (`MF`). */
    release: (issueIds: number[]) => void;
    /** Opens the handler for a bundle (`_rf0cee18d10867c`). */
    openHandler: (bundleId: number) => void;
    /** Disposes the handler of a bundle (`_r242784630dd192`). */
    closeHandler: (bundleId: number) => void;
    /** The handler of a bundle shows its issues again (`_r8ce51cc736cea8`). */
    refreshHandler: (bundleId: number) => void;
    /** A new issue arrived while the browser is closed (the new ticket sound). */
    notifyNewIssue: () => void;
    isBrowserOpen: () => boolean;
}

/** `_r2bdf209d0049c2`: the bundle an issue already belongs to, kept when it still matches and left (deleting an emptied bundle) when it does not. */
const currentBundle = (issue: IssueMessageData): IssueBundle => {
    const state = useIssueManagerStore.getState();
    const bundleId = state.issueBundle.get(issue.issueId) ?? 0;

    if (bundleId === 0) return null;

    const bundle = state.bundles.get(bundleId) ?? null;

    if (bundle == null) return null;

    if (bundle.matches(issue)) {
        bundle.replace({ issue, receivedAt: now() });

        return bundle;
    }

    bundle.remove(issue.issueId);

    if (bundle.count === 0) state.bundles.delete(bundle.id);

    state.issueBundle.delete(issue.issueId);

    return null;
};

/** Classic GI `_rf669d43291f75e`: an issue arrived or changed. */
export const onIssueInfo = (issue: IssueMessageData, context: IssueManagerContext): void => {
    const state = useIssueManagerStore.getState();
    const isNew = !state.issues.has(issue.issueId);

    // `_r82a619a151b36d`: the first sight of an issue sounds the new ticket alert unless the browser is open
    if (isNew && !context.isBrowserOpen()) context.notifyNewIssue();

    const tracked: TrackedIssue = { issue, receivedAt: now() };

    state.issues.delete(issue.issueId);
    state.issues.set(issue.issueId, tracked);

    let bundle = currentBundle(issue);

    if (issue.state === ISSUE_STATE_CLOSED) {
        state.issues.delete(issue.issueId);
        touch();

        return;
    }

    if (bundle == null) {
        for (const candidate of state.bundles.values()) {
            if (candidate.matches(issue)) {
                bundle = candidate;
                bundle.replace(tracked);
                state.issueBundle.set(issue.issueId, bundle.id);
                break;
            }
        }
    }

    if (bundle == null) {
        const id = state.nextBundleId;

        useIssueManagerStore.setState({ nextBundleId: id + 1 });
        bundle = new IssueBundle(id, tracked);
        state.issueBundle.set(issue.issueId, id);
        state.bundles.set(id, bundle);
    }

    // an issue the moderator picked is answered with its picked state: its handler opens (or goes away when another moderator got it)
    if (state.pendingPick.includes(issue.issueId)) {
        context.openHandler(bundle.id);

        if (context.userId !== issue.pickerUserId && issue.state === ISSUE_STATE_PICKED) context.closeHandler(bundle.id);
    }

    // an open issue that belongs to a bundle the moderator holds is picked along with it, unless it was released on purpose
    if (issue.state === ISSUE_STATE_OPEN) {
        const mine = bundlesFor('my', context.userId);
        const holder = mine.find((candidate) => candidate.matches(issue, true)) ?? null;
        const releasedAt = state.pendingRelease.indexOf(issue.issueId);

        if (releasedAt === -1 && holder != null) {
            pickIssues([issue.issueId], false, 0, `matches bundle with issue: ${holder.primary?.issue.issueId ?? 0}`, context);
        } else if (releasedAt >= 0) {
            state.pendingRelease.splice(releasedAt, 1);
        }
    }

    context.refreshHandler(bundle.id);
    touch();
};

/** Classic GI `_r60fabbb8ef52a0`: an issue is gone. */
export const onIssueDeleted = (issueId: number): void => {
    const state = useIssueManagerStore.getState();
    const bundleId = state.issueBundle.get(issueId) ?? 0;

    if (bundleId !== 0) {
        const bundle = state.bundles.get(bundleId) ?? null;

        if (bundle != null) {
            bundle.remove(issueId);

            if (bundle.count === 0) state.bundles.delete(bundle.id);
        }
    }

    state.issues.delete(issueId);
    touch();
};

export type IssueTab = 'open' | 'my' | 'picked';

/** Classic GI `_rde59c91bfa9c62`: the bundles of a browser tab. */
export const bundlesFor = (tab: IssueTab, userId: number): IssueBundle[] => {
    const result: IssueBundle[] = [];

    for (const bundle of useIssueManagerStore.getState().bundles.values()) {
        if (tab === 'open' && bundle.state === ISSUE_STATE_OPEN) result.push(bundle);
        else if (tab === 'my' && bundle.state === ISSUE_STATE_PICKED && bundle.pickerUserId === userId) result.push(bundle);
        else if (tab === 'picked' && bundle.state === ISSUE_STATE_PICKED && bundle.pickerUserId !== userId) result.push(bundle);
    }

    return result;
};

/** The order of a browser list (`dg.update`): lowest priority first, then the lowest age. */
export const sortBundles = (bundles: IssueBundle[]): IssueBundle[] => [...bundles].sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.age - b.age));

/** Classic GI `_rb7f9385ecb510f`: asks for issues to be picked. */
export const pickIssues = (issueIds: number[], retry: boolean, retryCount: number, reason: string, context: IssueManagerContext): void => {
    if (issueIds.length === 0) return;

    context.pick(issueIds, retry, retryCount, reason);
};

/** Classic GI `_r9dc4e0be4fb276`: picks a bundle's issues and remembers them so their answer opens the handler. */
export const pickBundle = (bundleId: number, reason: string, context: IssueManagerContext, retry = false, retryCount = 0): void => {
    const state = useIssueManagerStore.getState();
    const bundle = state.bundles.get(bundleId) ?? null;

    if (bundle == null) return;

    pickIssues(bundle.issueIds, retry, retryCount, reason, context);
    useIssueManagerStore.setState({ pendingPick: state.pendingPick.concat(bundle.issueIds) });
};

/** Classic GI `_r331af738c24783`'s choice: the open bundle with the lowest priority (the lowest age among equals). */
export const nextOpenBundle = (): IssueBundle | null => {
    let best: IssueBundle = null;

    for (const bundle of useIssueManagerStore.getState().bundles.values()) {
        if (bundle.state !== ISSUE_STATE_OPEN) continue;

        if (best == null || bundle.priority < best.priority || (bundle.priority === best.priority && bundle.age < best.age)) best = bundle;
    }

    return best;
};

/** Classic GI `_r331af738c24783`: picks the best open bundle. */
export const pickNext = (reason: string, context: IssueManagerContext, retry = false, retryCount = 0): void => {
    const best = nextOpenBundle();

    if (best != null) pickBundle(best.id, reason, context, retry, retryCount);
};

/** Classic GI `_r9f403a3db5542f`: releases issues. */
export const releaseIssues = (issueIds: number[], context: IssueManagerContext): void => {
    if (issueIds.length === 0) return;

    context.release(issueIds);
    useIssueManagerStore.setState((state) => ({ pendingRelease: state.pendingRelease.concat(issueIds) }));
};

export const releaseBundle = (bundleId: number, context: IssueManagerContext): void => {
    const bundle = useIssueManagerStore.getState().bundles.get(bundleId) ?? null;

    if (bundle != null) releaseIssues(bundle.issueIds, context);
};

/** Classic GI `_r05d8d2c4594132`: releases everything the moderator holds. */
export const releaseAll = (context: IssueManagerContext): void => {
    let ids: number[] = [];

    for (const bundle of bundlesFor('my', context.userId)) ids = ids.concat(bundle.issueIds);

    releaseIssues(ids, context);
};
