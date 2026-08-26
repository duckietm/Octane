import { FC, useMemo, useState } from 'react';
import {
    DispatchUiEvent,
    LocalizeText,
    NotificationAlertItem,
    NotificationAlertType,
    OpenUrl,
    RoomWidgetUpdateChatInputContentEvent,
    SanitizeHtml
} from '../../../../api';
import { Button, Column, Flex, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

const COMMAND_LINE_PATTERN = /^\s*:[\w.-]+(?:\s.*)?$/;
const COMMAND_HEADING_PATTERN = /^Your Commands\s*\(\d+\)\s*:?$/i;

interface CommandTemplateEntry {
    command: string;
    args: string;
    description: string;
    raw: string;
}

interface CommandFilterInputProps {
    value: string;
    onChange: (value: string) => void;
}

const CommandFilterInput: FC<CommandFilterInputProps> = ({ value, onChange }) => (
    <input
        className="notification-command-search"
        type="text"
        value={value}
        spellCheck={false}
        placeholder={LocalizeText('generic.search')}
        onChange={(event) => onChange(event.target.value)}
    />
);

export const NotificationDefaultAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { item = null, title = (props.item && props.item.title) || '', onClose = null, classNames = [], ...rest } = props;
    const [imageFailed, setImageFailed] = useState<boolean>(false);
    const [commandFilter, setCommandFilter] = useState<string>('');

    const alertLines = useMemo(() => item.messages.flatMap((message) => message.split(/\r\n|\r|\n/g)), [item.messages]);
    const hasCommandTemplate = useMemo(() => {
        const commandLines = alertLines.filter((line) => COMMAND_LINE_PATTERN.test(line));

        return commandLines.length >= 4 || alertLines.some((line) => COMMAND_HEADING_PATTERN.test(line.trim()));
    }, [alertLines]);
    const commandTemplateContent = useMemo(() => {
        const intro: string[] = [];
        const commands: CommandTemplateEntry[] = [];

        for (const rawLine of alertLines) {
            const text = rawLine.trim();

            if (!text.length) continue;

            if (COMMAND_LINE_PATTERN.test(text)) {
                const separatorIndex = text.search(/\s/);

                commands.push({
                    command: separatorIndex === -1 ? text : text.substring(0, separatorIndex),
                    args: separatorIndex === -1 ? '' : text.substring(separatorIndex + 1).trim(),
                    description: '',
                    raw: text
                });
                continue;
            }

            if (commands.length) {
                const lastCommand = commands[commands.length - 1];

                lastCommand.description = lastCommand.description ? `${lastCommand.description} ${text}` : text;
                continue;
            }

            intro.push(text);
        }

        return { intro, commands };
    }, [alertLines]);

    const visitUrl = () => {
        OpenUrl(item.clickUrl);

        onClose();
    };

    const copyCommandToChatInput = (command: string) => {
        const chatValue = command.endsWith(' ') ? command : `${command} `;

        DispatchUiEvent(new RoomWidgetUpdateChatInputContentEvent(RoomWidgetUpdateChatInputContentEvent.TEXT, chatValue));
    };

    const hasFrank = item.alertType === NotificationAlertType.DEFAULT;
    const alertClassNames = hasCommandTemplate ? [...classNames, 'nitro-alert-command-list'] : classNames;

    // The listing arrives on the MOTD channel, so the window would be headed
    // "Messages for you". Its own first line names it better - promote that to
    // the card header instead of drawing a second heading inside the body.
    const hasCommandHeading = hasCommandTemplate && COMMAND_HEADING_PATTERN.test(commandTemplateContent.intro[0] ?? '');

    const visibleCommands = useMemo(() => {
        const needle = commandFilter.trim().toLowerCase();

        if (!needle.length) return commandTemplateContent.commands;

        return commandTemplateContent.commands.filter(
            (entry) =>
                entry.command.toLowerCase().includes(needle) ||
                entry.args.toLowerCase().includes(needle) ||
                entry.description.toLowerCase().includes(needle)
        );
    }, [commandFilter, commandTemplateContent]);

    // Only promote the heading when it really is the "Your Commands(n):" line;
    // an alert that merely contains several :command lines keeps its own title.
    // The count tracks the filter so the header reflects what is on screen.
    const commandTitle = useMemo(() => {
        if (!hasCommandHeading) return null;

        const heading = commandTemplateContent.intro[0].replace(/:\s*$/, '');
        const total = commandTemplateContent.commands.length;
        const shown = visibleCommands.length;

        return heading.replace(/\s*\(\s*\d+\s*\)/, shown === total ? ` (${total})` : ` (${shown}/${total})`);
    }, [hasCommandHeading, commandTemplateContent, visibleCommands]);

    return (
        <LayoutNotificationAlertView
            title={commandTitle ?? title}
            onClose={onClose}
            classNames={alertClassNames}
            {...rest}
            type={hasFrank ? NotificationAlertType.DEFAULT : item.alertType}
        >
            <Flex fullHeight gap={hasFrank || (item.imageUrl && !imageFailed) ? 2 : 0} overflow="auto">
                {hasFrank && !item.imageUrl && <div className="notification-frank shrink-0" />}
                {item.imageUrl && !imageFailed && (
                    <img
                        alt={item.title}
                        className="align-self-baseline"
                        src={item.imageUrl}
                        onError={() => {
                            setImageFailed(true);
                        }}
                    />
                )}
                <div className={['notification-text overflow-y-auto flex flex-col w-full', item.clickUrl && !hasFrank ? 'justify-center' : ''].join(' ')}>
                    {hasCommandTemplate && (
                        <div className="notification-command-template">
                            {commandTemplateContent.intro.slice(hasCommandHeading ? 1 : 0).map((text, index) => (
                                <div key={index} className="notification-command-copy">
                                    {text}
                                </div>
                            ))}
                            <CommandFilterInput value={commandFilter} onChange={setCommandFilter} />
                            {!visibleCommands.length && <div className="notification-command-copy">{LocalizeText('generic.no_results_found')}</div>}
                            {visibleCommands.map((entry, index) => (
                                <button
                                    key={`${entry.command}-${index}`}
                                    className="notification-command-row"
                                    type="button"
                                    onClick={() => copyCommandToChatInput(entry.raw)}
                                >
                                    <span className="notification-command-name">{entry.command}</span>
                                    <span className="notification-command-detail">
                                        {entry.args && <span className="notification-command-args">{entry.args}</span>}
                                        {entry.description && <span className="notification-command-description">{entry.description}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    {!hasCommandTemplate &&
                        item.messages.length > 0 &&
                        item.messages.map((message, index) => {
                            const htmlText = message.replace(/\r\n|\r|\n/g, '<br />');

                            return <div key={index} dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} />;
                        })}
                    {item.clickUrl && item.clickUrl.length > 0 && item.imageUrl && !imageFailed && (
                        <>
                            <hr className="my-2 w-full" />
                            <Button className="align-self-center px-3" onClick={visitUrl}>
                                {LocalizeText(item.clickUrlText)}
                            </Button>
                        </>
                    )}
                </div>
            </Flex>
            {(!item.imageUrl || (item.imageUrl && imageFailed)) && (
                <>
                    <Column center alignItems="center" gap={0}>
                        <hr className="my-2 w-full" />
                        {!item.clickUrl && <Button onClick={onClose}>{LocalizeText('generic.close')}</Button>}
                        {item.clickUrl && item.clickUrl.length > 0 && <Button onClick={visitUrl}>{LocalizeText(item.clickUrlText)}</Button>}
                    </Column>
                </>
            )}
        </LayoutNotificationAlertView>
    );
};
