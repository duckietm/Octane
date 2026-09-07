import { FC, useMemo, useState } from 'react';
import { FaCheck, FaCopy } from 'react-icons/fa';
import { LocalizeText, NotificationAlertItem } from '../../../../api';
import { Button, Column, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationFurniDataAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

const BASE_SECTION_PATTERN = /^<b>\s*items_base table\s*<\/b>$/i;
const ROOM_SECTION_PATTERN = /^<b>\s*items\/room\s*<\/b>$/i;
const ITEM_NAME_PATTERN = /<b>([^<]*)<\/b>/;

interface FurniDataRow {
    label: string;
    value: string;
}

interface FurniDataSection {
    title: string;
    kind: 'base' | 'room';
    rows: FurniDataRow[];
}

const splitAlertLines = (item: NotificationAlertItem): string[] => {
    if (!item || !item.messages || !item.messages.length) return [];

    return item.messages.flatMap((message) => message.split(/\r\n|\r|\n/g)).map((line) => line.trim());
};

export const isFurniDataAlert = (item: NotificationAlertItem): boolean => {
    const lines = splitAlertLines(item);

    return lines.some((line) => BASE_SECTION_PATTERN.test(line)) && lines.some((line) => ROOM_SECTION_PATTERN.test(line));
};

const parseRow = (line: string): FurniDataRow => {
    const text = line.replace(/^-\s*/, '');
    const separatorIndex = text.indexOf(':');

    if (separatorIndex === -1) return { label: '', value: text };

    return { label: text.substring(0, separatorIndex).trim(), value: text.substring(separatorIndex + 1).trim() };
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch { }
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
};

export const NotificationFurniDataAlertView: FC<NotificationFurniDataAlertViewProps> = (props) => {
    const { item = null, title = (props.item && props.item.title) || '', onClose = null, classNames = [], ...rest } = props;
    const [copiedSection, setCopiedSection] = useState<string>(null);

    const { itemName, sections } = useMemo(() => {
        let name = '';
        const parsedSections: FurniDataSection[] = [];

        for (const line of splitAlertLines(item)) {
            if (!line.length) continue;

            if (BASE_SECTION_PATTERN.test(line)) {
                parsedSections.push({ title: 'items_base table', kind: 'base', rows: [] });
                continue;
            }

            if (ROOM_SECTION_PATTERN.test(line)) {
                parsedSections.push({ title: 'items/room', kind: 'room', rows: [] });
                continue;
            }

            if (parsedSections.length) {
                parsedSections[parsedSections.length - 1].rows.push(parseRow(line));
                continue;
            }

            const nameMatch = line.match(ITEM_NAME_PATTERN);

            if (nameMatch) name = nameMatch[1];
        }

        return { itemName: name, sections: parsedSections };
    }, [item]);

    const copySection = async (section: FurniDataSection) => {
        const text = [section.title, ...section.rows.map((row) => (row.label ? `${row.label}: ${row.value}` : row.value))].join('\n');
        const copied = await copyTextToClipboard(text);

        if (copied) {
            setCopiedSection(section.title);
            window.setTimeout(() => setCopiedSection((current) => (current === section.title ? null : current)), 2000);
        }
    };

    return (
        <LayoutNotificationAlertView title={title} onClose={onClose} classNames={[...classNames, 'octane-alert-furnidata']} {...rest} type={item.alertType}>
            <div className="furnidata-item-banner">
                <span className="furnidata-item-icon">🛋️</span>
                <span className="furnidata-item-name">{itemName || 'Unknown item'}</span>
            </div>
            <Column fullHeight gap={2} overflow="auto" className="furnidata-body">
                {sections.map((section) => (
                    <div key={section.title} className={`furnidata-section furnidata-section-${section.kind}`}>
                        <div className="furnidata-section-header">
                            <span className="furnidata-section-icon">{section.kind === 'base' ? '📦' : '📍'}</span>
                            <span className="furnidata-section-title">{section.title}</span>
                            <button className="furnidata-copy-btn" type="button" onClick={() => copySection(section)}>
                                {copiedSection === section.title ? (
                                    <>
                                        <FaCheck size={10} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <FaCopy size={10} /> Copy
                                    </>
                                )}
                            </button>
                        </div>
                        <ul className="furnidata-rows">
                            {section.rows.map((row, index) => (
                                <li key={index}>
                                    {row.label && <span className="furnidata-row-label">{row.label}</span>}
                                    <span className="furnidata-row-value">{row.value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </Column>
            <Column center alignItems="center" gap={0}>
                <hr className="my-2 w-full" />
                <Button onClick={onClose}>{LocalizeText('generic.close')}</Button>
            </Column>
        </LayoutNotificationAlertView>
    );
};
