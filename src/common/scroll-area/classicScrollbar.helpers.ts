export interface ClassicScrollbarMetrics {
    overflow: boolean;
    thumbSize: number;
    thumbOffset: number;
}

export const getClassicScrollbarMetrics = (scrollHeight: number, clientHeight: number, trackHeight: number, scrollTop: number, minThumbSize = 12): ClassicScrollbarMetrics => {
    if (scrollHeight <= clientHeight || clientHeight <= 0 || trackHeight <= 0) {
        return { overflow: false, thumbSize: Math.max(0, trackHeight), thumbOffset: 0 };
    }

    const thumbSize = Math.max(minThumbSize, Math.min(trackHeight, Math.round((trackHeight * clientHeight) / scrollHeight)));
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbOffset = trackHeight - thumbSize;
    const normalizedScrollTop = Math.max(0, Math.min(maxScroll, scrollTop));

    return {
        overflow: true,
        thumbSize,
        thumbOffset: Math.round((normalizedScrollTop / maxScroll) * maxThumbOffset)
    };
};
