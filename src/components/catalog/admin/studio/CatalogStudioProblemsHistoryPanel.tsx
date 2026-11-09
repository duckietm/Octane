import { Collapsible } from '@base-ui/react/collapsible';
import { FC, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronRight, FaExclamationTriangle, FaHistory, FaSyncAlt, FaUndo } from 'react-icons/fa';
import { CatalogStudioHistoryGroup, CatalogStudioValidationIssue } from './CatalogStudioTypes';
import { InlineDialog } from '../../../../common/InlineDialog';
import { BaseButton } from '../../../../common/BaseButton';
import { localizeWithFallback } from '../../../../api';

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
                {localizeWithFallback('octane.catalog.current_catalog_problems', 'Current catalog problems')}
                <span className="octane-catalog-admin-validation-meta">
                    {checkedAt ? `checked at ${formatTime(checkedAt)}` : 'not checked yet'}
                    {revalidate && <BaseButton
                        className="octane-catalog-admin-btn is-small"
                        type="button"
                        disabled={loading}
                        onClick={revalidate}
                        aria-label={localizeWithFallback('octane.catalog.check_the_catalog_again', 'Check the catalog again')}
                    >
                        <FaSyncAlt /> {localizeWithFallback('octane.catalog.recheck', 'Recheck')}
                    </BaseButton>}
                </span>
            </div>
            {!issues.length && <div className="octane-catalog-admin-placeholder is-small">{localizeWithFallback('octane.catalog.no_structural_problems_found', 'No structural problems found.')}</div>}
            {ruleGroups.map(group => {
                const isOpen = expandedRules.includes(group.code);

                return <Collapsible.Root key={group.code} className="octane-catalog-admin-validation-group" open={isOpen} onOpenChange={() => toggleRule(group.code)}>
                    <Collapsible.Trigger className="octane-catalog-admin-validation-group-head">
                        {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                        <FaExclamationTriangle />
                        <strong>{group.label}</strong>
                        <span className="octane-catalog-admin-validation-count">{group.issues.length}</span>
                    </Collapsible.Trigger>
                    <Collapsible.Panel className="octane-catalog-admin-validation-group-body">
                        {group.issues.slice(0, MAX_ROWS_PER_RULE).map((issue, index) => <BaseButton
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
                        </BaseButton>)}
                        {group.issues.length > MAX_ROWS_PER_RULE && <div className="octane-catalog-admin-placeholder is-small">
                            {group.issues.length - MAX_ROWS_PER_RULE} more not listed
                        </div>}
                    </Collapsible.Panel>
                </Collapsible.Root>;
            })}
        </div>

        <div className="octane-catalog-admin-publish-changes">
            <div className="octane-catalog-admin-publish-changes-head"><FaHistory /> {localizeWithFallback('octane.catalog.live_operation_history', 'Live operation history')}</div>
            {!history.length && <div className="octane-catalog-admin-placeholder is-small">{localizeWithFallback('octane.catalog.no_recorded_operations', 'No recorded operations.')}</div>}
            {history.map(group => <div key={group.id} className="octane-catalog-admin-history-row">
                <div className="octane-catalog-admin-history-main">
                    <strong>{group.summary}</strong>
                    <span>{group.entries.length} affected item(s) &middot; {group.actorName || `User #${group.actorId}`}</span>
                </div>
                <BaseButton
                    className="octane-catalog-admin-btn is-small"
                    disabled={loading}
                    aria-label={localizeWithFallback('octane.catalog.undo_summary', 'Undo %summary%', ['summary'], [String(group.summary)])}
                    onClick={() => setUndoCandidate(group)}
                >
                    <FaUndo /> {localizeWithFallback('octane.catalog.undo', 'Undo')}
                </BaseButton>
            </div>)}
        </div>

        {undoCandidate && <InlineDialog className="octane-catalog-admin-publish-confirmation" aria-modal="true" aria-label={localizeWithFallback('octane.catalog.confirm_operation_undo', 'Confirm operation undo')} onClose={() => setUndoCandidate(null)}>
            <FaUndo />
            <div>
                <strong>Undo &ldquo;{undoCandidate.summary}&rdquo;?</strong>
                <span>{localizeWithFallback('octane.catalog.the_complete_live_operation_will_be', 'The complete live operation will be reversed and recorded in history.')}</span>
            </div>
            <div className="octane-catalog-admin-publish-actions">
                <BaseButton className="octane-catalog-admin-btn" onClick={() => setUndoCandidate(null)}>{localizeWithFallback('octane.catalog.cancel', 'Cancel')}</BaseButton>
                <BaseButton className="octane-catalog-admin-btn is-publish" onClick={undoNow}>{localizeWithFallback('octane.catalog.undo_operation', 'Undo operation')}</BaseButton>
            </div>
        </InlineDialog>}
    </div>;
};
