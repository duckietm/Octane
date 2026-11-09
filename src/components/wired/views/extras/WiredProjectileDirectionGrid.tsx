import { FC } from 'react';
import { isFourWayProjectileSystem, resolveProjectileDirection } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const RADIUS = 5;
const SIZE = RADIUS * 2 + 1;
const TILE_WIDTH = 16;
const TILE_HEIGHT = 8;

const SHOOTER_FILL = '#ffffff';
const EVEN_FILL = '#ffe600';
const ODD_FILL = '#0b62c4';
const STROKE = '#000000';

const tileFill = (system: number, dx: number, dy: number): string => {
    const direction = resolveProjectileDirection(system, dx, dy);

    if (direction < 0) return SHOOTER_FILL;

    const wedge = isFourWayProjectileSystem(system) ? direction / 2 : direction;

    return wedge % 2 === 0 ? EVEN_FILL : ODD_FILL;
};

export const WiredProjectileDirectionGrid: FC<{ system: number; disabled?: boolean }> = ({ system, disabled = false }) => {
    const width = SIZE * TILE_WIDTH;
    const height = SIZE * TILE_HEIGHT;
    const tiles = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const left = (x - y) * (TILE_WIDTH / 2) + width / 2;
            const top = (x + y) * (TILE_HEIGHT / 2);
            const points = [
                `${left},${top}`,
                `${left + TILE_WIDTH / 2},${top + TILE_HEIGHT / 2}`,
                `${left},${top + TILE_HEIGHT}`,
                `${left - TILE_WIDTH / 2},${top + TILE_HEIGHT / 2}`
            ].join(' ');

            tiles.push(<polygon key={`${x}-${y}`} fill={tileFill(system, x - RADIUS, y - RADIUS)} points={points} stroke={STROKE} strokeWidth={0.5} />);
        }
    }

    return (
        <NativeTextTree>
            <div className="octane-wired__projectile-grid" style={{ opacity: disabled ? 0.4 : 1 }}>
                <svg aria-hidden="true" height={height + 4} viewBox={`-2 -2 ${width + 4} ${height + 4}`} width={width + 4}>
                    {tiles}
                    <polygon
                        fill="none"
                        points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`}
                        stroke={STROKE}
                        strokeLinejoin="round"
                        strokeWidth={2}
                    />
                </svg>
            </div>
        </NativeTextTree>
    );
};
