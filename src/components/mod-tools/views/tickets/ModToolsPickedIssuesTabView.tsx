import { IssueMessageData } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { ModToolsIssueTableView } from './ModToolsIssueTableView';

interface ModToolsPickedIssuesTabViewProps {
    pickedIssues: IssueMessageData[];
    allIssues: IssueMessageData[];
    getOpenMilliseconds: (issue: IssueMessageData) => number;
}

export const ModToolsPickedIssuesTabView: FC<ModToolsPickedIssuesTabViewProps> = (props) => {
    const { pickedIssues = null, allIssues = [], getOpenMilliseconds = null } = props;

    return (
        <ModToolsIssueTableView
            allIssues={allIssues}
            emptyText={LocalizeText('modtools.tickets.empty.picked')}
            getOpenMilliseconds={getOpenMilliseconds}
            issues={pickedIssues || []}
            showPicker
        />
    );
};
