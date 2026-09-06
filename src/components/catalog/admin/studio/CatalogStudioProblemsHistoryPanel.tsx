import { FC, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronRight, FaExclamationTriangle, FaHistory, FaSyncAlt, FaUndo } from 'react-icons/fa';
import { CatalogStudioHistoryGroup, CatalogStudioValidationIssue } from './CatalogStudioTypes';

interface CatalogStudioProblemsHistoryPanelProps {
    issues: CatalogStudioValidationIssue[];
    history: CatalogStudioHistoryGroup[];
    loading: boolean;
    undo: (groupId: number) => void;
    revalidate?: () => void;
    checkedAt?: number | null;
    onSelectEntity?: (issue: CatalogStudioValidationIssue) => void;
}

const MAX_ROWS_PER_RULE = 50;

// Grouping earns its keep on a catalog that answers with hundreds of rows. On a short list it is
// just a click in the way, so a small report opens itself.
const AUTO_EXPAND_LIMIT = 20;

// Only pages can be opened from here: an offer is not addressable on its own in the manager.
const SELECTABLE_ENTITY_TYPE = 'PAGE';

// A rule fires once per entity, so a live catalog answers with hundreds of identical sentences.
// The rule is what an operator acts on; the entities are the detail underneath it.
const groupByRule = (issues: CatalogStudioValidationIssue[]) => {
    const groups = new Map<string, { code: string; label: string; issues: CatalogStudioValidationIssue[] }>();

    for (const issue of issues) {
        const group = groups.get(issue.code);

        if (group) {
            group.issues.push(issue);
            continue;
        }

        groups.set(issue.code, { code: issue.code, label: issue.message, issues: [issue] });
    }

    return [...groups.values()].sort((a, b) => b.issues.length - a.issues.length);
};

const formatTime = (value: number) => {
    try {
        return new Date(value).toLocaleTimeString();
    } catch {
        return '';
    }
};

export const CatalogStudioProblemsHistoryPanel: FC<CatalogStudioProblemsHistoryPanelProps> = ({
    issues,
    history,
    loading,
    undo,
    revalidate = null,
    checkedAt = null,
    onSelectEntity = null
}) => {
    const [undoCandidate, setUndoCandidate] = useState<CatalogStudioHistoryGroup | null>(null);
    const [openRules, setOpenRules] = useState<string[] | null>(null);

    const ruleGroups = useMemo(() => groupByRule(issues), [issues]);
    const openByDefault = useMemo(
        () => (issues.length <= AUTO_EXPAND_LIMIT ? ruleGroups.map((group) => group.code) : []),
        [issues.length, ruleGroups]
    );
    const expandedRules = openRules ?? openByDefault;

    const toggleRule = (code: string) =>
        setOpenRules((prev) => {
            const base = prev ?? openByDefault;

            return base.includes(code) ? base.filter((entry) => entry !== code) : [...base, code];
        });

    const undoNow = () => {
        if (!undoCandidate) return;
        const groupId = undoCandidate.id;
        setUndoCandidate(null);
        undo(groupId);
    };

    return <div className="octane-catalog-admin-publish">
        <div className="octane-catalog-admin-validation-list">
            <div className="octane-catalog-admin-publish-changes-head">
                Current catalog problems
                <span className="octane-catalog-admin-validation-meta">
                    {checkedAt ? `checked at ${formatTime(checkedAt)}` : 'not checked yet'}
                    {revalidate && <button
                        className="octane-catalog-admin-btn is-small"
                        type="button"
                        disabled={loading}
                        onClick={revalidate}
                        aria-label="Check the catalog again"
                    >
                        <FaSyncAlt /> Recheck
                    </button>}
                </span>
            </div>
            {!issues.length && <div className="octane-catalog-admin-placeholder is-small">No structural problems found.</div>}
            {ruleGroups.map(group => {
                const isOpen = expandedRules.includes(group.code);

                return <div key={group.code} className="octane-catalog-admin-validation-group">
                    <button
                        className="octane-catalog-admin-validation-group-head"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleRule(group.code)}
                    >
                        {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                        <FaExclamationTriangle />
                        <strong>{group.label}</strong>
                        <span className="octane-catalog-admin-validation-count">{group.issues.length}</span>
                    </button>
                    {isOpen && <div className="octane-catalog-admin-validation-group-body">
                        {group.issues.slice(0, MAX_ROWS_PER_RULE).map((issue, index) => <button
                            key={`${issue.entityType}-${issue.entityId}-${issue.field}-${index}`}
                            className="octane-catalog-admin-validation-row"
                            type="button"
                            disabled={!onSelectEntity || issue.entityType !== SELECTABLE_ENTITY_TYPE}
                            onClick={() => onSelectEntity && onSelectEntity(issue)}
                        >
                            <div>
                                <strong>{issue.entityType} #{issue.entityId}</strong>
                                <span>{issue.field} &middot; {issue.message}</span>
                            </div>
                        </button>)}
                        {group.issues.length > MAX_ROWS_PER_RULE && <div className="octane-catalog-admin-placeholder is-small">
                            {group.issues.length - MAX_ROWS_PER_RULE} more not listed
                        </div>}
                    </div>}
                </div>;
            })}
        </div>

        <div className="octane-catalog-admin-publish-changes">
            <div className="octane-catalog-admin-publish-changes-head"><FaHistory /> Live operation history</div>
            {!history.length && <div className="octane-catalog-admin-placeholder is-small">No recorded operations.</div>}
            {history.map(group => <div key={group.id} className="octane-catalog-admin-history-row">
                <div className="octane-catalog-admin-history-main">
                    <strong>{group.summary}</strong>
                    <span>{group.entries.length} affected item(s) &middot; {group.actorName || `User #${group.actorId}`}</span>
                </div>
                <button
                    className="octane-catalog-admin-btn is-small"
                    disabled={loading}
                    aria-label={`Undo ${group.summary}`}
                    onClick={() => setUndoCandidate(group)}
                >
                    <FaUndo /> Undo
                </button>
            </div>)}
        </div>

        {undoCandidate && <div className="octane-catalog-admin-publish-confirmation" role="dialog" aria-modal="true" aria-label="Confirm operation undo">
            <FaUndo />
            <div>
                <strong>Undo &ldquo;{undoCandidate.summary}&rdquo;?</strong>
                <span>The complete live operation will be reversed and recorded in history.</span>
            </div>
            <div className="octane-catalog-admin-publish-actions">
                <button className="octane-catalog-admin-btn" onClick={() => setUndoCandidate(null)}>Cancel</button>
                <button className="octane-catalog-admin-btn is-publish" onClick={undoNow}>Undo operation</button>
            </div>
        </div>}
    </div>;
};
