// The needle of the community goal meter (landing_view_needle_meter_needle0..23 of the window
// manager assets), one frame per step of CommunityGoalWidget.
const rawNeedleFrames = import.meta.glob('./landing_view_needle_meter_needle*.png', { eager: true, import: 'default' });

const NEEDLE_FRAME_URLS: Record<number, string> = Object.entries(rawNeedleFrames).reduce(
    (accumulator, [path, url]) => {
        const frame = Number.parseInt((path.match(/needle(\d+)\.png$/i) || [])[1] ?? '', 10);

        if (Number.isInteger(frame)) accumulator[frame] = url as string;

        return accumulator;
    },
    {} as Record<number, string>
);

export const GetCommunityGoalNeedleUrl = (frame: number): string | null => NEEDLE_FRAME_URLS[Math.max(0, Math.min(23, Math.round(frame)))] ?? null;
