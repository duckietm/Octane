import { WiredAddonShareSynchronizeComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, SendMessageComposer, WiredFurniType } from '../../../../api';
import { Button, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/** The official category checkboxes (AIR {@code §_-jt§}), in int param order. */
export const WIRED_ADDON_SHARING_CATEGORIES = [
    'wiredfurni.params.variables.addon_sharing.text_connectors',
    'wiredfurni.params.variables.addon_sharing.subvariable_creators',
    'wiredfurni.params.variables.addon_sharing.variable_fx'
];

interface WiredExtraVariableAddonSharingViewProps
{
    usageInfoKey: string;
    synchronize?: boolean;
}

/**
 * The shared editor of the official Variable Add-on Share (1003) and Import (1004) boxes: a usage text and the
 * "Categorieën" checkboxes, int params [text connectors, subvariable creators, variable fx] as 0/1. Share adds the
 * Synchronize button, disabled without wired write permission (AIR wiredMenu.hasWritePermission).
 */
const WiredExtraVariableAddonSharingView: FC<WiredExtraVariableAddonSharingViewProps> = ({ usageInfoKey, synchronize = false }) =>
{
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { roomSettings = null } = useWiredTools();
    const [ categories, setCategories ] = useState<boolean[]>([ false, false, false ]);

    useEffect(() =>
    {
        if(!trigger) return;

        const params = trigger.intData ?? [];

        setCategories(WIRED_ADDON_SHARING_CATEGORIES.map((_, index) => (params[index] === 1)));
    }, [ trigger ]);

    const toggle = (index: number, selected: boolean) => setCategories(previous => previous.map((value, i) => ((i === index) ? selected : value)));

    const save = () =>
    {
        setIntParams(categories.map(selected => (selected ? 1 : 0)));
        setStringParam('');
    };

    const canWrite = !!roomSettings?.canModify;

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={ true } requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } save={ save }>
                <div className="flex flex-col gap-2">
                    <Text small className="whitespace-pre-line">{ LocalizeText(usageInfoKey).replace(/\\n/g, '\n') }</Text>
                    <div className="octane-wired__divider" />
                    <div className="flex flex-col gap-1">
                        <Text bold>{ LocalizeText('wiredfurni.params.variables.addon_sharing.categories') }</Text>
                        { WIRED_ADDON_SHARING_CATEGORIES.map((key, index) => (
                            <label key={ key } className="flex cursor-pointer items-center gap-1">
                                <Checkbox checked={ categories[index] } onCheckedChange={ nextChecked => toggle(index, nextChecked) } />
                                <Text small>{ LocalizeText(key) }</Text>
                            </label>
                        )) }
                    </div>
                    { synchronize &&
                        <Button disabled={ !canWrite || !trigger } variant="secondary" onClick={ () => trigger && SendMessageComposer(new WiredAddonShareSynchronizeComposer(trigger.id)) }>
                            { LocalizeText('wiredfurni.params.variables.addon_share.synchronize') }
                        </Button> }
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};

/** Official Variable Add-on Share (1003): which categories this add-on shares with other rooms. */
export const WiredExtraVariableAddonShareView: FC<{}> = () => <WiredExtraVariableAddonSharingView synchronize={ true } usageInfoKey="wiredfurni.params.variables.addon_share.usage_info" />;

/** Official Variable Add-on Import (1004): which categories this add-on imports from other rooms. */
export const WiredExtraVariableAddonImportView: FC<{}> = () => <WiredExtraVariableAddonSharingView usageInfoKey="wiredfurni.params.variables.addon_import.usage_info" />;
