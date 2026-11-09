import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
export interface CatalogStudioCommandInput {
    sessionReady: boolean;
    validationCurrent: boolean;
    validationIssueCount: number;
    loading: boolean;
}

export interface CatalogStudioCommandState {
    phase: 'offline' | 'loading' | 'blocked' | 'ready';
    canValidate: boolean;
    validationLabel: string;
}

export type CatalogStudioWorkspaceTab = 'catalog' | 'sql' | 'history';

export const getCatalogStudioWorkspaceTabs = (): CatalogStudioWorkspaceTab[] =>
    [ 'catalog', 'sql', 'history' ];

const quantity = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

export const getCatalogStudioCommandState = (input: CatalogStudioCommandInput): CatalogStudioCommandState => {
    const hasIssues = input.validationIssueCount > 0;
    const canValidate = input.sessionReady && !input.loading;
    let phase: CatalogStudioCommandState['phase'] = 'offline';

    if (!input.sessionReady && input.loading) {
        phase = 'loading';
    } else if (input.sessionReady) {
        phase = hasIssues ? 'blocked' : 'ready';
    }

    return {
        phase,
        canValidate,
        validationLabel: hasIssues
            ? quantity(input.validationIssueCount, 'live problem', 'live problems')
            : input.validationCurrent ? localizeWithFallback('octane.catalog.live_catalog_healthy', 'Live catalog healthy') : localizeWithFallback('octane.catalog.health_check_available', 'Health check available')
    };
};
