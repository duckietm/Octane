import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText } from '../../api';
import {
    CustomBadgeRecord,
    createCustomBadge,
    deleteCustomBadge,
    ensureCustomBadgeTexts,
    fetchCustomBadges,
    refreshCustomBadgeTexts,
    setCustomBadgeText,
    updateCustomBadge
} from '../../api/badges';
import { Button, Column, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useNotification } from '../../hooks';

const t = (key: string, fallback: string, params?: string[], replacements?: string[]): string => {
    try {
        const value = LocalizeText(key, params ?? null, replacements ?? null);
        if (value && value !== key) return value;
    } catch {}

    if (!params || !replacements) return fallback;
    let out = fallback;
    for (let i = 0; i < params.length; i++) {
        if (replacements[i] !== undefined) out = out.replace('%' + params[i] + '%', replacements[i]);
    }
    return out;
};

const GRID_WIDTH = 40;
const GRID_HEIGHT = 40;
const PIXEL_DISPLAY_SIZE = 12;
const TRANSPARENT = 0;

const PALETTE: number[] = [
    0xff000000,
    0xff4f4f4f,
    0xff808080,
    0xffb0b0b0,
    0xffd8d8d8,
    0xffffffff,
    TRANSPARENT,
    0xff7b0000,
    0xffbf0000,
    0xffff0000,
    0xffff7777,
    0xffff7700,
    0xffffaa00,
    0xffffd700,
    0xffffeb3b,
    0xff003e1f,
    0xff006837,
    0xff00a653,
    0xff2bc93c,
    0xff00c8a0,
    0xff00bcff,
    0xff2962ff,
    0xff1a237e,
    0xff4a0072,
    0xff9c00b5,
    0xffe91e63,
    0xffff80ab,
    0xff5d2e1a,
    0xff8b5a2b,
    0xffc28e5e,
    0xfff1d7b6,
    0xffe8c3a0
];

const currencyName = (type: number): string => {
    if (type === -1) return 'credits';
    if (type === 0) return 'duckets';
    if (type === 5) return 'diamonds';
    return `currency #${type}`;
};

type Tool = 'paint' | 'erase' | 'picker' | 'fill';

const floodFill = (grid: Uint32Array, w: number, h: number, startX: number, startY: number, replacement: number): Uint32Array => {
    if (startX < 0 || startY < 0 || startX >= w || startY >= h) return grid;
    const startIdx = startY * w + startX;
    const target = grid[startIdx];
    if (target === replacement) return grid;

    const next = new Uint32Array(grid.length);
    next.set(grid);

    const stack: number[] = [startIdx];
    while (stack.length) {
        const idx = stack.pop();
        if (next[idx] !== target) continue;
        next[idx] = replacement;
        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0) stack.push(idx - 1);
        if (x < w - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - w);
        if (y < h - 1) stack.push(idx + w);
    }
    return next;
};

const argbToCss = (argb: number): string => {
    if (argb === TRANSPARENT) return 'transparent';
    const a = ((argb >>> 24) & 0xff) / 255;
    const r = (argb >>> 16) & 0xff;
    const g = (argb >>> 8) & 0xff;
    const b = argb & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const argbToHex = (argb: number): string => {
    if (argb === TRANSPARENT) return '#000000';
    const r = (argb >>> 16) & 0xff;
    const g = (argb >>> 8) & 0xff;
    const b = argb & 0xff;
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
};

const hexToArgb = (hex: string): number => {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!match) return 0xff000000;
    return (0xff000000 | parseInt(match[1], 16)) >>> 0;
};

const emptyGrid = (): Uint32Array => new Uint32Array(GRID_WIDTH * GRID_HEIGHT);

const cloneGrid = (src: Uint32Array): Uint32Array => {
    const copy = new Uint32Array(src.length);
    copy.set(src);
    return copy;
};

const gridToPngBase64 = async (grid: Uint32Array): Promise<{ b64: string; bytes: number }> => {
    const canvas = document.createElement('canvas');
    canvas.width = GRID_WIDTH;
    canvas.height = GRID_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported.');

    const image = ctx.createImageData(GRID_WIDTH, GRID_HEIGHT);
    for (let i = 0; i < grid.length; i++) {
        const argb = grid[i];
        const o = i * 4;
        image.data[o] = (argb >>> 16) & 0xff;
        image.data[o + 1] = (argb >>> 8) & 0xff;
        image.data[o + 2] = argb & 0xff;
        image.data[o + 3] = (argb >>> 24) & 0xff;
    }
    ctx.putImageData(image, 0, 0);

    const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed.'))), 'image/png'));
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = arrayBuffer.byteLength;
    let binary = '';
    const u8 = new Uint8Array(arrayBuffer);
    for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
    return { b64: window.btoa(binary), bytes };
};

const loadGridFromUrl = (url: string): Promise<Uint32Array> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = GRID_WIDTH;
                canvas.height = GRID_HEIGHT;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas not supported.'));
                ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
                ctx.drawImage(image, 0, 0, GRID_WIDTH, GRID_HEIGHT);
                const data = ctx.getImageData(0, 0, GRID_WIDTH, GRID_HEIGHT).data;
                const grid = emptyGrid();
                for (let i = 0; i < grid.length; i++) {
                    const o = i * 4;
                    const a = data[o + 3];
                    if (a === 0) {
                        grid[i] = 0;
                        continue;
                    }
                    grid[i] = ((a & 0xff) << 24) | ((data[o] & 0xff) << 16) | ((data[o + 1] & 0xff) << 8) | (data[o + 2] & 0xff);
                }
                resolve(grid);
            } catch (err) {
                reject(err);
            }
        };
        image.onerror = () => reject(new Error('Could not load badge image (CORS?).'));
        image.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    });

export const BadgeCreatorView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [grid, setGrid] = useState<Uint32Array>(() => emptyGrid());
    const [selectedColor, setSelectedColor] = useState<number>(PALETTE[0]);
    const [tool, setTool] = useState<Tool>('paint');
    const [showGrid, setShowGrid] = useState(true);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
    const [badges, setBadges] = useState<CustomBadgeRecord[] | null>(null);
    const [pendingEditBadgeId, setPendingEditBadgeId] = useState<string | null>(null);
    const [maxBadges, setMaxBadges] = useState(5);
    const [maxBytes, setMaxBytes] = useState(40960);
    const [priceBadge, setPriceBadge] = useState(0);
    const [currencyType, setCurrencyType] = useState(-1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { showConfirm } = useNotification();

    const refresh = useCallback(async () => {
        try {
            const data = await fetchCustomBadges();
            setBadges(data.badges ?? []);
            if (typeof data.max === 'number') setMaxBadges(data.max);
            if (typeof data.maxBadgeSizeBytes === 'number') setMaxBytes(data.maxBadgeSizeBytes);
            if (typeof data.priceBadge === 'number') setPriceBadge(data.priceBadge);
            if (typeof data.currencyType === 'number') setCurrencyType(data.currencyType);
        } catch (err) {
            setBadges([]);
            setError((err as Error)?.message || 'Could not load badges.');
        }
    }, []);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;
                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((v) => !v);
                        return;
                    case 'edit':
                        if (!parts[2]) return;
                        setPendingEditBadgeId(parts[2]);
                        setIsVisible(true);
                        return;
                }
            },
            eventUrlPrefix: 'badge-creator/'
        };
        AddLinkEventTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useEffect(() => {
        if (isVisible) {
            refresh();
            ensureCustomBadgeTexts();
        }
    }, [isVisible, refresh]);

    const resetEditor = useCallback(() => {
        setGrid(emptyGrid());
        setName('');
        setDescription('');
        setEditingBadgeId(null);
        setError(null);
    }, []);

    const startEdit = useCallback(async (badge: CustomBadgeRecord) => {
        setError(null);
        setEditingBadgeId(badge.badgeId);
        setName(badge.name || '');
        setDescription(badge.description || '');
        try {
            const loaded = await loadGridFromUrl(badge.url);
            setGrid(loaded);
        } catch (err) {
            setError((err as Error)?.message || 'Could not load that badge.');
            setGrid(emptyGrid());
        }
    }, []);

    useEffect(() => {
        if (!pendingEditBadgeId || !badges) return;
        const target = badges.find((b) => b.badgeId === pendingEditBadgeId);
        if (!target) return;
        setPendingEditBadgeId(null);
        startEdit(target);
    }, [pendingEditBadgeId, badges, startEdit]);

    const paintAt = useCallback(
        (x: number, y: number, isClick: boolean) => {
            if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return;
            const idx = y * GRID_WIDTH + x;

            if (tool === 'picker') {
                const cell = grid[idx];
                if (cell !== TRANSPARENT) setSelectedColor(cell);
                setTool('paint');
                return;
            }

            if (tool === 'fill') {
                if (!isClick) return;
                setGrid(floodFill(grid, GRID_WIDTH, GRID_HEIGHT, x, y, selectedColor));
                return;
            }

            const value = tool === 'erase' ? TRANSPARENT : selectedColor;
            if (grid[idx] === value) return;
            const next = cloneGrid(grid);
            next[idx] = value;
            setGrid(next);
        },
        [grid, selectedColor, tool]
    );

    const isDraggingRef = useRef(false);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const targets = [mainCanvasRef.current, previewCanvasRef.current];
        for (const canvas of targets) {
            if (!canvas) continue;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            const image = ctx.createImageData(GRID_WIDTH, GRID_HEIGHT);
            const buffer = image.data;
            for (let i = 0; i < grid.length; i++) {
                const v = grid[i];
                const o = i * 4;
                buffer[o] = (v >>> 16) & 0xff;
                buffer[o + 1] = (v >>> 8) & 0xff;
                buffer[o + 2] = v & 0xff;
                buffer[o + 3] = (v >>> 24) & 0xff;
            }
            ctx.putImageData(image, 0, 0);
        }
    }, [grid, isVisible]);

    const openColorPicker = useCallback(() => {
        const input = colorInputRef.current;
        if (!input) return;
        input.value = argbToHex(selectedColor);
        input.click();
    }, [selectedColor]);

    const handleColorPicked = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedColor(hexToArgb(event.target.value));
        setTool('paint');
    }, []);

    const cellFromEvent = useCallback((event: ReactMouseEvent<HTMLDivElement>): { x: number; y: number } => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_WIDTH);
        const y = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_HEIGHT);
        return { x, y };
    }, []);

    const handleMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            if (event.button !== 0) return;
            event.preventDefault();
            isDraggingRef.current = true;
            const { x, y } = cellFromEvent(event);
            paintAt(x, y, true);
        },
        [cellFromEvent, paintAt]
    );

    const handleMouseMove = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            if (!isDraggingRef.current) return;
            const { x, y } = cellFromEvent(event);
            paintAt(x, y, false);
        },
        [cellFromEvent, paintAt]
    );

    useEffect(() => {
        const stopDrag = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('mouseup', stopDrag);
        return () => window.removeEventListener('mouseup', stopDrag);
    }, []);

    const clearCanvas = useCallback(() => setGrid(emptyGrid()), []);

    const copyColor = useCallback(() => setTool('picker'), []);

    const isEmpty = useMemo(() => {
        for (let i = 0; i < grid.length; i++) if (grid[i] !== 0) return false;
        return true;
    }, [grid]);

    const canCreateMore = (badges?.length ?? 0) < maxBadges;

    const handleSave = useCallback(async () => {
        if (submitting) return;
        if (isEmpty) {
            setError(t('badgecreator.error.empty', 'Draw something first.'));
            return;
        }
        if (!editingBadgeId && !canCreateMore) {
            setError(t('badgecreator.error.limit', 'You already have %max% custom badges.', ['max'], [String(maxBadges)]));
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const { b64, bytes } = await gridToPngBase64(grid);
            if (bytes > maxBytes) {
                setError(t('badgecreator.error.too_large', `Image is too large (${bytes} / %max% bytes).`, ['max'], [String(maxBytes)]));
                return;
            }
            const body = { name: name.trim(), description: description.trim(), image: b64 };
            const saved = editingBadgeId ? await updateCustomBadge(editingBadgeId, body) : await createCustomBadge(body);
            if (saved && saved.badgeId) setCustomBadgeText(saved.badgeId, saved.name, saved.description);
            await refresh();
            refreshCustomBadgeTexts();
            resetEditor();
        } catch (err) {
            setError((err as Error)?.message || 'Could not save the badge.');
        } finally {
            setSubmitting(false);
        }
    }, [submitting, isEmpty, editingBadgeId, canCreateMore, maxBadges, grid, maxBytes, name, description, refresh, resetEditor]);

    const handleDelete = useCallback(
        (badge: CustomBadgeRecord) => {
            showConfirm(
                t('badgecreator.delete.confirm', 'Delete "%name%"?', ['name'], [badge.name || badge.badgeId]),
                async () => {
                    try {
                        await deleteCustomBadge(badge.badgeId);
                        if (editingBadgeId === badge.badgeId) resetEditor();
                        await refresh();
                        refreshCustomBadgeTexts();
                    } catch (err) {
                        setError((err as Error)?.message || 'Could not delete the badge.');
                    }
                },
                null,
                null,
                null,
                t('badgecreator.delete.title', 'Delete badge')
            );
        },
        [showConfirm, editingBadgeId, refresh, resetEditor]
    );

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-badge-creator w-[760px] h-[680px]" isResizable={false} theme="primary-slim" uniqueKey="badge-creator">
            <OctaneCardHeaderView headerText={t('badgecreator.title', 'Badge Creator')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView className="text-black">
                <Flex gap={2} className="badge-creator-main">
                    <Column gap={2}>
                        <div
                            className="badge-creator-canvas"
                            style={{
                                width: GRID_WIDTH * PIXEL_DISPLAY_SIZE,
                                height: GRID_HEIGHT * PIXEL_DISPLAY_SIZE,
                                backgroundColor: '#ffffff',
                                backgroundImage: showGrid
                                    ? 'linear-gradient(to right, rgba(0,0,0,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.18) 1px, transparent 1px)'
                                    : 'none',
                                backgroundSize: `${PIXEL_DISPLAY_SIZE}px ${PIXEL_DISPLAY_SIZE}px`,
                                backgroundPosition: '0 0',
                                border: '1px solid #888',
                                boxSizing: 'content-box',
                                imageRendering: 'pixelated',
                                cursor: tool === 'picker' ? 'crosshair' : tool === 'erase' ? 'cell' : 'crosshair',
                                position: 'relative',
                                userSelect: 'none'
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                        >
                            <canvas
                                ref={mainCanvasRef}
                                width={GRID_WIDTH}
                                height={GRID_HEIGHT}
                                style={{
                                    display: 'block',
                                    width: GRID_WIDTH * PIXEL_DISPLAY_SIZE,
                                    height: GRID_HEIGHT * PIXEL_DISPLAY_SIZE,
                                    imageRendering: 'pixelated',
                                    pointerEvents: 'none'
                                }}
                            />
                        </div>
                        <Flex gap={1} className="badge-creator-tools">
                            <Button onClick={() => setTool('paint')} variant={tool === 'paint' ? 'success' : 'primary'}>
                                {t('badgecreator.tool.paint', 'Paint')}
                            </Button>
                            <Button onClick={() => setTool('fill')} variant={tool === 'fill' ? 'success' : 'primary'}>
                                {t('badgecreator.tool.fill', 'Fill')}
                            </Button>
                            <Button onClick={() => setTool('erase')} variant={tool === 'erase' ? 'success' : 'primary'}>
                                {t('badgecreator.tool.erase', 'Erase')}
                            </Button>
                            <Button onClick={copyColor} variant={tool === 'picker' ? 'success' : 'primary'}>
                                {t('badgecreator.tool.picker', 'Pick')}
                            </Button>
                            <Button onClick={clearCanvas} variant="danger">
                                {t('badgecreator.tool.clear', 'Clear')}
                            </Button>
                            <Button onClick={() => setShowGrid((g) => !g)} variant="primary">
                                {showGrid ? t('badgecreator.tool.gridoff', 'Grid off') : t('badgecreator.tool.gridon', 'Grid on')}
                            </Button>
                        </Flex>
                    </Column>
                    <Column gap={2} className="badge-creator-side" style={{ minWidth: 220 }}>
                        <div>
                            <Text bold variant="black">
                                {t('badgecreator.palette', 'Palette')}
                            </Text>
                            <div className="badge-creator-palette" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 22px)', gap: 4, marginTop: 4 }}>
                                {PALETTE.map((color, idx) => {
                                    const isTransparent = color === TRANSPARENT;
                                    const isSelected = color === selectedColor;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setSelectedColor(color);
                                                setTool('paint');
                                            }}
                                            title={isTransparent ? 'Transparent' : argbToCss(color)}
                                            style={{
                                                width: 22,
                                                height: 22,
                                                border: isSelected ? '2px solid #000' : '1px solid #888',
                                                background: isTransparent
                                                    ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px'
                                                    : argbToCss(color),
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                <button
                                    type="button"
                                    onClick={openColorPicker}
                                    title={t('badgecreator.color.custom', 'Pick a custom colour')}
                                    style={{
                                        width: 28,
                                        height: 26,
                                        padding: 2,
                                        border: '1px solid #888',
                                        background: '#f3f3f3',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M4.5 14.5 12 7l5 5-7.5 7.5a2 2 0 0 1-2.83 0l-2.17-2.17a2 2 0 0 1 0-2.83Z"
                                            fill="#d3d3d3"
                                            stroke="#222"
                                            strokeWidth="1.4"
                                            strokeLinejoin="round"
                                        />
                                        <path d="m12 7-2-2 2-2 2 2" stroke="#222" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        <path
                                            d="M18 14c0 1.5 1.4 2.5 1.4 4a1.4 1.4 0 1 1-2.8 0c0-1.5 1.4-2.5 1.4-4Z"
                                            fill="#ffb74d"
                                            stroke="#222"
                                            strokeWidth="1.2"
                                        />
                                    </svg>
                                </button>
                                <div
                                    onClick={openColorPicker}
                                    title={argbToHex(selectedColor)}
                                    style={{
                                        width: 26,
                                        height: 26,
                                        border: '1px solid #888',
                                        background:
                                            selectedColor === TRANSPARENT
                                                ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px'
                                                : argbToCss(selectedColor),
                                        cursor: 'pointer'
                                    }}
                                />
                                <Text small variant="muted">
                                    {argbToHex(selectedColor).toUpperCase()}
                                </Text>
                                <input
                                    ref={colorInputRef}
                                    type="color"
                                    onChange={handleColorPicked}
                                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                                />
                            </div>
                        </div>
                        <div>
                            <Text bold variant="black">
                                {t('badgecreator.preview', 'Preview')}
                            </Text>
                            <div
                                style={{
                                    width: GRID_WIDTH,
                                    height: GRID_HEIGHT,
                                    marginTop: 4,
                                    border: '1px solid #888',
                                    imageRendering: 'pixelated',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <canvas
                                    ref={previewCanvasRef}
                                    width={GRID_WIDTH}
                                    height={GRID_HEIGHT}
                                    style={{ display: 'block', width: GRID_WIDTH, height: GRID_HEIGHT, imageRendering: 'pixelated' }}
                                />
                            </div>
                        </div>
                        <div>
                            <Text variant="black">{t('badgecreator.name', 'Name')}</Text>
                            <input className="form-control form-control-sm" maxLength={64} value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                            <Text variant="black">{t('badgecreator.description', 'Description')}</Text>
                            <input
                                className="form-control form-control-sm"
                                maxLength={255}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        {error && <Text variant="danger">{error}</Text>}
                        {!editingBadgeId && priceBadge > 0 && (
                            <Text small variant="muted">
                                {t('badgecreator.price', 'Cost: %price% %currency%', ['price', 'currency'], [String(priceBadge), currencyName(currencyType)])}
                            </Text>
                        )}
                        <Flex gap={1}>
                            <Button onClick={handleSave} disabled={submitting} variant="success">
                                {submitting
                                    ? t('badgecreator.saving', 'Saving…')
                                    : editingBadgeId
                                      ? t('badgecreator.save.edit', 'Save changes')
                                      : priceBadge > 0
                                        ? t(
                                              'badgecreator.save.create.priced',
                                              'Create badge (%price% %currency%)',
                                              ['price', 'currency'],
                                              [String(priceBadge), currencyName(currencyType)]
                                          )
                                        : t('badgecreator.save.create', 'Create badge')}
                            </Button>
                            {editingBadgeId && (
                                <Button onClick={resetEditor} variant="primary">
                                    {t('generic.cancel', 'Cancel')}
                                </Button>
                            )}
                        </Flex>
                    </Column>
                </Flex>
                <Column gap={1} className="badge-creator-list" style={{ marginTop: 8 }}>
                    <Text bold variant="black">
                        {t('badgecreator.list.title', 'Your custom badges (%count%/%max%)', ['count', 'max'], [String(badges?.length ?? 0), String(maxBadges)])}
                    </Text>
                    {badges === null && <Text variant="black">{t('badgecreator.list.loading', 'Loading…')}</Text>}
                    {badges !== null && !badges.length && <Text variant="black">{t('badgecreator.list.empty', "You haven't made any badges yet.")}</Text>}
                    {badges !== null &&
                        badges.map((badge) => (
                            <Flex key={badge.badgeId} alignItems="center" gap={2} style={{ padding: 4, borderTop: '1px solid #ccc' }}>
                                <img
                                    src={badge.url}
                                    alt={badge.name || badge.badgeId}
                                    width={GRID_WIDTH}
                                    height={GRID_HEIGHT}
                                    style={{ imageRendering: 'pixelated', border: '1px solid #888' }}
                                />
                                <Column gap={0} style={{ flex: 1, minWidth: 0 }}>
                                    <Text bold variant="black" truncate>
                                        {badge.name || badge.badgeId}
                                    </Text>
                                    {badge.description && (
                                        <Text small variant="muted" truncate>
                                            {badge.description}
                                        </Text>
                                    )}
                                </Column>
                                <Button onClick={() => startEdit(badge)} variant="primary">
                                    {t('generic.edit', 'Edit')}
                                </Button>
                                <Button onClick={() => handleDelete(badge)} variant="danger">
                                    {t('generic.delete', 'Delete')}
                                </Button>
                            </Flex>
                        ))}
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
