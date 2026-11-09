import { FC, useEffect, useState } from 'react';
import { loadNativeFont, measureNativeText } from '../../../common/native-text/NativeFont';
import { resolveLineMetrics } from '../../../common/native-text/NativeTextRenderer';
import { NativeText } from '../../../common/native-text/NativeText';
import { nativeTextStyles } from '../../../common/native-text/NativeTextStyles';

interface Segment {
    text: string;
    bold: boolean;
    x: number;
}

interface Line {
    segments: Segment[];
    ascent: number;
}

interface Run {
    text: string;
    bold: boolean;
}

// An html text field: <b> switches to the bold face, <br> breaks the line, any other tag is dropped.
const parseHtml = (html: string): Run[] =>
{
    const runs: Run[] = [];
    let bold = false;

    for (const token of html.split(/(<\/?[a-z][^>]*>)/i))
    {
        const tag = /^<(\/?)([a-z]+)/i.exec(token);

        if (!tag)
        {
            if (token) runs.push({ text: token.replace(/&nbsp;/g, ' ').replace(/\r?\n/g, ''), bold });
        }
        else if (tag[2].toLowerCase() === 'b') bold = !tag[1];
        else if (tag[2].toLowerCase() === 'br') runs.push({ text: '\n', bold });
    }

    return runs;
};

interface GroupRichTextProps {
    html: string;
    x: number;
    y: number;
    width: number;
}

/** Word-wrapped html text drawn with the v75 raster, one NativeText per bold/regular segment of a line (black text only). */
export const GroupRichText: FC<GroupRichTextProps> = ({ html, x, y, width }) =>
{
    const [layout, setLayout] = useState<{ lines: Line[]; lineHeight: number }>(null);

    useEffect(() =>
    {
        let disposed = false;

        const measure = async () =>
        {
            const base = nativeTextStyles.u_regular;
            const fonts = {
                regular: await loadNativeFont({ ...base, bold: false }),
                bold: await loadNativeFont({ ...base, bold: true })
            };
            const metrics = {
                regular: resolveLineMetrics(fonts.regular.font.swfFont, base.size),
                bold: resolveLineMetrics(fonts.bold.font.swfFont, base.size)
            };
            const lineHeight = Math.max(metrics.regular.textHeight, metrics.bold.textHeight);
            const ascent = Math.max(metrics.regular.ascent, metrics.bold.ascent);
            const rawWidth = (text: string, bold: boolean) => measureNativeText((bold ? fonts.bold : fonts.regular).font, text, { ...base, bold });
            // Trailing blanks do not count in a measured run, so blanks are measured between two marks.
            const widthOf = (text: string, bold: boolean) => (/^\s+$/.test(text) ? rawWidth(`|${text}|`, bold) - rawWidth('||', bold) : rawWidth(text, bold));
            const limit = width - 4;
            const lines: Line[] = [{ segments: [], ascent }];
            let cursor = 0;

            for (const run of parseHtml(html))
            {
                for (const word of run.text.split(/(\s+|\n)/).filter(Boolean))
                {
                    if (word === '\n')
                    {
                        lines.push({ segments: [], ascent });
                        cursor = 0;
                        continue;
                    }

                    const wordWidth = widthOf(word, run.bold);
                    const isSpace = /^\s+$/.test(word);

                    if (!isSpace && cursor > 0 && cursor + wordWidth > limit)
                    {
                        lines.push({ segments: [], ascent });
                        cursor = 0;
                    }

                    // A space that wrapped to a new line is dropped.
                    if (isSpace && cursor === 0 && lines.length > 1) continue;

                    const line = lines[lines.length - 1];
                    const last = line.segments[line.segments.length - 1];

                    if (last && last.bold === run.bold) last.text += word;
                    else line.segments.push({ text: word, bold: run.bold, x: cursor });

                    cursor += wordWidth;
                }
            }

            // Each run advances by its own measured width (blanks included), as the glyph advances sum within a run.
            for (const line of lines)
            {
                let advance = 0;

                for (const segment of line.segments)
                {
                    segment.x = advance;
                    advance += rawWidth(`${segment.text}|`, segment.bold) - rawWidth('|', segment.bold);
                }
            }

            if (!disposed) setLayout({ lines, lineHeight });
        };

        measure().catch((error) => console.warn('Native text layout failed', error));

        return () =>
        {
            disposed = true;
        };
    }, [html, width]);

    // html fields place line n at floor(n * line height + 0.65) (measured on the v75 created window).
    // The segments stay direct children of the window so that their multiply blend reaches the frame fill.
    return (
        <>
            {layout?.lines.map((line, index) =>
                line.segments.map((segment) => (
                    <NativeText
                        key={`${index}-${segment.x}`}
                        background={0xffffff}
                        overrides={{ bold: segment.bold }}
                        style={{
                            position: 'absolute',
                            left: x + segment.x,
                            top: y + Math.floor(index * layout.lineHeight + 0.65),
                            zIndex: 1,
                            mixBlendMode: 'multiply'
                        }}
                        text={segment.text}
                        textStyle="u_regular"
                    />
                ))
            )}
        </>
    );
};
