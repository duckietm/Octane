import { convertEmojiShortcodes } from './emojiShortcodes';
import { LocalizeText } from './LocalizeText';

const allowedColours: Map<string, string> = new Map();

allowedColours.set('r', 'red');
allowedColours.set('b', 'blue');
allowedColours.set('g', 'green');
allowedColours.set('y', 'yellow');
allowedColours.set('w', 'white');
allowedColours.set('o', 'orange');
allowedColours.set('c', 'cyan');
allowedColours.set('br', 'brown');
allowedColours.set('pr', 'purple');
allowedColours.set('pk', 'pink');

allowedColours.set('red', 'red');
allowedColours.set('blue', 'blue');
allowedColours.set('green', 'green');
allowedColours.set('yellow', 'yellow');
allowedColours.set('white', 'white');
allowedColours.set('orange', 'orange');
allowedColours.set('cyan', 'cyan');
allowedColours.set('brown', 'brown');
allowedColours.set('purple', 'purple');
allowedColours.set('pink', 'pink');

const encodeHTML = (str: string) => {
    return str.replace(/&#\d+;|[\u00A0-\u9999<>&]/gu, (match) => (match.length > 1 ? match : `&#${match.codePointAt(0)};`));
};

const formatTag = (content: string, tag: string, replacement: (value: string) => string) => {
    const pattern = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi');
    let previous = '';
    let next = content;
    let guard = 0;

    while (previous !== next && guard < 20) {
        previous = next;
        next = next.replace(pattern, (match, value) => replacement(value));
        guard++;
    }

    return next;
};

const applyWiredTextMarkup = (content: string) => {
    const colorStyles: Record<string, string> = {
        green: '#008000',
        cyan: '#008b8b',
        red: '#d60000',
        blue: '#005dff',
        purple: '#7d31b8'
    };

    let result = content;

    result = formatTag(result, 'b', (value) => `<strong>${value}</strong>`);
    result = formatTag(result, 'i', (value) => `<em>${value}</em>`);
    result = formatTag(result, 'u', (value) => `<u>${value}</u>`);

    Object.entries(colorStyles).forEach(([tag, color]) => {
        result = formatTag(result, tag, (value) => `<span style="color:${color}">${value}</span>`);
    });

    return result;
};

const FONT_NAMED_COLORS = new Set([
    'red',
    'green',
    'blue',
    'yellow',
    'white',
    'black',
    'orange',
    'cyan',
    'brown',
    'purple',
    'pink',
    'magenta',
    'violet',
    'gray',
    'grey',
    'lime',
    'teal',
    'gold',
    'silver',
    'navy',
    'maroon',
    'olive',
    'indigo'
]);

export const sanitizeFontColor = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    if (raw.length > 20) return null;

    const value = raw.trim().toLowerCase();

    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return value;
    if (FONT_NAMED_COLORS.has(value)) return value;

    return null;
};

export type FontSegment = { color: string | null; text: string };

const FONT_COLOR_ATTR = /color\s*=\s*(?:"([^"]{1,32})"|'([^']{1,32})'|([^\s"'>]{1,32}))/i;

export const parseFontSegments = (input: string): FontSegment[] => {
    if (!input) return [];

    const pattern = /<font\b([^>]{0,200}?)>([\s\S]{0,200}?)<\/font>/gi;
    const segments: FontSegment[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(input)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ color: null, text: input.slice(lastIndex, match.index) });
        }

        const colorMatch = FONT_COLOR_ATTR.exec(match[1] || '');
        const rawColor = colorMatch ? colorMatch[1] || colorMatch[2] || colorMatch[3] : null;
        const color = sanitizeFontColor(rawColor);

        segments.push({ color, text: match[2] });
        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < input.length) {
        segments.push({ color: null, text: input.slice(lastIndex) });
    }

    return segments;
};

const applyFontMarkup = (content: string) => {
    const fontPattern = /&#60;font\b([^&]{0,200}?)&#62;([\s\S]{0,4000}?)&#60;\/font&#62;/gi;
    const colorAttr = /color\s*=\s*(?:"([^"]{1,32})"|'([^']{1,32})'|([^\s"'>]{1,32}))/i;

    let previous = '';
    let next = content;
    let guard = 0;

    while (previous !== next && guard < 20) {
        previous = next;
        next = next.replace(fontPattern, (_match, attrs: string, inner: string) => {
            const colorMatch = colorAttr.exec(attrs || '');
            const rawColor = colorMatch ? colorMatch[1] || colorMatch[2] || colorMatch[3] : null;
            const color = sanitizeFontColor(rawColor);

            if (!color) return inner;

            return `<span style="color:${color}">${inner}</span>`;
        });
        guard++;
    }

    return next;
};

export const RoomChatFormatter = (content: string) => {
    let result = '';

    content = convertEmojiShortcodes(content);
    content = encodeHTML(content);
    content = applyFontMarkup(content);
    content = applyWiredTextMarkup(content);

    if (content.startsWith('@') && content.indexOf('@', 1) > -1) {
        let match = null;

        while ((match = /@[a-zA-Z]+@/g.exec(content)) !== null) {
            const colorTag = match[0].toString();
            const colorName = colorTag.substr(1, colorTag.length - 2);
            const text = content.replace(colorTag, '');

            if (!allowedColours.has(colorName)) {
                result = text;
            } else {
                const color = allowedColours.get(colorName);
                result = '<span style="color: ' + color + '">' + text + '</span>';
            }
            break;
        }
    } else {
        result = content;
    }

    return result.replace(/\r\n|\r|\n/g, '<br />');
};
