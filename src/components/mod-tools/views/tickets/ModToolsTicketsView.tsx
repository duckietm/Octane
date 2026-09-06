import { GetSessionDataManager, IssueMessageData, PickIssuesMessageComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaBolt, FaCheckSquare, FaListUl, FaUserCheck } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../../../common';
import { useModTools } from '../../../../hooks';
import { getIssueOpenMilliseconds, pickNextPriorityIssue } from './IssueBrowserFormat';
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

/** The open-time column ticks once a second; the packet only told us the age at arrival. */
const CLOCK_TICK_MS = 1000;

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
    const [now, setNow] = useState(() => Date.now());
    const { tickets = [] } = useModTools();
    // When each issue was first seen, so its open time keeps counting after the packet.
    // A re-sent issue (state change, new picker) keeps its original arrival time: the age
    // in the fresh packet already accounts for the time that passed.
    const receivedAtRef = useRef<Map<number, number>>(new Map());
    const autoPickPendingRef = useRef(false);

    const { openIssues, myIssues, pickedIssues } = useMemo(() => {
        const ownId = GetSessionDataManager()?.userId;
        return {
            openIssues: tickets.filter((issue) => issue.state === IssueMessageData.STATE_OPEN),
            myIssues: tickets.filter((issue) => issue.state === IssueMessageData.STATE_PICKED && issue.pickerUserId === ownId),
            pickedIssues: tickets.filter((issue) => issue.state === IssueMessageData.STATE_PICKED)
        };
    }, [tickets]);

    useEffect(() => {
        const seen = receivedAtRef.current;
        const arrivedAt = Date.now();
        const liveIds = new Set<number>();

        for (const issue of tickets) {
            liveIds.add(issue.issueId);

            if (!seen.has(issue.issueId)) seen.set(issue.issueId, arrivedAt);
        }

        for (const issueId of Array.from(seen.keys())) if (!liveIds.has(issueId)) seen.delete(issueId);
    }, [tickets]);

    useEffect(() => {
        const handle = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

        return () => window.clearInterval(handle);
    }, []);

    const getOpenMilliseconds = useCallback(
        (issue: IssueMessageData) => getIssueOpenMilliseconds(issue.issueAgeInMilliseconds, receivedAtRef.current.get(issue.issueId) ?? now, now),
        [now]
    );

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

    // "Give me the next priority issue": the client chooses like the official IssueManager
    // and asks for that one issue; the pick either lands in "my issues" or fails with the
    // usual pick-failed alert. One request at a time, the server answers in its own time.
    const autoPick = () => {
        if (autoPickPendingRef.current) return;

        const next = pickNextPriorityIssue(tickets);

        if (!next) return;

        autoPickPendingRef.current = true;
        SendMessageComposer(new PickIssuesMessageComposer([next.issueId], false, 0, 'issue browser pick next'));
        setCurrentTab(1);

        window.setTimeout(() => {
            autoPickPendingRef.current = false;
        }, 2000);
    };

    const renderTab = () => {
        switch (currentTab) {
            case 0:
                return <ModToolsOpenIssuesTabView allIssues={tickets} getOpenMilliseconds={getOpenMilliseconds} openIssues={openIssues} />;
            case 1:
                return <ModToolsMyIssuesTabView allIssues={tickets} getOpenMilliseconds={getOpenMilliseconds} handleIssue={handleIssue} myIssues={myIssues} />;
            case 2:
                return <ModToolsPickedIssuesTabView allIssues={tickets} getOpenMilliseconds={getOpenMilliseconds} pickedIssues={pickedIssues} />;
        }
        return null;
    };

    return (
        <>
            <OctaneCardView className="octane-mod-tools-tickets min-w-0 w-[min(680px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]">
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
                <OctaneCardContentView gap={1}>
                    {renderTab()}
                    <div className="flex justify-start pt-1 border-t border-zinc-200">
                        <Button
                            disabled={!openIssues.length}
                            gap={1}
                            title={localizeWithFallback('modtools.tickets.auto_pick.title', 'Picks the most urgent open issue for you')}
                            variant="success"
                            onClick={autoPick}
                        >
                            <FaBolt size={11} /> {localizeWithFallback('modtools.tickets.auto_pick', 'Give me the next priority issue')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
            {issueInfoWindows &&
                issueInfoWindows.length > 0 &&
                issueInfoWindows.map((issueId) => <ModToolsIssueInfoView key={issueId} issueId={issueId} onIssueInfoClosed={closeIssue} />)}
        </>
    );
};
