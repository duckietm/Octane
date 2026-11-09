import {
    CallForHelpDisabledNotifyMessageEvent,
    CallForHelpPendingCallsDeletedMessageEvent,
    CallForHelpPendingCallsMessageEvent,
    CallForHelpReplyMessageEvent,
    CallForHelpResultMessageEvent,
    DeletePendingCallsForHelpMessageComposer,
    GetGuideReportingStatusMessageComposer,
    GetPendingCallsForHelpMessageComposer,
    GuideReportingStatusMessageEvent,
    GuideTicketCreationResultMessageEvent,
    GuideTicketResolutionMessageEvent,
    IssueCloseNotificationMessageEvent,
    PendingGuideTicketData,
    SanctionStatusEvent,
    SanctionStatusMessageParser
} from '@octane/renderer';
import { useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    CallForHelpResult,
    creationResultCode,
    GetCloseReasonKey,
    GetConfigurationValue,
    IHelpReport,
    LocalizeText,
    NotificationAlertType,
    ReportState,
    ReportType,
    reportingStatusCode,
    resolutionCode,
    SendMessageComposer,
    localizeWithFallback
} from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** AIR HabboHelp.guardiansEnabled: bully reports go to the Guardians instead of the moderators. */
export const isGuardiansEnabled = (): boolean => GetConfigurationValue<boolean>('guardians.enabled', true) !== false;

/** AIR ChatReviewReporterFeedbackCtrl.enabled: the reporter sees what became of the report. */
const isReporterFeedbackEnabled = (): boolean => GetConfigurationValue<boolean>('chatreviewreporterfeedbackctrl.enabled', true) !== false;

const createReport = (type: number): IHelpReport => ({
    reportType: type,
    reportedUserId: -1,
    reportedChats: [],
    cfhCategory: -1,
    cfhTopic: -1,
    roomId: -1,
    roomName: '',
    messageId: -1,
    threadId: -1,
    groupId: -1,
    extraData: '',
    roomObjectId: -1,
    message: '',
    currentStep: 0
});

const useHelpState = () => {
    const [activeReport, setActiveReport] = useState<IHelpReport>(null);
    const [sanctionInfo, setSanctionInfo] = useState<SanctionStatusMessageParser>(null);
    /** The localization code of the reporter feedback window ("sent", "nochat", "valid", ...), or null. */
    const [bullyReportFeedback, setBullyReportFeedback] = useState<string>(null);
    /** The report the user already has open, shown instead of starting a new one. */
    const [pendingBullyTicket, setPendingBullyTicket] = useState<PendingGuideTicketData>(null);
    /** The user a bully report was asked for, while the server answers whether one may be made. */
    const pendingBullyReportRef = useRef<number>(null);
    const { simpleAlert = null, showConfirm = null } = useNotification();

    /**
     * AIR CallForHelpManager: with the Guardians on, a bully report first asks the server whether
     * the user may report (GetGuideReportingStatus); only an "ok" opens the report.
     */
    const startBullyReport = (reportedUserId: number = -1) => {
        pendingBullyReportRef.current = reportedUserId > 0 ? reportedUserId : -1;
        SendMessageComposer(new GetGuideReportingStatusMessageComposer());
    };

    const report = (type: number, options: Partial<IHelpReport>) => {
        if (type === ReportType.BULLY && isGuardiansEnabled()) {
            startBullyReport(options?.reportedUserId ?? -1);
            return;
        }

        const newReport: IHelpReport = {
            reportType: type,
            reportedUserId: -1,
            reportedChats: [],
            cfhCategory: -1,
            cfhTopic: -1,
            roomId: -1,
            roomName: '',
            messageId: -1,
            threadId: -1,
            groupId: -1,
            extraData: '',
            roomObjectId: -1,
            message: '',
            currentStep: 0
        };

        switch (type) {
            case ReportType.BULLY:
            case ReportType.EMERGENCY:
            case ReportType.IM:
                newReport.reportedUserId = options.reportedUserId;
                newReport.currentStep = ReportState.SELECT_CHATS;
                break;
            case ReportType.ROOM:
                newReport.roomId = options.roomId;
                newReport.roomName = options.roomName;
                newReport.currentStep = ReportState.SELECT_TOPICS;
                break;
            case ReportType.THREAD:
                newReport.groupId = options.groupId;
                newReport.threadId = options.threadId;
                newReport.currentStep = ReportState.SELECT_TOPICS;
                break;
            case ReportType.MESSAGE:
                newReport.groupId = options.groupId;
                newReport.threadId = options.threadId;
                newReport.messageId = options.messageId;
                newReport.currentStep = ReportState.SELECT_TOPICS;
                break;
            case ReportType.PHOTO:
                newReport.extraData = options.extraData;
                newReport.roomId = options.roomId;
                newReport.reportedUserId = options.reportedUserId;
                newReport.roomObjectId = options.roomObjectId;
                newReport.currentStep = ReportState.SELECT_TOPICS;
                break;
            case ReportType.GUIDE:
                break;
        }

        setActiveReport(newReport);
    };

    useMessageEvent<CallForHelpResultMessageEvent>(CallForHelpResultMessageEvent, (event) => {
        const parser = event.getParser();

        let message = parser.messageText;

        switch (parser.resultType) {
            case CallForHelpResult.TOO_MANY_PENDING_CALLS_CODE:
                SendMessageComposer(new GetPendingCallsForHelpMessageComposer());
                simpleAlert(LocalizeText('help.cfh.error.pending'), NotificationAlertType.MODERATION, null, null, LocalizeText('help.cfh.error.title'));
                break;
            case CallForHelpResult.HAS_ABUSIVE_CALL_CODE:
                simpleAlert(LocalizeText('help.cfh.error.abusive'), NotificationAlertType.ABUSIVE, null, null, LocalizeText('help.cfh.error.title'));
                break;
            default:
                if (message.trim().length === 0) {
                    message = LocalizeText('help.cfh.sent.text');
                }

                simpleAlert(message, NotificationAlertType.MODERATION, null, null, LocalizeText('help.cfh.sent.title'));
        }
    });

    useMessageEvent<IssueCloseNotificationMessageEvent>(IssueCloseNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        const message = parser.messageText.length === 0 ? LocalizeText('help.cfh.closed.' + GetCloseReasonKey(parser.closeReason)) : parser.messageText;

        simpleAlert(message, NotificationAlertType.MODERATION, null, null, LocalizeText('mod.alert.title'));
    });

    useMessageEvent<CallForHelpPendingCallsMessageEvent>(CallForHelpPendingCallsMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.count > 0) {
            showConfirm(
                LocalizeText('help.emergency.pending.title') + '\n' + parser.pendingCalls[0].message,
                () => {
                    SendMessageComposer(new DeletePendingCallsForHelpMessageComposer());
                },
                null,
                LocalizeText('help.emergency.pending.button.discard'),
                LocalizeText('help.emergency.pending.button.keep'),
                LocalizeText('help.emergency.pending.message.subtitle')
            );
        }
    });

    useMessageEvent<CallForHelpPendingCallsDeletedMessageEvent>(CallForHelpPendingCallsDeletedMessageEvent, (event) => {
        const message = localizeWithFallback('octane.help.your_pending_calls_were_deleted', 'Your pending calls were deleted'); // todo: add localization

        simpleAlert(message, NotificationAlertType.MODERATION, null, null, LocalizeText('mod.alert.title'));
    });

    useMessageEvent<CallForHelpReplyMessageEvent>(CallForHelpReplyMessageEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(parser.message, NotificationAlertType.MODERATION, null, null, LocalizeText('help.cfh.reply.title'));
    });

    useMessageEvent<CallForHelpDisabledNotifyMessageEvent>(CallForHelpDisabledNotifyMessageEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('help.emergency.global_mute.message'),
            NotificationAlertType.MODERATION,
            parser.infoUrl,
            LocalizeText('help.emergency.global_mute.link'),
            LocalizeText('help.emergency.global_mute.subtitle')
        );
    });

    useMessageEvent<SanctionStatusEvent>(SanctionStatusEvent, (event) => {
        const parser = event.getParser();

        setSanctionInfo(parser);
    });

    useMessageEvent<GuideReportingStatusMessageEvent>(GuideReportingStatusMessageEvent, (event) => {
        const parser = event.getParser();
        const reportedUserId = pendingBullyReportRef.current;

        pendingBullyReportRef.current = null;

        if (!parser) return;

        switch (parser.statusCode) {
            case 0:
                // Nothing was asked for: an answer on its own opens nothing.
                if (reportedUserId === null) return;

                setActiveReport({ ...createReport(ReportType.BULLY), reportedUserId, currentStep: ReportState.SELECT_USER });
                return;
            case 1:
                if (parser.pendingTicket) setPendingBullyTicket(parser.pendingTicket);
                return;
            default: {
                const code = reportingStatusCode(parser.statusCode);

                if (code.length) setBullyReportFeedback(code);
            }
        }
    });

    useMessageEvent<GuideTicketCreationResultMessageEvent>(GuideTicketCreationResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser && isReporterFeedbackEnabled()) setBullyReportFeedback(creationResultCode(parser.result));
    });

    useMessageEvent<GuideTicketResolutionMessageEvent>(GuideTicketResolutionMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser && isReporterFeedbackEnabled()) setBullyReportFeedback(resolutionCode(parser.resolution));
    });

    return {
        activeReport,
        setActiveReport,
        sanctionInfo,
        setSanctionInfo,
        report,
        startBullyReport,
        bullyReportFeedback,
        setBullyReportFeedback,
        pendingBullyTicket,
        setPendingBullyTicket
    };
};

export const useHelp = () => useSharedHook(useHelpState);

registerSharedHook(useHelpState);
