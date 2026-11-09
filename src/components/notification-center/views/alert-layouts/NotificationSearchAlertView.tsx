import { FC, useEffect, useState } from 'react';
import { LocalizeText, NotificationAlertItem, OpenUrl } from '../../../../api';
import { AutoGrid, Button, Column, Flex, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { OctaneInput } from '../../../../layout';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

/**
 * The search alert's results, sent as a JSON array of strings. A message that was not one threw inside render,
 * and the error boundary around the right side of the screen then hid every later alert for the session.
 */
export const parseSearchResults = (message: string): string[] => {
    try {
        const parsed: unknown = JSON.parse(message);

        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
    } catch {
        return [];
    }
};

export const NotificationSeachAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { item = null, title = (props.item && props.item.title) || '', onClose = null, ...rest } = props;

    const [searchValue, setSearchValue] = useState('');
    const [results, setResults] = useState<string[]>([]);

    const visitUrl = () => {
        OpenUrl(item.clickUrl);

        onClose();
    };

    const updateSearchValue = (value: string) => {
        setResults(parseSearchResults(item.messages[0]).filter((val) => val.includes(value)));
        setSearchValue(value);
    };

    useEffect(() => {
        setResults(parseSearchResults(item.messages[0]));
    }, [item]);

    const isAction = item.clickUrl && item.clickUrl.startsWith('event:');

    return (
        <NativeTextTree>
            <LayoutNotificationAlertView title={title} onClose={onClose} {...rest}>
                <Flex fullWidth alignItems="center" position="relative">
                    <OctaneInput
                        placeholder={LocalizeText('generic.search')}
                        type="text"
                        value={searchValue}
                        onChange={(event) => updateSearchValue(event.target.value)}
                    />
                </Flex>
                <Column fullHeight className="py-1" overflow="hidden">
                    <AutoGrid columnCount={1} gap={1}>
                        {results &&
                            results.map((n, index) => {
                                return <span key={index}>{n}</span>;
                            })}
                    </AutoGrid>
                </Column>
                <hr className="my-2" />
                <Column center alignItems="center" gap={1}>
                    {!isAction && !item.clickUrl && <Button onClick={onClose}>{LocalizeText('generic.close')}</Button>}
                    {item.clickUrl && item.clickUrl.length > 0 && <Button onClick={visitUrl}>{LocalizeText(item.clickUrlText)}</Button>}
                </Column>
            </LayoutNotificationAlertView>
        </NativeTextTree>
    );
};
