import { FC, useMemo } from 'react';
import { localizeWithFallback } from '../../../../../../api';
import { IMarketplaceChartPoint, isMarketplaceChartAvailable, layoutMarketplaceChart } from './marketplaceChart.helpers';

interface MarketplaceChartViewProps {
    points: IMarketplaceChartPoint[];
    width?: number;
    height?: number;
    title: string;
}

const LABEL_GUTTER = 28;

/**
 * SVG replacement for the official bitmap chart: a value axis with a rounded maximum, five grid
 * lines and one polyline through the daily points.
 */
export const MarketplaceChartView: FC<MarketplaceChartViewProps> = (props) => {
    const { points = [], width = 220, height = 90, title = '' } = props;
    const layout = useMemo(() => layoutMarketplaceChart(points, width, height), [points, width, height]);
    const available = isMarketplaceChartAvailable(points);

    return (
        <div className="octane-marketplace-chart flex flex-col gap-1" data-testid="marketplace-chart">
            <span className="text-xs font-bold">
                {available
                    ? title
                    : localizeWithFallback('catalog.marketplace.offer_details.chart_title.not_available', 'No data (need two days of trading to show graph)')}
            </span>
            {available && (
                <svg
                    aria-label={title}
                    className="octane-marketplace-chart-svg bg-white rounded"
                    height={height + 4}
                    role="img"
                    viewBox={`0 0 ${width + LABEL_GUTTER} ${height + 4}`}
                    width={width + LABEL_GUTTER}
                >
                    <g transform={`translate(${LABEL_GUTTER}, 2)`}>
                        {layout.gridLines.map((y) => (
                            <line key={y} stroke="#cccccc" strokeWidth={1} x1={0} x2={width - 1} y1={y} y2={y} />
                        ))}
                        <line stroke="#cccccc" strokeWidth={1} x1={0} x2={0} y1={0} y2={height - 1} />
                        <polyline
                            data-testid="marketplace-chart-line"
                            fill="none"
                            points={layout.points.map((point) => `${point.x},${point.y}`).join(' ')}
                            stroke="#0000ff"
                            strokeWidth={2}
                        />
                    </g>
                    <text fontSize={9} textAnchor="end" x={LABEL_GUTTER - 3} y={10}>
                        {layout.maxValue}
                    </text>
                    <text fontSize={9} textAnchor="end" x={LABEL_GUTTER - 3} y={height + 2}>
                        0
                    </text>
                </svg>
            )}
        </div>
    );
};
