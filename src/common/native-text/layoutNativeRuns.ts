/** A piece of text in one style (`style` indexes the caller's fonts). */
export interface NativeRun {
    text: string;
    style: number;
}

/** A run placed on a line: `x` is its left edge in pixels. */
export interface PlacedNativeRun extends NativeRun {
    x: number;
}

export interface NativeRunsLayout {
    lines: PlacedNativeRun[][];
    width: number;
}

/**
 * Lays styled runs out like one AIR TextField: words flow across run boundaries, a line breaks at the last space that fits (the
 * space stays on the line it ends), and a word longer than a whole line is split by characters. `measure` gives the advance of a
 * text in a style; `width` is the line width (Infinity for one line).
 */
export const layoutNativeRuns = (runs: NativeRun[], width: number, measure: (style: number, text: string) => number): NativeRunsLayout => {
    const lines: PlacedNativeRun[][] = [[]];
    let x = 0;

    const place = (style: number, text: string) => {
        const line = lines[lines.length - 1];
        const last = line[line.length - 1];

        if (last && last.style === style) last.text += text;
        else line.push({ text, style, x });

        x += measure(style, text);
    };

    const breakLine = () => {
        lines.push([]);
        x = 0;
    };

    const fitCharacters = (style: number, text: string, room: number) => {
        let count = 0;

        while (count < text.length && measure(style, text.slice(0, count + 1)) <= room) count++;

        return count;
    };

    for (const run of runs) {
        for (const token of run.text.split(/(\s+)/).filter(Boolean)) {
            const tokenWidth = measure(run.style, token);

            if (/^\s+$/.test(token) || x + tokenWidth <= width) {
                place(run.style, token);
                continue;
            }

            if (x > 0 && tokenWidth <= width) {
                breakLine();
                place(run.style, token);
                continue;
            }

            // Longer than a whole line: fill the rest of this line, then as many full lines as it takes.
            let rest = token;

            while (rest) {
                const count = fitCharacters(run.style, rest, width - x) || (x > 0 ? 0 : 1);

                if (count) place(run.style, rest.slice(0, count));

                rest = rest.slice(count);

                if (rest) breakLine();
            }
        }
    }

    const lineWidth = (line: PlacedNativeRun[]) => {
        const last = line[line.length - 1];

        return last ? last.x + measure(last.style, last.text.replace(/\s+$/, '')) : 0;
    };

    return { lines, width: Math.max(0, ...lines.map(lineWidth)) };
};
