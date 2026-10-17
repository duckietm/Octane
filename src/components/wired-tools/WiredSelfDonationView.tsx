import { FurnitureType, GetSessionDataManager, IFurnitureData, SelfDonationMessageComposer, SelfDonationResultMessageEvent } from '@octane/renderer';
import { useMemo, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useMessageEvent, useNotification } from '../../hooks';
import { NumberInput } from '../../common/NumberInput';

/** The official tool's range; the server clamps to its own `hotel.selfdonation.max.amount`. */
const DEFAULT_MAX_AMOUNT = 500;
/** Rows shown for a search; a narrower search shows the rest. */
const MAX_RESULTS = 60;

/** The official result codes of `SelfDonationResult`. */
const RESULT_SUCCESS = 0;
const RESULT_NOT_ALLOWED = 1;

export interface WiredSelfDonationViewProps {
    onClose: () => void;
}

export interface SelfDonationCandidate {
    id: number;
    className: string;
    name: string;
    isWallItem: boolean;
}

/** The furni types matching a search, floor and wall alike, by name or classname. */
export const searchFurnitureTypes = (all: IFurnitureData[], query: string, limit: number = MAX_RESULTS): SelfDonationCandidate[] => {
    const needle = query.trim().toLowerCase();
    const results: SelfDonationCandidate[] = [];

    for (const data of all) {
        if (!data || !data.className) continue;

        const name = data.name || data.className;

        if (needle && !name.toLowerCase().includes(needle) && !data.className.toLowerCase().includes(needle)) continue;

        results.push({ id: data.id, className: data.className, name, isWallItem: data.type === FurnitureType.WALL });

        if (results.length >= limit) break;
    }

    return results;
};

/**
 * The sandbox self-donation tool: an amount, a furni type picked from a search, and "Donate",
 * which asks the server for that many of the furni. The answer comes back as an alert; the
 * server decides who may use it.
 */
export const WiredSelfDonationView = ({ onClose }: WiredSelfDonationViewProps) => {
    const { simpleAlert = null } = useNotification();
    const maxAmount = Math.max(1, GetConfigurationValue<number>('wired.selfdonation.max.amount', DEFAULT_MAX_AMOUNT));
    const [amount, setAmount] = useState(1);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<SelfDonationCandidate | null>(null);
    const allFurniture = useMemo(() => GetSessionDataManager().getAllFurnitureData() ?? [], []);
    const results = useMemo(() => searchFurnitureTypes(allFurniture, query), [allFurniture, query]);

    useMessageEvent<SelfDonationResultMessageEvent>(SelfDonationResultMessageEvent, (event) => {
        const code = event.getParser()?.resultCode;

        if (!simpleAlert) return;

        if (code === RESULT_SUCCESS) {
            simpleAlert(localizeWithFallback('selfdonation.result.success', 'The furni is in your inventory.'), NotificationAlertType.DEFAULT);
        } else if (code === RESULT_NOT_ALLOWED) {
            simpleAlert(localizeWithFallback('selfdonation.result.not_allowed', 'You are not allowed to use the sandbox donation tool.'), NotificationAlertType.DEFAULT);
        } else {
            simpleAlert(localizeWithFallback('selfdonation.result.failed', 'The donation failed.'), NotificationAlertType.DEFAULT);
        }
    });

    const clampedAmount = Math.min(maxAmount, Math.max(1, amount));

    const donate = () => {
        if (!selected) return;

        SendMessageComposer(new SelfDonationMessageComposer(selected.isWallItem, selected.id, '', clampedAmount));
    };

    return (
        <OctaneCardView
            className="min-w-[420px] max-w-[420px] max-h-[560px]"
            theme="primary-slim"
            uniqueKey="wired-self-donation"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
            offsetLeft={560}
            offsetTop={80}
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('selfdonation.title', 'Sandbox donation tool')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3" overflow="hidden">
                <label className="flex items-center gap-2 text-[12px]">
                    <Text bold>{localizeWithFallback('selfdonation.amount', 'Amount')}:</Text>
                    <NumberInput aria-label="Amount" className="w-[80px] rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]" min={1} max={maxAmount} value={amount} onChange={(event) => setAmount(Number.parseInt(event.target.value, 10) || 1)} onBlur={() => setAmount(clampedAmount)} />
                    <Text small>{localizeWithFallback('selfdonation.amount.range', '1 to %max%', ['max'], [String(maxAmount)])}</Text>
                </label>
                <label className="flex items-center gap-2 text-[12px]">
                    <Text bold>{localizeWithFallback('selfdonation.search', 'Furni')}:</Text>
                    <input
                        aria-label="Search furni"
                        className="grow rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                        type="text"
                        value={query}
                        placeholder={localizeWithFallback('selfdonation.search.placeholder', 'Name or classname')}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </label>
                <div className="h-[300px] overflow-y-auto border border-[#d1ccbf] rounded bg-white" data-testid="self-donation-results">
                    <table className="w-full text-[12px] table-fixed">
                        <thead className="bg-[#efede5] sticky top-0">
                            <tr>
                                <th className="text-left px-2 py-1 w-[60px]">{localizeWithFallback('selfdonation.col.type', 'Type')}</th>
                                <th className="text-left px-2 py-1">{localizeWithFallback('selfdonation.col.name', 'Name')}</th>
                                <th className="text-left px-2 py-1 w-[150px]">{localizeWithFallback('selfdonation.col.classname', 'Classname')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!results.length && (
                                <tr>
                                    <td className="px-2 py-3 text-center text-[#8b8678]" colSpan={3}>
                                        {localizeWithFallback('selfdonation.empty', 'No furni matches the search')}
                                    </td>
                                </tr>
                            )}
                            {results.map((candidate) => {
                                const isSelected = selected?.id === candidate.id && selected?.isWallItem === candidate.isWallItem;

                                return (
                                    <tr
                                        key={`${candidate.isWallItem ? 'w' : 'f'}-${candidate.id}`}
                                        className={`cursor-pointer ${isSelected ? 'bg-[#dbeaf4]' : 'hover:bg-[#f8f6f0]'}`}
                                        aria-selected={isSelected}
                                        onClick={() => setSelected(candidate)}
                                    >
                                        <td className="px-2 py-1">{candidate.isWallItem ? 'Wall' : 'Floor'}</td>
                                        <td className="px-2 py-1 truncate" title={candidate.name}>
                                            {candidate.name}
                                        </td>
                                        <td className="px-2 py-1 truncate" title={candidate.className}>
                                            {candidate.className}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <Text small>
                        {selected
                            ? localizeWithFallback('selfdonation.selected', 'Selected: %name%', ['name'], [selected.name])
                            : localizeWithFallback('selfdonation.none_selected', 'Pick a furni from the list')}
                    </Text>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>
                            {localizeWithFallback('generic.cancel', 'Cancel')}
                        </Button>
                        <Button disabled={!selected} onClick={donate}>
                            {localizeWithFallback('selfdonation.donate', 'Donate')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
