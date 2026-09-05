import { GetRoomEngine } from '@octane/renderer';
import { CSSProperties, FC, JSX, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaMinus, FaPlus, FaTimes } from 'react-icons/fa';
import { MdGridOn } from 'react-icons/md';
import { LocalizeText, WiredFurniType } from '../../../../api';
import sourceFurniIcon from '../../../../assets/images/wired/source_furni.png';
import sourceUserIcon from '../../../../assets/images/wired/source_user.png';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const SOURCE_USER_TRIGGER = 0;
const SOURCE_USER_SIGNAL = 1;
const SOURCE_USER_CLICKED = 2;
const SOURCE_FURNI_TRIGGER = 3;
const SOURCE_FURNI_PICKED = 4;
const SOURCE_FURNI_SIGNAL = 5;

const USER_SOURCES = sortWiredSourceOptions(
    [
        { value: SOURCE_USER_TRIGGER, label: 'wiredfurni.params.sources.users.0' },
        { value: SOURCE_USER_SIGNAL, label: 'wiredfurni.params.sources.users.201' },
        { value: SOURCE_USER_CLICKED, label: 'wiredfurni.params.sources.users.11' }
    ],
    'users'
);

const FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: SOURCE_FURNI_TRIGGER, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_FURNI_PICKED, label: 'wiredfurni.params.sources.furni.100' },
        { value: SOURCE_FURNI_SIGNAL, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

const SOURCE_GROUP_BUTTONS = [
    { key: 'user', icon: sourceUserIcon, isUserGroup: true },
    { key: 'furni', icon: sourceFurniIcon, isUserGroup: false }
] as const;

const TILE_W = 22;
const TILE_H = 11;
const GRID_RANGE = 4;
const CX = GRID_RANGE * TILE_W + TILE_W / 2;
const CY = GRID_RANGE * TILE_H + TILE_H / 2;
const GRID_PX_W = (GRID_RANGE * 2 + 1) * TILE_W;
const GRID_PX_H = (GRID_RANGE * 2 + 1) * TILE_H;

type Tile = { x: number; y: number };

const tileIncluded = (tiles: Tile[], x: number, y: number) => tiles.some((tile) => tile.x === x && tile.y === y);
const tileLeft = (rx: number, ry: number) => CX + (rx - ry) * (TILE_W / 2) - TILE_W / 2;
const tileTop = (rx: number, ry: number) => CY + (rx + ry) * (TILE_H / 2) - TILE_H / 2;

interface NeighborhoodGridProps {
    selectedTiles: Tile[];
    targetTile: Tile;
    invert: boolean;
    onSetTile: (x: number, y: number, selected: boolean) => void;
    onMoveTarget: (x: number, y: number) => void;
    targetPlacementMode: boolean;
}

const NeighborhoodGrid: FC<NeighborhoodGridProps> = (props) => {
    const { selectedTiles = [], targetTile, invert = false, onSetTile = null, onMoveTarget = null, targetPlacementMode = false } = props;
    const [dragMode, setDragMode] = useState<'add' | 'remove' | 'target' | null>(null);
    const tiles: JSX.Element[] = [];

    useEffect(() => {
        const stopDragging = () => setDragMode(null);

        window.addEventListener('mouseup', stopDragging);

        return () => window.removeEventListener('mouseup', stopDragging);
    }, []);

    const beginTileDrag = (event: ReactMouseEvent<HTMLDivElement>, rx: number, ry: number, isSelected: boolean) => {
        event.preventDefault();

        if (targetPlacementMode) {
            setDragMode('target');
            onMoveTarget && onMoveTarget(rx, ry);
            return;
        }

        const nextDragMode = isSelected ? 'remove' : 'add';

        setDragMode(nextDragMode);
        onSetTile && onSetTile(rx, ry, nextDragMode === 'add');
    };

    const continueTileDrag = (event: ReactMouseEvent<HTMLDivElement>, rx: number, ry: number) => {
        if (!(event.buttons & 1) || !dragMode) return;

        if (dragMode === 'target') {
            onMoveTarget && onMoveTarget(rx, ry);
            return;
        }

        onSetTile && onSetTile(rx, ry, dragMode === 'add');
    };

    for (let ry = -GRID_RANGE; ry <= GRID_RANGE; ry++) {
        for (let rx = -GRID_RANGE; rx <= GRID_RANGE; rx++) {
            const isTarget = rx === targetTile.x && ry === targetTile.y;
            const isSelected = tileIncluded(selectedTiles, rx, ry);
            const isActive = invert ? !isSelected : isSelected;
            const left = tileLeft(rx, ry);
            const top = tileTop(rx, ry);
            const zIndex = rx + ry + GRID_RANGE * 2 + 10;

            const diamondStyle: CSSProperties = {
                position: 'absolute',
                width: TILE_W,
                height: TILE_H,
                left,
                top,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: isActive ? '#3399ff' : '#2a3042',
                cursor: 'pointer',
                zIndex,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isTarget ? '#ffffff' : 'transparent',
                fontSize: 10
            };

            const borderStyle: CSSProperties = {
                position: 'absolute',
                width: TILE_W + (isTarget ? 6 : 2),
                height: TILE_H + (isTarget ? 6 : 2),
                left: left - (isTarget ? 3 : 1),
                top: top - (isTarget ? 3 : 1),
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: isTarget ? '#ffffff' : isActive ? '#1166cc' : '#1a2032',
                zIndex: zIndex - 1,
                pointerEvents: 'none'
            };

            const outlineStyle: CSSProperties = {
                position: 'absolute',
                width: TILE_W + 4,
                height: TILE_H + 4,
                left: left - 2,
                top: top - 2,
                zIndex: zIndex + 1,
                pointerEvents: 'none',
                overflow: 'visible'
            };

            tiles.push(
                <div key={`border-${rx}-${ry}`} style={borderStyle} />,
                isTarget && (
                    <svg key={`outline-${rx}-${ry}`} style={outlineStyle} viewBox={`0 0 ${TILE_W + 4} ${TILE_H + 4}`}>
                        <polygon
                            points={`${(TILE_W + 4) / 2},2 ${TILE_W + 2},${(TILE_H + 4) / 2} ${(TILE_W + 4) / 2},${TILE_H + 2} 2,${(TILE_H + 4) / 2}`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1"
                        />
                    </svg>
                ),
                <div
                    key={`tile-${rx}-${ry}`}
                    style={diamondStyle}
                    title={`(${rx}, ${ry})`}
                    onMouseDown={(event) => beginTileDrag(event, rx, ry, isSelected)}
                    onMouseEnter={(event) => continueTileDrag(event, rx, ry)}
                />
            );
        }
    }

    return (
        <div style={{ position: 'relative', width: GRID_PX_W, height: GRID_PX_H, flexShrink: 0 }} onContextMenu={(event) => event.preventDefault()}>
            {tiles}
        </div>
    );
};

export const WiredNeighborhoodSelectorView: FC<{}> = () => {
    const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const [sourceType, setSourceType] = useState(SOURCE_USER_TRIGGER);
    const [targetTile, setTargetTile] = useState<Tile>({ x: 0, y: 0 });
    const [targetPlacementMode, setTargetPlacementMode] = useState(false);
    const [curX, setCurX] = useState(0);
    const [curY, setCurY] = useState(0);

    const { trigger = null, furniIds = [], setIntParams } = useWired();
    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);

    useEffect(() => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        if (params.length >= 1) setSourceType(params[0]);
        if (params.length >= 2) setFilterExisting(params[1] === 1);
        if (params.length >= 3) setInvert(params[2] === 1);
        if (params.length >= 5) setTargetTile({ x: params[3], y: params[4] });
        else setTargetTile({ x: 0, y: 0 });

        if (params.length < 6) {
            setSelectedTiles([]);
            return;
        }

        const tileCount = params[5];
        const nextTiles: Tile[] = [];

        for (let index = 0; index < tileCount; index++) {
            const tileIndex = 6 + index * 2;

            if (tileIndex + 1 >= params.length) break;

            nextTiles.push({ x: params[tileIndex], y: params[tileIndex + 1] });
        }

        setSelectedTiles(nextTiles);
    }, [trigger]);

    useEffect(() => {
        if (sourceType !== SOURCE_USER_CLICKED) return;
        if (availableUserSources.some((option) => option.value === SOURCE_USER_CLICKED)) return;

        setSourceType(SOURCE_USER_TRIGGER);
    }, [availableUserSources, sourceType]);

    const save = useCallback(() => {
        setIntParams([
            sourceType,
            filterExisting ? 1 : 0,
            invert ? 1 : 0,
            targetTile.x,
            targetTile.y,
            selectedTiles.length,
            ...selectedTiles.flatMap((tile) => [tile.x, tile.y])
        ]);
    }, [filterExisting, invert, selectedTiles, setIntParams, sourceType, targetTile.x, targetTile.y]);

    const setTileSelection = useCallback((x: number, y: number, selected: boolean) => {
        setSelectedTiles((previous) => {
            const alreadySelected = tileIncluded(previous, x, y);

            if (selected) {
                if (alreadySelected) return previous;

                return [...previous, { x, y }];
            }

            if (!alreadySelected) return previous;

            return previous.filter((tile) => !(tile.x === x && tile.y === y));
        });
    }, []);

    const activeSources = useMemo(() => (sourceType <= SOURCE_USER_CLICKED ? availableUserSources : FURNI_SOURCES), [availableUserSources, sourceType]);
    const isUserGroup = sourceType <= SOURCE_USER_CLICKED;
    const currentIndex = Math.max(
        0,
        activeSources.findIndex((option) => option.value === sourceType)
    );
    const currentSourceType = activeSources[currentIndex]?.value ?? sourceType;

    useEffect(() => {
        if (currentSourceType === sourceType) return;

        setSourceType(currentSourceType);
    }, [currentSourceType, sourceType]);

    const changeGroup = useCallback(
        (nextIsUserGroup: boolean) => {
            if (nextIsUserGroup === isUserGroup) return;

            const nextOptions = nextIsUserGroup ? availableUserSources : FURNI_SOURCES;
            const nextIndex = Math.min(currentIndex, Math.max(0, nextOptions.length - 1));
            const nextOption = nextOptions[nextIndex] ?? nextOptions[0];

            if (nextOption) setSourceType(nextOption.value);
        },
        [availableUserSources, currentIndex, isUserGroup]
    );

    const addTile = useCallback(() => {
        setSelectedTiles((previous) => {
            if (tileIncluded(previous, curX, curY)) return previous;

            return [...previous, { x: curX, y: curY }];
        });
    }, [curX, curY]);

    const removeTile = useCallback(() => {
        setSelectedTiles((previous) => previous.filter((tile) => !(tile.x === curX && tile.y === curY)));
    }, [curX, curY]);

    const loadDefaultPattern = useCallback(() => {
        const nextTiles: Tile[] = [];

        for (let y = -2; y <= 2; y++) {
            for (let x = -2; x <= 2; x++) {
                if (x === 0 && y === 0) continue;

                nextTiles.push({ x, y });
            }
        }

        setSelectedTiles(nextTiles);
    }, []);

    const requiresFurni = sourceType === SOURCE_FURNI_PICKED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} hideDelay={true} cardStyle={{ width: '400px' }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.neighborhood_selection')}</Text>

                <div className="flex items-center gap-1">
                    <Button
                        variant={targetPlacementMode ? 'success' : 'secondary'}
                        className="px-2 py-1"
                        onClick={() => setTargetPlacementMode((value) => !value)}
                        title="Sposta target"
                    >
                        <span aria-hidden className="relative inline-block h-[14px] w-[14px]">
                            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
                            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                            <span className="absolute left-1/2 top-1/2 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current" />
                        </span>
                    </Button>
                    <Button variant="success" className="px-2 py-1" onClick={addTile} title={LocalizeText('wiredfurni.tooltip.select.tile')}>
                        <FaPlus />
                    </Button>
                    <Button variant="danger" className="px-2 py-1" onClick={removeTile} title={LocalizeText('wiredfurni.tooltip.remove.tile')}>
                        <FaMinus />
                    </Button>
                    <Button variant="primary" className="px-2 py-1" onClick={loadDefaultPattern} title={LocalizeText('wiredfurni.tooltip.remove.5x5_tile')}>
                        <MdGridOn />
                    </Button>
                    <Button
                        variant="secondary"
                        className="px-2 py-1"
                        onClick={() => setSelectedTiles([])}
                        title={LocalizeText('wiredfurni.tooltip.remove.clear_tile')}
                    >
                        <FaTimes />
                    </Button>
                </div>

                <div className="flex justify-center">
                    <NeighborhoodGrid
                        selectedTiles={selectedTiles}
                        targetTile={targetTile}
                        invert={invert}
                        onSetTile={setTileSelection}
                        onMoveTarget={(x, y) => setTargetTile({ x, y })}
                        targetPlacementMode={targetPlacementMode}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Text small>X:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: 56 }}
                        value={curX}
                        min={-GRID_RANGE}
                        max={GRID_RANGE}
                        onChange={(event) => setCurX(parseInt(event.target.value) || 0)}
                    />
                    <Text small>Y:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: 56 }}
                        value={curY}
                        min={-GRID_RANGE}
                        max={GRID_RANGE}
                        onChange={(event) => setCurY(parseInt(event.target.value) || 0)}
                    />
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-1">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filterExisting}
                        onChange={(event) => setFilterExisting(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-1">
                    <input type="checkbox" className="form-check-input" checked={invert} onChange={(event) => setInvert(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>

                <hr className="m-0 bg-dark" />

                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.neighborhood"
                    options={activeSources}
                    value={sourceType}
                    selectionKind={isUserGroup ? 'primary' : 'secondary'}
                    selectionActive={sourceType === SOURCE_FURNI_PICKED}
                    selectionCount={furniIds.length}
                    selectionLimit={trigger?.maximumItemSelectionCount ?? 20}
                    selectionEnabledValues={[SOURCE_FURNI_PICKED]}
                    showSelectionToggle={false}
                    headerContent={
                        <div className="octane-wired__give-var-targets">
                            {SOURCE_GROUP_BUTTONS.map((button) => (
                                <button
                                    key={button.key}
                                    type="button"
                                    className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${isUserGroup === button.isUserGroup ? 'is-active' : ''}`}
                                    onClick={() => changeGroup(button.isUserGroup)}
                                >
                                    <img src={button.icon} alt={button.key} />
                                </button>
                            ))}
                        </div>
                    }
                    onChange={(value) => setSourceType(value)}
                />

                {sourceType === SOURCE_FURNI_PICKED && (
                    <Text small className="text-center">
                        {LocalizeText(
                            'wiredfurni.pickfurnis.caption',
                            ['count', 'limit'],
                            [furniIds.length.toString(), (trigger?.maximumItemSelectionCount ?? 20).toString()]
                        )}
                    </Text>
                )}
            </div>
        </WiredSelectorBaseView>
    );
};
