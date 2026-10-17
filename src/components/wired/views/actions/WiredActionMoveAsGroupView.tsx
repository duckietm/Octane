import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import sourceFurniIcon from '../../../../assets/images/wired/source_furni.png';
import sourceUserIcon from '../../../../assets/images/wired/source_user.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NumberInput } from '../../../../common/NumberInput';
import { BaseButton } from '../../../../common/BaseButton';

// Official source values: 0 trigger, 11 clicked user, 100 picks, 200 selector, 201 signal.
const SOURCE_TRIGGER = 0;
const SOURCE_PICKED = 100;
const MAX_OFFSET = 64;

const TARGET_FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

const TARGET_USER_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 11, label: 'wiredfurni.params.sources.users.11' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' },
        { value: 201, label: 'wiredfurni.params.sources.users.201' }
    ],
    'users'
);

const clampOffset = (value: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, isNaN(value) ? 0 : value));

/**
 * The official "move as group" (MoveAsGroup, code 57): the furni of the group move together to a
 * target (a user, or a furni of the second slot) plus an x/y offset of -64..64. Int params
 * [targetIsUser, offsetX, offsetY]; furni sources [group, target furni], user sources [target user].
 */
export const WiredActionMoveAsGroupView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [ targetIsUser, setTargetIsUser ] = useState(true);
    const [ offsetX, setOffsetX ] = useState(0);
    const [ offsetY, setOffsetY ] = useState(0);
    const [ groupSource, setGroupSource ] = useState(SOURCE_PICKED);
    const [ targetFurniSource, setTargetFurniSource ] = useState(SOURCE_TRIGGER);
    const [ userSource, setUserSource ] = useState(SOURCE_TRIGGER);
    const availableUserSources = useAvailableUserSources(trigger, TARGET_USER_SOURCES);

    useEffect(() =>
    {
        if(!trigger) return;

        const params = trigger.intData ?? [];

        setTargetIsUser(params.length < 1 || params[0] === 1);
        setOffsetX(clampOffset(params[1] ?? 0));
        setOffsetY(clampOffset(params[2] ?? 0));
        setGroupSource(trigger.furniSourceTypes?.[0] ?? SOURCE_PICKED);
        setTargetFurniSource(trigger.furniSourceTypes?.[1] ?? SOURCE_TRIGGER);
        setUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);
    }, [ trigger ]);

    const save = () =>
    {
        setIntParams([ targetIsUser ? 1 : 0, offsetX, offsetY ]);
        setSourceTypes({ furni: [ groupSource, targetFurniSource ], users: [ userSource ] });
    };

    const targetOptions = targetIsUser ? availableUserSources : TARGET_FURNI_SOURCES;
    const targetValue = targetIsUser ? userSource : targetFurniSource;

    const offsetInput = (label: string, value: number, onChange: (value: number) => void) => (
        <div className="flex items-center gap-1">
            <Text small>{ label }</Text>
            <NumberInput className="form-control form-control-sm" style={ { width: 64 } } min={ -MAX_OFFSET } max={ MAX_OFFSET } value={ value } onChange={ event => onChange(clampOffset(parseInt(event.target.value, 10))) } />
        </div>
    );

    return (
        <WiredActionBaseView
            hasSpecialInput={ true }
            requiresFurni={ groupSource === SOURCE_PICKED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE }
            save={ save }
            footer={ <WiredSourcesSelector showFurni={ true } furniSource={ groupSource } onChangeFurni={ setGroupSource } /> }>
            <div className="flex flex-col gap-2">
                <Text small>{ localizeWithFallback('wiredfurni.params.move_as_group.usage_info', 'The distance between the moving furniture will stay consistent.') }</Text>

                <div className="flex flex-col gap-1">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.place_furni.offsets', 'Offsets') }</Text>
                    <div className="flex items-center gap-3">
                        { offsetInput(localizeWithFallback('wiredfurni.params.place_furni.offsets.x', 'x:'), offsetX, setOffsetX) }
                        { offsetInput(localizeWithFallback('wiredfurni.params.place_furni.offsets.y', 'y:'), offsetY, setOffsetY) }
                    </div>
                </div>

                <hr className="m-0 bg-dark" />

                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.target_location"
                    options={ targetOptions }
                    value={ targetValue }
                    selectionKind={ targetIsUser ? 'primary' : 'secondary' }
                    selectionActive={ false }
                    selectionCount={ 0 }
                    selectionLimit={ 0 }
                    selectionEnabledValues={ [] }
                    showSelectionToggle={ false }
                    headerContent={
                        <div className="octane-wired__give-var-targets">
                            { [ { key: 'furni', icon: sourceFurniIcon, isUser: false }, { key: 'user', icon: sourceUserIcon, isUser: true } ].map(button => (
                                <BaseButton
                                    key={ button.key }
                                    type="button"
                                    title={ LocalizeText(`wiredfurni.params.sources.${ button.isUser ? 'users' : 'furni' }.title`) }
                                    className={ `octane-wired__give-var-target octane-wired__give-var-target--${ button.key } ${ targetIsUser === button.isUser ? 'is-active' : '' }` }
                                    onClick={ () => setTargetIsUser(button.isUser) }>
                                    <img src={ button.icon } alt={ button.key } />
                                </BaseButton>
                            )) }
                        </div>
                    }
                    onChange={ value => (targetIsUser ? setUserSource(value) : setTargetFurniSource(value)) } />
            </div>
        </WiredActionBaseView>
    );
};
