import { GetSessionDataManager, IssueMessageData } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { FaCheckSquare, FaListUl, FaUserCheck } from 'react-icons/fa';
import { LocalizeText } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../../../common';
import { useModTools } from '../../../../hooks';
import { ModToolsIssueInfoView } from './ModToolsIssueInfoView';
import { ModToolsMyIssuesTabView } from './ModToolsMyIssuesTabView';
import { ModToolsOpenIssuesTabView } from './ModToolsOpenIssuesTabView';
import { ModToolsPickedIssuesTabView } from './ModToolsPickedIssuesTabView';

interface ModToolsTicketsViewProps {
    onCloseClick: () => void;
}

interface TabBadgeProps {
    label: string;
    count: number;
    icon: React.ReactNode;
    tone: 'amber' | 'sky' | 'zinc';
}

const TONE_MAP: Record<TabBadgeProps['tone'], string> = {
    amber: 'bg-amber-500 text-white',
    sky: 'bg-sky-500 text-white',
    zinc: 'bg-zinc-400 text-white'
};

const TabLabel: FC<TabBadgeProps> = ({ label, count, icon, tone }) => (
    <span className="inline-flex items-center gap-1.5">
        <span className="opacity-80">{icon}</span>
        <span>{label}</span>
        {count > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-semibold ${TONE_MAP[tone]}`}>
                {count > 99 ? '99+' : count}
            </span>
        )}
    </span>
);

export const ModToolsTicketsView: FC<ModToolsTicketsViewProps> = (props) => {
    const { onCloseClick = null } = props;
    const [currentTab, setCurrentTab] = useState<number>(0);
    const [issueInfoWindows, setIssueInfoWindows] = useState<number[]>([]);
    const { tickets = [] } = useModTools();

    const { openIssues, myIssues, pickedIssues } = useMemo(() => {
        const ownId = GetSessionDataManager()?.userId;
        return {
            openIssues: tickets.filter((issue) => issue.state === IssueMessageData.STATE_OPEN),
            myIssues: tickets.filter((issue) => issue.state === IssueMessageData.STATE_PICKED && issue.pickerUserId === ownId),
            pickedIssues: tickets.filter((issue) => issue.state === IssueMessageData.STATE_PICKED)
        };
    }, [tickets]);

    const closeIssue = (issueId: number) => {
        setIssueInfoWindows((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.indexOf(issueId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    };

    const handleIssue = (issueId: number) => {
        setIssueInfoWindows((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.indexOf(issueId);

            if (existingIndex === -1) newValue.push(issueId);
            else newValue.splice(existingIndex, 1);

            return newValue;
        });
    };

    const renderTab = () => {
        switch (currentTab) {
            case 0:
                return <ModToolsOpenIssuesTabView openIssues={openIssues} />;
            case 1:
                return <ModToolsMyIssuesTabView handleIssue={handleIssue} myIssues={myIssues} />;
            case 2:
                return <ModToolsPickedIssuesTabView pickedIssues={pickedIssues} />;
        }
        return null;
    };

    return (
        <>
            <OctaneCardView className="octane-mod-tools-tickets min-w-0 w-[min(640px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]">
                <OctaneCardHeaderView headerText={LocalizeText('modtools.tickets.title')} onCloseClick={onCloseClick} />
                <OctaneCardTabsView>
                    <OctaneCardTabsItemView isActive={currentTab === 0} onClick={() => setCurrentTab(0)}>
                        <TabLabel label={LocalizeText('modtools.tickets.tab.open')} count={openIssues.length} icon={<FaListUl size={10} />} tone="amber" />
                    </OctaneCardTabsItemView>
                    <OctaneCardTabsItemView isActive={currentTab === 1} onClick={() => setCurrentTab(1)}>
                        <TabLabel label={LocalizeText('modtools.tickets.tab.mine')} count={myIssues.length} icon={<FaUserCheck size={10} />} tone="sky" />
                    </OctaneCardTabsItemView>
                    <OctaneCardTabsItemView isActive={currentTab === 2} onClick={() => setCurrentTab(2)}>
                        <TabLabel
                            label={LocalizeText('modtools.tickets.tab.picked')}
                            count={pickedIssues.length}
                            icon={<FaCheckSquare size={10} />}
                            tone="zinc"
                        />
                    </OctaneCardTabsItemView>
                </OctaneCardTabsView>
                <OctaneCardContentView gap={1}>{renderTab()}</OctaneCardContentView>
            </OctaneCardView>
            {issueInfoWindows &&
                issueInfoWindows.length > 0 &&
                issueInfoWindows.map((issueId) => <ModToolsIssueInfoView key={issueId} issueId={issueId} onIssueInfoClosed={closeIssue} />)}
        </>
    );
};
