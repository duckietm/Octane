import { FC, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, NotificationAlertType, ReportState, ReportType } from '../../../api';
import { Button, Flex, Text } from '../../../common';
import { useHelp, useModTools, useNotification } from '../../../hooks';
import { getReportMessageError, isUnlawfulActivityCategory, resolveReportMessageMinimumLength } from './reportMessageRules';

export const DescribeReportView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const { activeReport = null, setActiveReport = null } = useHelp();
    const { cfhCategories = [] } = useModTools();
    const { simpleAlert = null } = useNotification();

    const minimumLength = useMemo(() => resolveReportMessageMinimumLength(GetConfigurationValue<number>('help.cfh.length.minimum', 15)), []);

    const isUnlawful = isUnlawfulActivityCategory(cfhCategories[activeReport?.cfhCategory]?.name ?? '');

    const submitMessage = () => {
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

            return { ...prevValue, message, currentStep };
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
