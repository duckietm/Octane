import { GetRoomEngine } from '@octane/renderer';
import { CSSProperties, FC, JSX, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaCompress, FaCrosshairs, FaExpand, FaMinus, FaPlus } from 'react-icons/fa';
import {
    decodeNeighborhood,
    encodeNeighborhood,
    LocalizeText,
    localizeWithFallback,
    NEIGHBORHOOD_MAX_ROOT,
    NEIGHBORHOOD_RADIUS,
    NEIGHBORHOOD_SMALL_RADIUS,
    NeighborhoodTile,
    neighborhoodFitsSmall,
    WiredFurniType
} from '../../../../api';
import sourceFurniIcon from '../../../../assets/images/wired/source_furni.png';
import sourceUserIcon from '../../../../assets/images/wired/source_user.png';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NumberInput } from '../../../../common/NumberInput';

// Official source values (InputSourcesConf): 0 trigger, 11 clicked user, 100 picks, 201 signal.
const SOURCE_TRIGGER = 0;
const SOURCE_CLICKED_USER = 11;
const SOURCE_PICKED = 100;
const SOURCE_SIGNAL = 201;

const USER_SOURCES = sortWiredSourceOptions(
    [
        { value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.users.0' },
        { value: SOURCE_SIGNAL, label: 'wiredfurni.params.sources.users.201' },
        { value: SOURCE_CLICKED_USER, label: 'wiredfurni.params.sources.users.11' }
    ],
    'users'
);

const FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_PICKED, label: 'wiredfurni.params.sources.furni.100' },
        { value: SOURCE_SIGNAL, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

// The official merged picker lists furni first, then users.
const SOURCE_GROUP_BUTTONS = [
    { key: 'furni', icon: sourceFurniIcon, isUser: false },
    { key: 'user', icon: sourceUserIcon, isUser: true }
] as const;

type DrawMode = 'add_tile' | 'remove_tile' | 'set_root_tile';

// FloorDrawingPreset: a tile is 16x8, at (8 * (x - y + 1), 4 * (x + y + 1)).
const TILE_W = 16;
const TILE_H = 8;

const tileKey = (x: number, y: number) => `${ x },${ y }`;

interface NeighborhoodFloorProps
{
    radius: number;
    tiles: Set<string>;
    root: NeighborhoodTile;
    onDraw: (x: number, y: number) => void;
}

const NeighborhoodFloor: FC<NeighborhoodFloorProps> = ({ radius, tiles, root, onDraw }) =>
{
    const [ drawing, setDrawing ] = useState(false);
    const dimension = radius * 2 + 1;
    const width = dimension * TILE_W + TILE_W;
    const height = dimension * TILE_H + TILE_H;

    useEffect(() =>
    {
        const stop = () => setDrawing(false);

        window.addEventListener('mouseup', stop);

        return () => window.removeEventListener('mouseup', stop);
    }, []);

    const cells: JSX.Element[] = [];

    for(let gy = 0; gy < dimension; gy++)
    {
        for(let gx = 0; gx < dimension; gx++)
        {
            const x = gx - radius;
            const y = gy - radius;
            const taken = tiles.has(tileKey(x, y));
            const isRoot = root.x === x && root.y === y;
            const style: CSSProperties = {
                position: 'absolute',
                left: TILE_W / 2 * (gx - gy + dimension - 1),
                top: TILE_H / 2 * (gx + gy),
                width: TILE_W,
                height: TILE_H,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: taken ? '#3fae49' : '#3a4152',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            };
            // The root (where the source stands) is a marker on top of the tile, so a drawn root still
            // shows green underneath, as the official entry-tile image does.
            const rootMarker: CSSProperties = {
                width: TILE_W / 2,
                height: TILE_H / 2,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: '#ffffff',
                pointerEvents: 'none'
            };

            cells.push(
                <div
                    key={ tileKey(x, y) }
                    style={ style }
                    title={ `${ x }, ${ y }` }
                    onMouseDown={ (event: ReactMouseEvent) =>
                    {
                        event.preventDefault();
                        setDrawing(true);
                        onDraw(x, y);
                    } }
                    onMouseEnter={ (event: ReactMouseEvent) =>
                    {
                        if(drawing && (event.buttons & 1)) onDraw(x, y);
                    } }>
                    { isRoot && <div style={ rootMarker } /> }
                </div>
            );
        }
    }

    return (
        <div style={ { position: 'relative', width, height, flexShrink: 0 } } onContextMenu={ event => event.preventDefault() }>
            { cells }
        </div>
    );
};

export const WiredNeighborhoodSelectorView: FC<{}> = () =>
{
    const { trigger = null, furniIds = [], setIntParams, setSourceTypes, setSelectorOptions } = useWired();
    const [ isUser, setIsUser ] = useState(false);
    const [ source, setSource ] = useState(SOURCE_TRIGGER);
    const [ root, setRoot ] = useState<NeighborhoodTile>({ x: 0, y: 0 });
    const [ tiles, setTiles ] = useState<Set<string>>(() => new Set());
    const [ drawMode, setDrawMode ] = useState<DrawMode>('add_tile');
    const [ bigMode, setBigMode ] = useState(false);
    const [ filterExisting, setFilterExisting ] = useState(false);
    const [ invert, setInvert ] = useState(false);
    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);

    useEffect(() =>
    {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    }, []);

    // InNeighborhood.onEditStart: [isUser, rootX, rootY, ...drawing], the source from the merged slot.
    useEffect(() =>
    {
        if(!trigger) return;

        const params = trigger.intData ?? [];
        const user = params[0] === 1;
        const drawn = decodeNeighborhood(params.slice(3));
        const sources = user ? trigger.userSourceTypes : trigger.furniSourceTypes;

        setIsUser(user);
        setSource(sources?.[0] ?? SOURCE_TRIGGER);
        setRoot({ x: params[1] ?? 0, y: params[2] ?? 0 });
        setTiles(new Set(drawn.map(tile => tileKey(tile.x, tile.y))));
        setBigMode(!neighborhoodFitsSmall(drawn));
        setDrawMode('add_tile');
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [ trigger ]);

    const tileList = useMemo(() => [ ...tiles ].map(key =>
    {
        const [ x, y ] = key.split(',').map(Number);

        return { x, y };
    }), [ tiles ]);
    const fitsSmall = neighborhoodFitsSmall(tileList);
    const radius = bigMode ? NEIGHBORHOOD_RADIUS : NEIGHBORHOOD_SMALL_RADIUS;
    const options = isUser ? availableUserSources : FURNI_SOURCES;

    useEffect(() =>
    {
        if(!options.some(option => option.value === source)) setSource(options[0]?.value ?? SOURCE_TRIGGER);
    }, [ options, source ]);

    const draw = useCallback((x: number, y: number) =>
    {
        if(drawMode === 'set_root_tile')
        {
            setRoot({ x, y });
            return;
        }

        setTiles(previous =>
        {
            const key = tileKey(x, y);
            const has = previous.has(key);

            if((drawMode === 'add_tile') === has) return previous;

            const next = new Set(previous);

            if(has) next.delete(key);
            else next.add(key);

            return next;
        });
    }, [ drawMode ]);

    const clampRoot = (value: number) => Math.max(-NEIGHBORHOOD_MAX_ROOT, Math.min(NEIGHBORHOOD_MAX_ROOT, isNaN(value) ? 0 : value));

    const save = useCallback(() =>
    {
        setIntParams([ isUser ? 1 : 0, root.x, root.y, ...encodeNeighborhood(tileList) ]);
        setSourceTypes({ furni: [ isUser ? SOURCE_TRIGGER : source ], users: [ isUser ? source : SOURCE_TRIGGER ] });
        setSelectorOptions({ filter: filterExisting, invert });
    }, [ filterExisting, invert, isUser, root, setIntParams, setSelectorOptions, setSourceTypes, source, tileList ]);

    const modeButton = (mode: DrawMode, icon: JSX.Element, titleKey: string, fallback: string) => (
        <Button
            className="px-2 py-1"
            variant={ drawMode === mode ? 'success' : 'secondary' }
            title={ localizeWithFallback(titleKey, fallback) }
            onClick={ () => setDrawMode(mode) }>
            { icon }
        </Button>
    );

    const picking = !isUser && source === SOURCE_PICKED;

    return (
        <WiredSelectorBaseView
            hasSpecialInput={ true }
            requiresFurni={ picking ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE }
            save={ save }
            hideDelay={ true }
            cardStyle={ { width: bigMode ? '420px' : '360px' } }>
            <div className="flex flex-col gap-2">
                <Text bold>{ LocalizeText('wiredfurni.params.neighborhood_selection') }</Text>

                <div className="flex items-center gap-1">
                    { modeButton('add_tile', <FaPlus />, 'wiredfurni.params.neighborhood.add', 'Add tiles') }
                    { modeButton('remove_tile', <FaMinus />, 'wiredfurni.params.neighborhood.remove', 'Remove tiles') }
                    { modeButton('set_root_tile', <FaCrosshairs />, 'wiredfurni.params.neighborhood.reference', 'Set the root tile') }
                    <Button
                        className="ms-auto px-2 py-1"
                        variant="secondary"
                        disabled={ !fitsSmall }
                        title={ localizeWithFallback(bigMode ? 'wiredfurni.params.neighborhood.reduce' : 'wiredfurni.params.neighborhood.enlarge', bigMode ? 'Smaller view' : 'Bigger view') }
                        onClick={ () => setBigMode(value => !value) }>
                        { bigMode ? <FaCompress /> : <FaExpand /> }
                    </Button>
                </div>

                <div className="flex justify-center">
                    <NeighborhoodFloor radius={ radius } tiles={ tiles } root={ root } onDraw={ draw } />
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Text small>x:</Text>
                    <NumberInput className="form-control form-control-sm" style={ { width: 56 } } min={ -NEIGHBORHOOD_MAX_ROOT } max={ NEIGHBORHOOD_MAX_ROOT } value={ root.x } onChange={ event => setRoot({ x: clampRoot(parseInt(event.target.value)), y: root.y }) } />
                    <Text small>y:</Text>
                    <NumberInput className="form-control form-control-sm" style={ { width: 56 } } min={ -NEIGHBORHOOD_MAX_ROOT } max={ NEIGHBORHOOD_MAX_ROOT } value={ root.y } onChange={ event => setRoot({ x: root.x, y: clampRoot(parseInt(event.target.value)) }) } />
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{ LocalizeText('wiredfurni.params.selector_options_selector') }</Text>
                <label className="flex items-center gap-1">
                    <Checkbox checked={ filterExisting } onCheckedChange={(nextChecked) => setFilterExisting(nextChecked)} />
                    <Text small>{ LocalizeText('wiredfurni.params.selector_option.0') }</Text>
                </label>
                <label className="flex items-center gap-1">
                    <Checkbox checked={ invert } onCheckedChange={(nextChecked) => setInvert(nextChecked)} />
                    <Text small>{ LocalizeText('wiredfurni.params.selector_option.1') }</Text>
                </label>

                <hr className="m-0 bg-dark" />

                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.neighborhood"
                    options={ options }
                    value={ source }
                    selectionKind={ isUser ? 'primary' : 'secondary' }
                    selectionActive={ picking }
                    selectionCount={ furniIds.length }
                    selectionLimit={ trigger?.maximumItemSelectionCount ?? 20 }
                    selectionEnabledValues={ [ SOURCE_PICKED ] }
                    showSelectionToggle={ false }
                    headerContent={
                        <div className="octane-wired__give-var-targets">
                            { SOURCE_GROUP_BUTTONS.map(button => (
                                <button
                                    key={ button.key }
                                    type="button"
                                    className={ `octane-wired__give-var-target octane-wired__give-var-target--${ button.key } ${ isUser === button.isUser ? 'is-active' : '' }` }
                                    onClick={ () => setIsUser(button.isUser) }>
                                    <img src={ button.icon } alt={ button.key } />
                                </button>
                            )) }
                        </div>
                    }
                    onChange={ value => setSource(value) } />
            </div>
        </WiredSelectorBaseView>
    );
};
