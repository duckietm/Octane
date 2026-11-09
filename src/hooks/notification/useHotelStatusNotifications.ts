import { HotelClosedAndOpensEvent, HotelClosesAndWillOpenAtEvent, HotelWillCloseInMinutesEvent, MaintenanceStatusMessageEvent } from '@octane/renderer';
import { LocalizeText, NotificationAlertType } from '../../api';
import { useMessageEvent } from '../events';

type SimpleAlert = (message: string, type?: string, clickUrl?: string, clickUrlText?: string, title?: string) => void;

const getTimeZeroPadded = (time: number) => {
    const text = '0' + time;

    return text.substr(text.length - 2, text.length);
};

/** The alerts about the hotel closing, being closed and going into maintenance. */
export const useHotelStatusNotifications = (simpleAlert: SimpleAlert) => {
    useMessageEvent<HotelClosesAndWillOpenAtEvent>(HotelClosesAndWillOpenAtEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText(
                'opening.hours.' + (parser.userThrowOutAtClose ? 'disconnected' : 'closed'),
                ['h', 'm'],
                [getTimeZeroPadded(parser.openHour), getTimeZeroPadded(parser.openMinute)]
            ),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
    });

    useMessageEvent<MaintenanceStatusMessageEvent>(MaintenanceStatusMessageEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('maintenance.shutdown', ['m', 'd'], [parser.minutesUntilMaintenance.toString(), parser.duration.toString()]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
    });

    useMessageEvent<HotelWillCloseInMinutesEvent>(HotelWillCloseInMinutesEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('opening.hours.shutdown', ['m'], [parser.openMinute.toString()]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
    });

    useMessageEvent<HotelClosedAndOpensEvent>(HotelClosedAndOpensEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText('opening.hours.disconnected', ['h', 'm'], [parser.openHour.toString(), parser.openMinute.toString()]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('opening.hours.title')
        );
    });
};
