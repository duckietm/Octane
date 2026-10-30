import { FC, useEffect, useState } from 'react';
import { LocalizeText, readWiredUserAction, WiredFurniType, wiredUserActionExtra, WiredUserActionChoice } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredUserActionSection } from '../WiredUserActionSection';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { WiredConditionQuantifierSection } from './WiredConditionQuantifierSection';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';


const USER_ACTION_SOURCES: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

export const WiredConditionUserPerformsActionView: FC = () => {
    const [choice, setChoice] = useState<WiredUserActionChoice>(() => readWiredUserAction([], ''));
    const [userSource, setUserSource] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    // Official layout: [action], the extra in the string, the users in the official source slot, the quantifier
    // in its slot (this view's advanced block).
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();

    const save = () => {
        setIntParams([choice.action]);
        setSourceTypes({ furni: [], users: [userSource] });
        setStringParam(wiredUserActionExtra(choice));
    };

    useEffect(() => {
        setChoice(readWiredUserAction(trigger?.intData ?? [], trigger?.stringData ?? ''));
        setUserSource(trigger?.userSourceTypes?.[0] ?? 0);
        setShowAdvanced((trigger?.userSourceTypes?.[0] ?? 0) !== 0 || (trigger?.quantifierCode ?? 0) !== 0);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footerCollapsible={false}
                showQuantifier={false}
                footer={
                    <div className="flex flex-col gap-2">
                        <BaseButton className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                            {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                        </BaseButton>
                        {showAdvanced && (
                            <>
                                <WiredConditionQuantifierSection />
                                <WiredSourcesSelector showUsers={true} userSource={userSource} userSources={USER_ACTION_SOURCES} onChangeUsers={setUserSource} />
                            </>
                        )}
                    </div>
                }
            >
                <WiredUserActionSection choice={choice} onChange={setChoice} />
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
