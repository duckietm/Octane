import { FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { layoutNativeRuns, NativeRunsLayout } from '../../../../common/native-text/layoutNativeRuns';
import { loadNativeFont, measureNativeText, NativeFontStyle, peekNativeFont, supportsNativeText } from '../../../../common/native-text/NativeFont';
import { NativeText } from '../../../../common/native-text/NativeText';
import { resolveLineMetrics } from '../../../../common/native-text/NativeTextRenderer';
import { isNativeTextEnabled } from '../../../../common/native-text/nativeTextEnabled';
import { resolveCssNativeFont } from '../../../../common/native-text/resolveCssNativeFont';

interface ChatNativeContentProps {
    /** Changes whenever the bubble's text, size or translation changes: the content is measured again. */
    measureKey: string;
    /** The browser-text content (UserIdentityView + the `.message` span): measured first, kept when the native fonts cannot draw it. */
    children: ReactNode;
}

interface ChatNativeLayout {
    key: string;
    fonts: NativeFontStyle[];
    layout: NativeRunsLayout;
    lineHeight: number;
}

const cssFont = (element: Element) => {
    const css = getComputedStyle(element);

    return resolveCssNativeFont({
        fontFamily: css.fontFamily,
        fontSize: css.fontSize,
        fontWeight: css.fontWeight,
        fontStyle: css.fontStyle,
        color: css.color,
        letterSpacing: css.letterSpacing,
        textTransform: css.textTransform,
        textDecorationLine: css.textDecorationLine,
        whiteSpace: 'normal'
    })?.style;
};

// The width the bubble lets its text use: its max-width less what sits left and right of the text.
const wrapWidth = (content: HTMLElement) => {
    const bubble = content.parentElement;
    const maxWidth = bubble ? parseFloat(getComputedStyle(bubble).maxWidth) : NaN;

    if (!Number.isFinite(maxWidth)) return Infinity;

    const css = getComputedStyle(content);

    return Math.max(1, maxWidth - content.offsetLeft - (parseFloat(css.paddingLeft) || 0) - (parseFloat(css.paddingRight) || 0));
};

/**
 * A chat bubble's name and message drawn as AIR draws them: one TextField, the bold name (u_chat_name) running straight into the
 * message (u_chat_speak / shout / whisper), wrapped together at the bubble's width. Font, size and colour come from the bubble's
 * CSS, so the bubble styles keep their colours. A message with markup (links, @mentions, colour tags), a name with a prefix, icon
 * or font markup, or text the native fonts lack stays browser text.
 */
export const ChatNativeContent: FC<ChatNativeContentProps> = ({ measureKey, children }) => {
    const sourceRef = useRef<HTMLSpanElement>(null);
    const [native, setNative] = useState<ChatNativeLayout | null>(null);
    const [fontTick, setFontTick] = useState(0);
    const key = `${measureKey}\u0000${fontTick}`;
    const current = native?.key === key ? native : null;

    useLayoutEffect(() => {
        const source = sourceRef.current;
        const content = source?.parentElement;

        if (!source || !content || native?.key === key || !isNativeTextEnabled()) return;

        const nameElement = source.querySelector('.username');
        const messages = source.querySelectorAll('.message');
        const message = messages[0];

        if (messages.length !== 1 || message.children.length || source.querySelector('.prefix, img') || nameElement?.children.length) return;

        // The name (when shown) and the message, each in the style its CSS gives it.
        const parts = [nameElement, message]
            .filter((element) => element?.textContent)
            .map((element) => ({ text: element.textContent, font: cssFont(element) }));
        const runs = parts.map((part) => part.text);
        const fonts = parts.map((part) => part.font);

        if (!parts.length || fonts.some((font) => !font)) return;

        const loaded = fonts.map((font) => peekNativeFont(font));

        if (loaded.some((font) => !font)) {
            let disposed = false;

            Promise.all(fonts.map((font) => loadNativeFont(font)))
                .then(() => !disposed && setFontTick((tick) => tick + 1))
                .catch(() => undefined);

            return () => {
                disposed = true;
            };
        }

        if (runs.some((text, index) => !supportsNativeText(loaded[index].font, text))) return;

        const layout = layoutNativeRuns(
            runs.map((text, style) => ({ text, style })),
            wrapWidth(content),
            (style, text) => measureNativeText(loaded[style].font, text, fonts[style])
        );
        const lineHeight = Math.max(...fonts.map((font, index) => resolveLineMetrics(loaded[index].font.swfFont, font.size).textHeight));

        setNative({ key, fonts, layout, lineHeight });
    }, [key, native?.key]);

    if (!current) {
        return (
            <span ref={sourceRef} style={{ display: 'contents' }}>
                {children}
            </span>
        );
    }

    const { fonts, layout, lineHeight } = current;

    return (
        <span
            ref={sourceRef}
            className="octane-chat-native"
            style={{
                position: 'relative',
                display: 'inline-block',
                verticalAlign: 'top',
                width: Math.ceil(layout.width),
                height: Math.ceil(layout.lines.length * lineHeight)
            }}
        >
            {layout.lines.map((line, lineIndex) =>
                line
                    .filter((run) => run.text.trim())
                    .map((run) => (
                        <NativeText
                            key={`${lineIndex}:${run.x}`}
                            background={null}
                            overrides={fonts[run.style]}
                            style={{ position: 'absolute', left: Math.round(run.x) - 2, top: Math.round(lineIndex * lineHeight) - 2 }}
                            text={run.text.replace(/\s+$/, '')}
                            textStyle="u_chat_speak"
                        />
                    ))
            )}
        </span>
    );
};
