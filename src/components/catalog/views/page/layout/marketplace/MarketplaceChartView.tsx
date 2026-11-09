import { FC, useEffect, useRef } from 'react';
import {
    getMarketplaceChartPoints,
    getMarketplaceChartYMax,
    isMarketplaceChartAvailable,
    MARKETPLACE_CHART_GRID_LINES,
    MARKETPLACE_CHART_HEIGHT,
    MARKETPLACE_CHART_WIDTH
} from '../../../../../../api';

const LABEL_FONT = '9px Volter';
/** Flash's TextField.textHeight for a one-line 9px Volter label. */
const LABEL_HEIGHT = 11;

export interface MarketplaceChartViewProps {
    dayOffsets: number[];
    values: number[];
}

/**
 * AIR MarketplaceChart.draw on a 320x200 bitmap: the axis top and "0" as Volter 9 labels on the
 * left, a #cccccc y axis with six grid lines, and the values as a 2px #0000ff line.
 */
export const MarketplaceChartView: FC<MarketplaceChartViewProps> = (props) => {
    const { dayOffsets = [], values = [] } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        let cancelled = false;

        const draw = () => {
            if (cancelled) return;

            const context = canvas.getContext?.('2d');

            if (!context) return;

            const width = canvas.width;
            const height = canvas.height;

            context.clearRect(0, 0, width, height);

            if (!isMarketplaceChartAvailable(dayOffsets, values)) return;

            const yMax = getMarketplaceChartYMax(values);
            const maxLabel = yMax.toString();

            context.font = LABEL_FONT;
            context.fillStyle = '#000000';
            context.textBaseline = 'top';

            const maxLabelWidth = context.measureText(maxLabel).width;
            const zeroLabelWidth = context.measureText('0').width;

            context.fillText(maxLabel, 0, 0);
            context.fillText('0', maxLabelWidth - zeroLabelWidth + 1, height - LABEL_HEIGHT - 1);

            const chartWidth = width - maxLabelWidth - 2;
            const chartHeight = height - LABEL_HEIGHT;

            context.save();
            context.translate(width - chartWidth, (height - chartHeight) / 2);

            context.strokeStyle = '#cccccc';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(0, chartHeight);

            for (let line = 0; line <= MARKETPLACE_CHART_GRID_LINES; line++) {
                const y = ((chartHeight - 1) / MARKETPLACE_CHART_GRID_LINES) * line;

                context.moveTo(0, y);
                context.lineTo(chartWidth - 1, y);
            }

            context.stroke();

            const points = getMarketplaceChartPoints(dayOffsets, values, chartWidth, chartHeight, yMax);

            context.strokeStyle = '#0000ff';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) context.lineTo(points[i].x, points[i].y);

            context.stroke();
            context.restore();
        };

        draw();

        // Volter is a web font: redraw once it is ready so the labels are measured in it.
        const fonts = typeof document !== 'undefined' ? document.fonts : null;

        if (fonts && typeof fonts.load === 'function') fonts.load(LABEL_FONT).then(draw, () => undefined);

        return () => {
            cancelled = true;
        };
    }, [dayOffsets, values]);

    return <canvas ref={canvasRef} className="octane-marketplace-chart" width={MARKETPLACE_CHART_WIDTH} height={MARKETPLACE_CHART_HEIGHT} />;
};
