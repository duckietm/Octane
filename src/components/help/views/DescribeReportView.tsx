import { FC, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, NotificationAlertType, ReportState, ReportType } from '../../../api';
import { Button, Flex, Text } from '../../../common';
import { useHelp, useModTools, useNotification } from '../../../hooks';
import { getReportMessageError, getUnlawfulReportError, isUnlawfulActivityCategory, resolveReportMessageMinimumLength } from './reportMessageRules';

export const DescribeReportView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const [reporterName, setReporterName] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [unlawfulConfirmed, setUnlawfulConfirmed] = useState(false);
    const { activeReport = null, setActiveReport = null } = useHelp();
    const { cfhCategories = [] } = useModTools();
    const { simpleAlert = null } = useNotification();

    const minimumLength = useMemo(() => resolveReportMessageMinimumLength(GetConfigurationValue<number>('help.cfh.length.minimum', 15)), []);

    const isUnlawful = isUnlawfulActivityCategory(cfhCategories[activeReport?.cfhCategory]?.name ?? '');

    const submitMessage = () => {
        // Official verifyMessage: the unlawful branch is refused with the generic
        // "tell us what happened" alert until the box is ticked and both fields filled.
        if (isUnlawful && getUnlawfulReportError(unlawfulConfirmed, reporterName, reporterEmail)) {
            simpleAlert?.(
                localizeWithFallback('help.emergency.main.step.one.description', 'Please tell us what happened. The more detailed report we get, the faster we can help you.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('generic.alert.title', 'Alert')
            );

            return;
        }

        const error = getReportMessageError(message, minimumLength);

        if (error) {
            // The official client refuses the step with an alert instead of a silent no-op.
            const fallback =
                error === 'nomsg'
                    ? 'Please write a description of what is wrong before sending a call for help.'
                    : 'We are not entirely sure we understand your query. More details please.';

            simpleAlert?.(
                localizeWithFallback(`help.cfh.error.${error}`, fallback),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('generic.alert.title', 'Alert')
            );

            return;
        }

        setActiveReport((prevValue) => {
            const currentStep = ReportState.REPORT_SUMMARY;

            return {
                ...prevValue,
                message,
                currentStep,
                reporterName: isUnlawful ? reporterName.trim() : '',
                reporterEmail: isUnlawful ? reporterEmail.trim() : ''
            };
        });
    };

    const back = () => {
        setActiveReport((prevValue) => {
            return { ...prevValue, currentStep: prevValue.currentStep - 1 };
        });
    };

    return (
        <>
            <div className="flex flex-col gap-1">
                <Text fontSize={4}>{LocalizeText('help.emergency.chat_report.subtitle')}</Text>
                <Text>
                    {isUnlawful
                        ? localizeWithFallback(
                              'help.cfh.unlawful_activity.reason_description',
                              'Please provide all relevant details, including sufficient evidence and an explanation of the reasons why you believe the content is illegal.'
                          )
                        : LocalizeText('help.cfh.input.text')}
                </Text>
            </div>
            <textarea
                className="min-h-[calc(1.5em+ .5rem+2px)] px-[.5rem] py-[.25rem]  rounded-[.2rem] h-full"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
            />
            {isUnlawful && (
                <div className="help-unlawful flex flex-col gap-1">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="help-unlawful__input"
                            aria-label={localizeWithFallback('help.cfh.unlawful_activity.name', 'Your name')}
                            placeholder={localizeWithFallback('help.cfh.unlawful_activity.name', 'Your name')}
                            value={reporterName}
                            onChange={(event) => setReporterName(event.target.value)}
                        />
                        <input
                            type="email"
                            className="help-unlawful__input"
                            aria-label={localizeWithFallback('help.cfh.unlawful_activity.email', 'Your e-mail address')}
                            placeholder={localizeWithFallback('help.cfh.unlawful_activity.email', 'Your e-mail address')}
                            value={reporterEmail}
                            onChange={(event) => setReporterEmail(event.target.value)}
                        />
                    </div>
                    <label className="help-unlawful__confirm">
                        <input type="checkbox" checked={unlawfulConfirmed} onChange={(event) => setUnlawfulConfirmed(event.target.checked)} />
                        <span>
                            {localizeWithFallback(
                                'help.cfh.unlawful_activity.confirm_label',
                                'It is my genuine belief that the information and allegations contained herein are accurate and complete.'
                            )}
                        </span>
                    </label>
                </div>
            )}
            <Flex gap={2} justifyContent="between">
                <Button
                    disabled={!(activeReport.reportType === ReportType.BULLY || activeReport.reportType === ReportType.EMERGENCY)}
                    variant="secondary"
                    onClick={back}
                >
                    {LocalizeText('generic.back')}
                </Button>
                <Button onClick={submitMessage}>{LocalizeText('help.emergency.main.submit.button')}</Button>
            </Flex>
        </>
    );
};
