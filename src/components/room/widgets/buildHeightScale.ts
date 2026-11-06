/** A mark under the build height slider: its value, where it sits (0 to 100 %) and whether it carries a number. */
export interface BuildHeightMark {
    value: number;
    position: number;
    major: boolean;
}

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

/** The smallest round step that splits the range into at most `parts` parts. */
const niceStep = (span: number, parts: number): number => NICE_STEPS.find((step) => span / step <= parts) ?? Math.ceil(span / parts);

/**
 * Marks for the scale under the slider, like the numbered ruler of AIR's sliders: a numbered mark every round
 * step (at most 4 parts, so the numbers never crowd) and a plain one halfway between two numbers.
 */
export const getBuildHeightMarks = (min: number, max: number): BuildHeightMark[] => {
    const span = max - min;

    if (!Number.isFinite(span) || span <= 0) return [];

    const major = niceStep(span, 4);
    const minor = major / 2;
    const marks: BuildHeightMark[] = [];
    const first = Math.ceil(min / minor) * minor;

    for (let value = first; value <= max + 1e-9; value += minor) {
        const rounded = Math.round(value * 100) / 100;
        const isMajor = Math.abs(rounded / major - Math.round(rounded / major)) < 1e-9;

        marks.push({ value: rounded, position: ((rounded - min) / span) * 100, major: isMajor });
    }

    return marks;
};

/** A height the way the height field writes it: in the viewer's locale ("1,5" in French), one decimal at most. */
export const formatBuildHeight = (value: number, locale?: string): string =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1, useGrouping: false }).format(value);

/** A height rounded to the tenth the tool works in, without float noise (0.30000000000000004). */
export const roundBuildHeight = (value: number): number => Math.round(value * 10) / 10;
