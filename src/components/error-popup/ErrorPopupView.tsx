import { GetSessionDataManager } from '@octane/renderer';
import { FC, MutableRefObject, useEffect, useState } from 'react';
import { GetOptionalConfigurationValue, localizeWithFallback } from '../../api';
import { buildErrorReport, ErrorReport } from '../../api/utils/ErrorReport';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { Checkbox } from '../../common/Checkbox';
import { InlineDialog } from '../../common/InlineDialog';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/**
 * The official error window (ErrorPopupCtrl, error_popup): an error of the client that nothing caught is shown with
 * a report the player can copy for the staff, and can be silenced for the rest of the session. Off unless the hotel
 * sets `error_handling.show_error`; `error_handling.show_stacktrace` adds the stack to the report.
 */
export const ErrorPopupView: FC = () => {
    const [report, setReport] = useState<ErrorReport | null>(null);
    const [silenced, setSilenced] = useState(false);
    const [doNotShow, setDoNotShow] = useState(false);
    const enabled = GetOptionalConfigurationValue<boolean>('error_handling.show_error', false) === true;

    useEffect(() => {
        if (!enabled || silenced) return;

        const show = (message: string, stack: string) =>
            // The first error stays on screen: what follows is usually its echo.
            setReport(
                (current) =>
                    current ??
                    buildErrorReport(
                        { message, stack, userId: GetSessionDataManager()?.userId ?? 0, hotel: window.location.host },
                        GetOptionalConfigurationValue<boolean>('error_handling.show_stacktrace', false) === true
                    )
            );

        const onError = (event: ErrorEvent) => show(event.message || String(event.error ?? ''), event.error?.stack ?? '');
        const onRejection = (event: PromiseRejectionEvent) => show(String(event.reason?.message ?? event.reason ?? ''), event.reason?.stack ?? '');

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);

        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
        };
    }, [enabled, silenced]);

    if (!report) return null;

    const close = () => {
        if (doNotShow) setSilenced(true);

        setReport(null);
    };

    const title = localizeWithFallback('error_window.title', 'Error');

    return (
        <NativeTextTree>
            <InlineDialog
                aria-label={title}
                render={({ ref, ...popupProps }) => (
                    <OctaneCardView {...popupProps} innerRef={ref as MutableRefObject<HTMLDivElement>} classNames={['octane-error-popup']} frameStyle={3} isResizable={false} theme="primary-slim" />
                )}
                onClose={close}
            >
                <OctaneCardHeaderView headerText={title} onCloseClick={close} />
                <OctaneCardContentView classNames={['octane-error-popup__content']}>
                    <strong className="octane-error-popup__message">{report.message}</strong>
                    <span>{localizeWithFallback('error_window.info', 'Something went wrong. Copy the report below and send it to the staff.')}</span>
                    <textarea readOnly aria-label={title} className="octane-error-popup__report" value={report.encoded} />
                    <label className="octane-error-popup__silence">
                        <Checkbox checked={doNotShow} onCheckedChange={(next) => setDoNotShow(next === true)} />
                        <span>{localizeWithFallback('error_window.do_not_show', 'Do not show again')}</span>
                    </label>
                    <div className="octane-error-popup__buttons">
                        <BaseButton className="octane-error-popup__button" onClick={close}>
                            {localizeWithFallback('error_window.ok', 'OK')}
                        </BaseButton>
                        <BaseButton className="octane-error-popup__button" onClick={() => void navigator.clipboard?.writeText(report.encoded).catch(() => undefined)}>
                            {localizeWithFallback('error_window.copy', 'Copy')}
                        </BaseButton>
                    </div>
                </OctaneCardContentView>
            </InlineDialog>
        </NativeTextTree>
    );
};
