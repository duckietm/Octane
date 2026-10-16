import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WiredSelectionVisualizer  } from '../../../../api';
import { Text } from '../../../../common';
import { useNotification, useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, USER_SOURCES } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;


type SelectionMode = 'antenna' | 'furni';

const parseForwardIds = (data: string): number[] =>
{
    if(!data || !data.length) return [];

    const ids = new Set<number>();

    for(const part of data.split(/[;,\t]/))
    {
        const trimmed = part.trim();
        if(!trimmed.length) continue;

        const value = parseInt(trimmed, 10);
        if(!isNaN(value) && value > 0) ids.add(value);
    }

    return Array.from(ids);
};

export const WiredActionSendSignalView: FC<{}> = () =>
{
    const [ furniSource, setFurniSource ] = useState<number>(SOURCE_TRIGGER);
    const [ userSource, setUserSource ] = useState<number>(SOURCE_TRIGGER);
    const [ signalPerFurni, setSignalPerFurni ] = useState(false);
    const [ signalPerUser, setSignalPerUser ] = useState(false);
    const [ antennaIds, setAntennaIds ] = useState<number[]>([]);
    const [ forwardFurniIds, setForwardFurniIds ] = useState<number[]>([]);
    const [ selectionMode, setSelectionMode ] = useState<SelectionMode>('antenna');
    const highlightedIds = useRef<number[]>([]);

    const { trigger = null, furniIds = [], setFurniIds = null, setFurniIds2 = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const { showConfirm = null } = useNotification();

    useEffect(() =>
    {
        if(!trigger) return;

        // Official: [split per furni, split per user]. Furni source slot 0 is the antennas, slot 1 the
        // furni to forward (100 = the second picks, stuffIds2); user slot 0 the users to forward.
        const p = trigger.intData ?? [];

        setFurniSource(trigger.furniSourceTypes?.[1] ?? SOURCE_TRIGGER);
        setUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);
        setSignalPerFurni(p[0] === 1);
        setSignalPerUser(p[1] === 1);

        setAntennaIds(trigger.selectedItems ?? []);
        setForwardFurniIds(trigger.selectedItems2?.length ? [ ...trigger.selectedItems2 ] : parseForwardIds(trigger.stringData));
        setSelectionMode('antenna');
    }, [ trigger ]);

    useEffect(() =>
    {
        if(selectionMode === 'antenna') setAntennaIds(furniIds);
        else setForwardFurniIds(furniIds);
    }, [ furniIds, selectionMode ]);

    const syncHighlights = useCallback((nextAntennaIds: number[], nextForwardFurniIds: number[], nextSelectionMode: SelectionMode, nextFurniSource: number) =>
    {
        if(highlightedIds.current.length)
        {
            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
        }

        const visibleForwardIds = (nextFurniSource === SOURCE_SELECTED) ? nextForwardFurniIds : [];
        const activeIds = (nextSelectionMode === 'antenna') ? nextAntennaIds : visibleForwardIds;
        const passiveIds = (nextSelectionMode === 'antenna') ? visibleForwardIds : nextAntennaIds;
        const activeSet = new Set(activeIds);
        const passiveOnlyIds = passiveIds.filter(id => !activeSet.has(id));

        if(activeIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(activeIds);
        if(passiveOnlyIds.length) WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(passiveOnlyIds);

        highlightedIds.current = Array.from(new Set([ ...activeIds, ...passiveOnlyIds ]));
    }, []);

    useEffect(() =>
    {
        syncHighlights(antennaIds, forwardFurniIds, selectionMode, furniSource);
    }, [ antennaIds, forwardFurniIds, selectionMode, furniSource, syncHighlights ]);

    const switchSelection = useCallback((mode: SelectionMode) =>
    {
        if(mode === selectionMode) return;
        if(mode === 'furni' && furniSource !== SOURCE_SELECTED) return;

        const nextAntennaIds = (selectionMode === 'antenna') ? [ ...furniIds ] : [ ...antennaIds ];
        const nextForwardFurniIds = (selectionMode === 'furni') ? [ ...furniIds ] : [ ...forwardFurniIds ];

        setAntennaIds(nextAntennaIds);
        setForwardFurniIds(nextForwardFurniIds);
        setSelectionMode(mode);
        if(setFurniIds) setFurniIds([ ...((mode === 'antenna') ? nextAntennaIds : nextForwardFurniIds) ]);
    }, [ selectionMode, furniSource, furniIds, antennaIds, forwardFurniIds, setFurniIds ]);

    const onChangeFurniSource = (next: number) =>
    {
        const nextAntennaIds = (selectionMode === 'antenna') ? [ ...furniIds ] : [ ...antennaIds ];

        setAntennaIds(nextAntennaIds);
        if(forwardFurniIds.length || selectionMode === 'furni')
        {
            setForwardFurniIds([]);
        }

        if(selectionMode === 'furni')
        {
            if(setFurniIds) setFurniIds([ ...nextAntennaIds ]);
            setSelectionMode('antenna');
        }

        setFurniSource(next);
    };

    const save = useCallback(() =>
    {
        const nextAntennaIds = (selectionMode === 'antenna') ? [ ...furniIds ] : [ ...antennaIds ];
        const nextForwardFurniIds = (selectionMode === 'furni') ? [ ...furniIds ] : [ ...forwardFurniIds ];

        setAntennaIds(nextAntennaIds);
        setForwardFurniIds(nextForwardFurniIds);

        if(selectionMode === 'furni')
        {
            setSelectionMode('antenna');
            if(setFurniIds) setFurniIds([ ...nextAntennaIds ]);
        }

        setIntParams([ signalPerFurni ? 1 : 0, signalPerUser ? 1 : 0 ]);
        setStringParam('');
        setSourceTypes({ furni: [ SOURCE_SELECTED, furniSource ], users: [ userSource ] });
        setFurniIds2((furniSource === SOURCE_SELECTED) ? nextForwardFurniIds.filter(id => (id > 0)) : []);
    }, [ selectionMode, furniIds, antennaIds, furniSource, userSource, signalPerFurni, signalPerUser, forwardFurniIds, setFurniIds, setFurniIds2, setIntParams, setStringParam, setSourceTypes ]);

    // Official: checking a split option first asks to confirm; cancelling leaves it unchecked.
    const confirmSplit = (checked: boolean, apply: (value: boolean) => void) =>
    {
        if(!checked || !showConfirm) return apply(checked);

        showConfirm(
            localizeWithFallback('wiredfurni.params.signal_warning.desc', 'This option is rarely needed and adds to the wired usage of the room. Make sure you cannot avoid it before continuing.\n\nPress "ok" if you are sure.'),
            () => apply(true),
            () => apply(false),
            null,
            null,
            localizeWithFallback('wiredfurni.params.signal_warning.title', 'Are you sure?')
        );
    };

    useEffect(() =>
    {
        return () =>
        {
            if(!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    return (
        <WiredActionBaseView
            hasSpecialInput={ true }
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            cardStyle={ { width: '400px' } }
            save={ save }
            selectionPreview={
                <div className="flex flex-col gap-2">
                    <WiredFurniSelectionSourceRow
                        title={ localizeWithFallback('wiredfurni.params.sources.furni.title.signal_antenna', 'Antenne:') }
                        titleIsLiteral={ true }
                        options={ [ { value: SOURCE_SELECTED, label: 'wiredfurni.params.sources.furni.100' } ] }
                        value={ SOURCE_SELECTED }
                        selectionKind="primary"
                        selectionActive={ selectionMode === 'antenna' }
                        selectionCount={ antennaIds.length }
                        selectionLimit={ selectionLimit }
                        selectionEnabledValues={ [ SOURCE_SELECTED ] }
                        onChange={ () =>
                        {} }
                        onSelectionActivate={ () => switchSelection('antenna') } />
                    <WiredFurniSelectionSourceRow
                        title={ localizeWithFallback('wiredfurni.params.sources.furni.title.signal_forward', 'Furni to forward:') }
                        titleIsLiteral={ true }
                        options={ FURNI_SOURCES }
                        value={ furniSource }
                        selectionKind="secondary"
                        selectionActive={ selectionMode === 'furni' }
                        selectionCount={ forwardFurniIds.length }
                        selectionLimit={ selectionLimit }
                        selectionEnabledValues={ [ SOURCE_SELECTED ] }
                        onChange={ onChangeFurniSource }
                        onSelectionActivate={ () => switchSelection('furni') } />
                    <WiredFurniSelectionSourceRow
                        title={ localizeWithFallback('wiredfurni.params.sources.users.title.signal_forward', 'Users to forward:') }
                        titleIsLiteral={ true }
                        options={ USER_SOURCES }
                        value={ userSource }
                        selectionKind="secondary"
                        selectionActive={ false }
                        selectionCount={ 0 }
                        selectionLimit={ 0 }
                        selectionEnabledValues={ [] }
                        showSelectionToggle={ false }
                        onChange={ setUserSource } />
                </div>
            }
        >
            <div className="flex flex-col gap-3">
                <Text bold>{ localizeWithFallback('wiredfurni.params.signal.send_options', LocalizeText('wiredfurni.params.signal.options')) }</Text>
                <div className="form-check">
                    <Checkbox id="signal-per-furni" checked={ signalPerFurni } onCheckedChange={(nextChecked) => confirmSplit(nextChecked, setSignalPerFurni)} />
                    <label className="form-check-label" htmlFor="signal-per-furni">
                        <Text small>{ LocalizeText('wiredfurni.params.signal.split_furni') }</Text>
                    </label>
                </div>
                <div className="form-check">
                    <Checkbox id="signal-per-user" checked={ signalPerUser } onCheckedChange={(nextChecked) => confirmSplit(nextChecked, setSignalPerUser)} />
                    <label className="form-check-label" htmlFor="signal-per-user">
                        <Text small>{ LocalizeText('wiredfurni.params.signal.split_users') }</Text>
                    </label>
                </div>
            </div>
        </WiredActionBaseView>
    );
};
