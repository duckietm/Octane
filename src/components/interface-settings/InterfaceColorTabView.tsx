import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RgbaColor, RgbaColorPicker } from 'react-colorful';
import { FaDownload, FaTrash, FaUndo, FaUpload } from 'react-icons/fa';
import { LocalizeText, PRESET_COLORS, THEME_PRESETS, useUiSettings } from '../../api';
import { Flex, Text } from '../../common';
import { NumberInput } from '../../common/NumberInput';
import { BaseButton } from '../../common/BaseButton';

const hexToRgba = (hex: string, a = 1): RgbaColor => {
    const num = parseInt(hex.replace('#', ''), 16);
    return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff, a };
};

const rgbaToHex = (rgba: RgbaColor): string => {
    return '#' + ((1 << 24) + (rgba.r << 16) + (rgba.g << 8) + rgba.b).toString(16).slice(1);
};

export const InterfaceColorTabView: FC<{}> = () => {
    const { settings, updateSettings, resetSettings } = useUiSettings();
    const [color, setColor] = useState<RgbaColor>(() => hexToRgba(settings.headerColor, settings.headerAlpha / 100));
    const [importValue, setImportValue] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const previewTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const hexColor = useMemo(() => rgbaToHex(color), [color]);
    const alphaPercent = useMemo(() => Math.round((color.a ?? 1) * 100), [color]);

    // Live preview con debounce
    useEffect(() => {
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

        previewTimerRef.current = setTimeout(() => {
            updateSettings({
                colorMode: 'color',
                headerColor: hexColor,
                headerAlpha: alphaPercent
            });
        }, 50);

        return () => {
            if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        };
    }, [hexColor, alphaPercent]);

    const onHexInput = useCallback(
        (value: string) => {
            const clean = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
            if (clean.length === 6) {
                const rgba = hexToRgba('#' + clean, color.a);
                setColor(rgba);
            }
        },
        [color.a]
    );

    const onRgbInput = useCallback((channel: 'r' | 'g' | 'b', value: number) => {
        const clamped = Math.max(0, Math.min(255, value || 0));
        setColor((prev) => ({ ...prev, [channel]: clamped }));
    }, []);

    const onAlphaInput = useCallback((value: number) => {
        const clamped = Math.max(0, Math.min(100, value || 0));
        setColor((prev) => ({ ...prev, a: clamped / 100 }));
    }, []);

    const onPresetClick = useCallback(
        (presetHex: string) => {
            setColor(hexToRgba(presetHex, color.a));
        },
        [color.a]
    );

    const onThemeClick = useCallback((themeColor: string, themeAlpha: number) => {
        setColor(hexToRgba(themeColor, themeAlpha / 100));
    }, []);

    const onReset = useCallback(() => {
        resetSettings();
        setColor(hexToRgba('#418db0', 1));
    }, [resetSettings]);

    const onDelete = useCallback(() => {
        updateSettings({ colorMode: 'default' });
        setColor(hexToRgba('#418db0', 1));
    }, [updateSettings]);

    const onExport = useCallback(() => {
        const data = JSON.stringify({
            color: hexColor,
            alpha: alphaPercent,
            mode: settings.colorMode,
            image: settings.headerImageUrl
        });

        navigator.clipboard.writeText(data);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    }, [hexColor, alphaPercent, settings]);

    const onImport = useCallback(() => {
        try {
            const data = JSON.parse(importValue);

            if (data.color) {
                const alpha = data.alpha ?? 100;
                setColor(hexToRgba(data.color, alpha / 100));
                updateSettings({
                    colorMode: data.mode || 'color',
                    headerColor: data.color,
                    headerAlpha: alpha,
                    headerImageUrl: data.image || ''
                });
            }

            setImportValue('');
            setShowImport(false);
        } catch (e) {}
    }, [importValue, updateSettings]);

    return (
        <Flex column gap={2} className="items-center p-2">
            {/* Color picker */}
            <div className="w-[280px]">
                <RgbaColorPicker color={color} onChange={setColor} style={{ width: '100%', height: '180px' }} />
            </div>

            {/* Color preview swatch */}
            <div
                className="w-[280px] h-[32px] rounded border border-black/20"
                style={{ backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})` }}
            />

            {/* Hex/RGB/A inputs */}
            <Flex gap={1} className="items-center mt-1">
                <Flex column className="items-center">
                    <input
                        className="form-control form-control-sm text-center w-[70px]"
                        value={hexColor.replace('#', '').toUpperCase()}
                        onChange={(e) => onHexInput(e.target.value)}
                        maxLength={6}
                    />
                    <Text small className="text-black">
                        Hex
                    </Text>
                </Flex>
                <Flex column className="items-center">
                    <NumberInput className="form-control form-control-sm text-center w-[45px]" value={color.r} onChange={(e) => onRgbInput('r', parseInt(e.target.value))} min={0} max={255} />
                    <Text small className="text-black">
                        R
                    </Text>
                </Flex>
                <Flex column className="items-center">
                    <NumberInput className="form-control form-control-sm text-center w-[45px]" value={color.g} onChange={(e) => onRgbInput('g', parseInt(e.target.value))} min={0} max={255} />
                    <Text small className="text-black">
                        G
                    </Text>
                </Flex>
                <Flex column className="items-center">
                    <NumberInput className="form-control form-control-sm text-center w-[45px]" value={color.b} onChange={(e) => onRgbInput('b', parseInt(e.target.value))} min={0} max={255} />
                    <Text small className="text-black">
                        B
                    </Text>
                </Flex>
                <Flex column className="items-center">
                    <NumberInput className="form-control form-control-sm text-center w-[45px]" value={alphaPercent} onChange={(e) => onAlphaInput(parseInt(e.target.value))} min={0} max={100} />
                    <Text small className="text-black">
                        A
                    </Text>
                </Flex>
            </Flex>

            {/* Preset colors */}
            <div className="grid grid-cols-10 gap-0.5 mt-1">
                {PRESET_COLORS.map((presetHex, i) => (
                    <BaseButton
                        aria-label={presetHex}
                        key={i}
                        className={`w-[24px] h-[24px] rounded cursor-pointer border hover:scale-110 transition-transform ${hexColor.toUpperCase() === presetHex.toUpperCase() ? 'border-white border-2 scale-110' : 'border-black/20'}`}
                        style={{ backgroundColor: presetHex }}
                        onClick={() => onPresetClick(presetHex)}
                    />
                ))}
            </div>

            {/* Theme presets */}
            <Text small bold className="text-black mt-2">
                {LocalizeText('interface.settings.color.themes')}
            </Text>
            <div className="grid grid-cols-6 gap-1 w-full">
                {THEME_PRESETS.map((theme) => (
                    <BaseButton
                        key={theme.name}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded cursor-pointer hover:bg-black/5 transition-colors ${hexColor.toUpperCase() === theme.color.toUpperCase() ? 'ring-2 ring-white' : ''}`}
                        onClick={() => onThemeClick(theme.color, theme.alpha)}
                    >
                        <div
                            className="w-[32px] h-[32px] rounded-full border border-black/20"
                            style={{ backgroundColor: theme.color, opacity: theme.alpha / 100 }}
                        />
                        <Text small className="text-black text-[10px]">
                            {LocalizeText(`interface.settings.theme.${theme.name}`)}
                        </Text>
                    </BaseButton>
                ))}
            </div>

            {/* Action buttons */}
            <Flex gap={1} className="w-full mt-2">
                <BaseButton
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded cursor-pointer text-white text-xs"
                    style={{ backgroundColor: '#5f9ea0' }}
                    onClick={onReset}
                    title={LocalizeText('interface.settings.color.reset')}
                >
                    <FaUndo size={12} />
                    {LocalizeText('interface.settings.color.reset')}
                </BaseButton>
                <BaseButton
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded cursor-pointer text-white text-xs"
                    style={{ backgroundColor: '#c0392b' }}
                    onClick={onDelete}
                    title={LocalizeText('interface.settings.color.remove')}
                >
                    <FaTrash size={12} />
                    {LocalizeText('interface.settings.color.remove')}
                </BaseButton>
                <BaseButton
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded cursor-pointer text-white text-xs"
                    style={{ backgroundColor: '#2980b9' }}
                    onClick={onExport}
                    title={LocalizeText('interface.settings.color.export')}
                >
                    <FaDownload size={12} />
                    {copyFeedback ? LocalizeText('interface.settings.color.copied') : LocalizeText('interface.settings.color.export')}
                </BaseButton>
                <BaseButton
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded cursor-pointer text-white text-xs"
                    style={{ backgroundColor: '#27ae60' }}
                    onClick={() => setShowImport(!showImport)}
                    title={LocalizeText('interface.settings.color.import')}
                >
                    <FaUpload size={12} />
                    {LocalizeText('interface.settings.color.import')}
                </BaseButton>
            </Flex>

            {/* Import panel */}
            {showImport && (
                <Flex gap={1} className="w-full">
                    <input
                        className="form-control form-control-sm flex-1"
                        placeholder={LocalizeText('interface.settings.color.import.placeholder')}
                        value={importValue}
                        onChange={(e) => setImportValue(e.target.value)}
                    />
                    <BaseButton className="px-3 py-1 rounded cursor-pointer text-white text-xs" style={{ backgroundColor: '#27ae60' }} onClick={onImport}>
                        OK
                    </BaseButton>
                </Flex>
            )}
        </Flex>
    );
};
