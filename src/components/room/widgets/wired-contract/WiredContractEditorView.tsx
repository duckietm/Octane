import { FurnitureType, IWiredContractContents, IWiredContractNode, IWiredContractRule } from '@octane/renderer';
import { FC, PropsWithChildren, ReactNode, useState } from 'react';
import { LocalizeText } from '../../../../api';
import {
    editableWiredContract,
    WIRED_CONTRACT_COIN,
    WIRED_CONTRACT_EARNINGS,
    WIRED_CONTRACT_LAYOUTS,
    WIRED_CONTRACT_MAX_NODES,
    WIRED_CONTRACT_MAX_RULES,
    WIRED_CONTRACT_MODE_DONATION,
    WIRED_CONTRACT_MODE_SPECIFIC,
    WIRED_CONTRACT_PAYMENT,
    WIRED_CONTRACT_RECEIVE_TEXT_MAX,
    WIRED_CONTRACT_REWARD,
    WIRED_CONTRACT_REWARD_TEXT_MAX,
    WIRED_CONTRACT_TRADE,
    wiredContractHasCreditNode
} from '../../../../api/wired/WiredContract';
import ruleXml from '../../../../assets/images/wired/native/contracts/border-5.xml?raw';
import nodeXml from '../../../../assets/images/wired/native/contracts/border-4.xml?raw';
import closeXml from '../../../../assets/images/wired/native/contracts/border-12.xml?raw';
import tableXml from '../../../../assets/images/wired/native/contracts/border-white.xml?raw';
import plusXml from '../../../../assets/images/wired/native/contracts/plus.xml?raw';
import closeIcon from '../../../../assets/images/wired/native/contracts/close.png';
import coinsIcon from '../../../../assets/images/wired/native/contracts/coins.png';
import blueAtlas from '../../../../assets/mod-tools/skins/habbo-blue-skin.png';
import ubuntuAtlas from '../../../../assets/mod-tools/skins/habbo-ubuntu-skin.png';
import { LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { UbuntuDropmenuView } from '../../../../common/dropmenu/UbuntuDropmenuView';
import { NativeText } from '../../../../common/native-text/NativeText';
import { parseNativeSkin } from '../../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../../mod-tools/native/NativeSkinView';

/** wired_style_ubuntu: container colour 0xe9e9e1; trade rules on 0xdadada, nodes on 0xeeeeee. */
const UBUNTU_BACKGROUND = 0xe9e9e1;
const RULE_BACKGROUND = 0xdadada;

const SKINS = {
    rule: { skin: parseNativeSkin(ruleXml), layout: 'border_5', atlas: blueAtlas },
    node: { skin: parseNativeSkin(nodeXml), layout: 'border_4', atlas: blueAtlas },
    close: { skin: parseNativeSkin(closeXml), layout: 'border_12', atlas: blueAtlas },
    table: { skin: parseNativeSkin(tableXml), layout: 'border_white', atlas: blueAtlas },
    plus: { skin: parseNativeSkin(plusXml), layout: 'button_plus_3', atlas: ubuntuAtlas }
};

export const ContractSkin: FC<{ type: keyof typeof SKINS; width: number; height: number; color?: number; state?: string }> = ({ type, width, height, color, state }) =>
    <NativeSkinView skin={ SKINS[type].skin } layout={ SKINS[type].layout } atlas={ SKINS[type].atlas } width={ width } height={ height } color={ color } state={ state } className="wired-contract__skin" />;

export const ContractText: FC<{ text: string; bold?: boolean; background?: number }> = ({ text, bold = false, background = UBUNTU_BACKGROUND }) =>
    <NativeText text={ text } background={ background } textStyle={ bold ? 'u_bold' : 'u_regular' } />;

const CloseIcon: FC = () => <><ContractSkin type="close" width={ 15 } height={ 15 } color={ 0xdddddd } /><img src={ closeIcon } alt="" /></>;

/** AIR SectionPreset: a bold title over its content; COLLAPSED ones open on a click on the title. */
export const ContractSection: FC<PropsWithChildren<{ title: string; disabled?: boolean; collapsed?: boolean; headerOption?: ReactNode }>> = ({ title, disabled = false, collapsed = false, headerOption = null, children }) =>
{
    const [ open, setOpen ] = useState(!collapsed);

    return (
        <fieldset className="wired-contract__section" disabled={ disabled }>
            { collapsed
                ? <button className="wired-contract__fold" type="button" aria-expanded={ open } aria-label={ title } onClick={ () => setOpen(value => !value) }><ContractText text={ title } bold /><span aria-hidden>{ open ? '▾' : '▸' }</span></button>
                : <div className="wired-contract__section-title"><ContractText text={ title } bold />{ headerOption }</div> }
            <div hidden={ !open }>{ children }</div>
        </fieldset>
    );
};

/** AIR FooterPreset: Ready and Cancel. */
export const ContractFooter: FC<{ saveDisabled: boolean; onSave: () => void; onClose: () => void }> = ({ saveDisabled, onSave, onClose }) =>
    <div className="wired-contract__footer">
        <button type="button" className="wired-contract__button" disabled={ saveDisabled } onClick={ onSave }>{ LocalizeText('wiredfurni.ready') }</button>
        <button type="button" className="wired-contract__button" onClick={ onClose }>{ LocalizeText('cancel') }</button>
    </div>;

/** AIR FramePreset in the Ubuntu wired style: 262px wide (420 for the element editor), not resizable. */
export const ContractFrame: FC<PropsWithChildren<{ title: string; width: number; uniqueKey: string; offsetLeft?: number; className?: string; onClose: () => void }>> = ({ title, width, uniqueKey, offsetLeft = 0, className = '', onClose, children }) =>
    <OctaneCardView className={ `wired-contract ${ className }`.trim() } theme="primary-slim" frameStyle={ 3 } isResizable={ false } uniqueKey={ uniqueKey } offsetLeft={ offsetLeft } style={ { width, minWidth: width, maxWidth: width } }>
        <OctaneCardHeaderView headerText={ title } onCloseClick={ onClose } />
        <OctaneCardContentView>{ children }</OctaneCardContentView>
    </OctaneCardView>;

const AddNodeButton: FC<{ onClick: () => void }> = ({ onClick }) =>
{
    const [ state, setState ] = useState('default');

    return (
        <button type="button" className="wired-contract__add-node" aria-label={ LocalizeText('wiredcontracts.add_element.title') }
            onMouseEnter={ () => setState('hovering') } onMouseLeave={ () => setState('default') } onMouseDown={ () => setState('pressed') } onMouseUp={ () => setState('hovering') } onClick={ onClick }>
            <ContractSkin type="plus" width={ 23 } height={ 22 } state={ state } />
        </button>
    );
};

export const ContractNodeIcon: FC<{ node: IWiredContractNode }> = ({ node }) =>
{
    if(node.type === WIRED_CONTRACT_COIN) return <img className="wired-contract__coins" src={ coinsIcon } alt={ LocalizeText('wiredcontracts.element.type.0') } />;
    if(!node.itemType) return null;

    return <LayoutFurniImageView productType={ node.itemType.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR } productClassId={ node.itemType.typeId } extraData={ node.itemType.legacyPosterId } direction={ 2 } />;
};

interface ContractRuleViewProps
{
    title: string;
    rule: IWiredContractRule;
    onEdit: (index: number | null) => void;
    onChange: (rule: IWiredContractRule) => void;
    onRemove?: () => void;
}

/**
 * AIR TradeRuleEditorPreset / TradeRuleNodeView: a titled rule, up to five 42px nodes and an add button; a node shows
 * its amount unless it is a single furni, and a rule after the first can be removed (both close buttons on hover).
 */
export const ContractRuleView: FC<ContractRuleViewProps> = ({ title, rule, onEdit, onChange, onRemove }) =>
    <div className="wired-contract__rule">
        <ContractSkin type="rule" width={ 246 } height={ 68 } color={ RULE_BACKGROUND } />
        <ContractText text={ title } background={ RULE_BACKGROUND } />
        { onRemove && <button className="wired-contract__remove-rule" type="button" aria-label={ LocalizeText('wiredcontracts.payment_rule', [ 'i' ], [ '' ]) } onClick={ onRemove }><CloseIcon /></button> }
        <div className="wired-contract__nodes">
            { rule.nodes.map((node, index) =>
                <div className="wired-contract__node" key={ index }>
                    <button type="button" className="wired-contract__node-edit" aria-label={ LocalizeText('wiredcontracts.edit_element.title') } onClick={ () => onEdit(index) }>
                        <ContractSkin type="node" width={ 42 } height={ 42 } color={ 0xeeeeee } />
                        <ContractNodeIcon node={ node } />
                        { (node.type === WIRED_CONTRACT_COIN || node.amount !== 1) && <span className="wired-contract__quantity">{ node.amount }</span> }
                    </button>
                    <button type="button" className="wired-contract__remove-node" aria-label={ LocalizeText('wiredcontracts.edit_element.title') + ' x' } onClick={ () => onChange({ nodes: rule.nodes.filter((unused, position) => position !== index) }) }><CloseIcon /></button>
                </div>) }
            { rule.nodes.length < WIRED_CONTRACT_MAX_NODES && <AddNodeButton onClick={ () => onEdit(null) } /> }
        </div>
    </div>;

/** Which rule and node the element editor works on; node null adds one. */
export interface WiredContractElementTarget
{
    side: 'give' | 'get';
    rule: number;
    node: number | null;
}

export interface WiredContractEditorViewProps
{
    contents: IWiredContractContents;
    canWrite: boolean;
    saving: boolean;
    onSave: (draft: IWiredContractContents) => void;
    onClose: () => void;
    /** Opens the element editor (AIR AddEditContractElement.onAdd / onEdit) on a rule of the draft. */
    renderElementEditor: (target: WiredContractElementTarget, initial: IWiredContractNode | null, apply: (node: IWiredContractNode) => void, close: () => void) => ReactNode;
}

/** AIR PaymentContract / TradeContract / RewardContract. */
export const WiredContractEditorView: FC<WiredContractEditorViewProps> = ({ contents, canWrite, saving, onSave, onClose, renderElementEditor }) =>
{
    const [ draft, setDraft ] = useState(() => editableWiredContract(contents));
    const [ editing, setEditing ] = useState<WiredContractElementTarget | null>(null);
    const type = draft.contractType;
    const give = draft.definition.youGiveRule;
    const get = draft.definition.youGetRule;

    const patch = (change: Partial<IWiredContractContents>) => setDraft(current => ({ ...current, ...change }));
    const setRule = (side: 'give' | 'get', index: number, rule: IWiredContractRule) => setDraft(current => ({
        ...current,
        definition: side === 'give'
            ? { ...current.definition, youGiveRule: current.definition.youGiveRule.map((item, position) => (position === index) ? rule : item) }
            : { ...current.definition, youGetRule: rule }
    }));
    const setGive = (rules: IWiredContractRule[]) => setDraft(current => ({ ...current, definition: { ...current.definition, youGiveRule: rules } }));

    const editedRule = editing ? (editing.side === 'give' ? give?.[editing.rule] : get) : null;
    const applyNode = (node: IWiredContractNode) =>
    {
        if(!editing || !editedRule) return;

        setRule(editing.side, editing.rule, { nodes: (editing.node === null) ? [ ...editedRule.nodes, node ] : editedRule.nodes.map((item, index) => (index === editing.node) ? node : item) });
        setEditing(null);
    };

    const paymentRules = give &&
        <div className="wired-contract__rule-list">
            { give.map((rule, index) =>
                <ContractRuleView key={ index } title={ LocalizeText('wiredcontracts.payment_rule', [ 'i' ], [ String(index + 1) ]) } rule={ rule }
                    onEdit={ node => setEditing({ side: 'give', rule: index, node }) }
                    onChange={ next => setRule('give', index, next) }
                    onRemove={ index > 0 ? () => setGive(give.filter((unused, position) => position !== index)) : undefined } />) }
            <button type="button" className="wired-contract__button wired-contract__button--wide" disabled={ give.length >= WIRED_CONTRACT_MAX_RULES } onClick={ () => setGive([ ...give, { nodes: [] } ]) }>{ LocalizeText('wiredcontracts.payment_add_more') }</button>
        </div>;
    const rewardRule = get && <ContractRuleView title={ LocalizeText('wiredcontracts.reward_rule') } rule={ get } onEdit={ node => setEditing({ side: 'get', rule: 0, node }) } onChange={ next => setRule('get', 0, next) } />;
    const titleKey = (type === WIRED_CONTRACT_PAYMENT) ? 'payment' : (type === WIRED_CONTRACT_TRADE) ? 'trade' : 'reward';

    return (
        <>
            <ContractFrame title={ LocalizeText(`wiredcontracts.${ titleKey }_contract.title`) } width={ 262 } uniqueKey="wired-contract" onClose={ onClose }>
                <fieldset className="wired-contract__editable" disabled={ !canWrite || saving }>
                    { (type === WIRED_CONTRACT_PAYMENT) && <>
                        <ContractSection title={ LocalizeText('wiredcontracts.payment_contract.mode') }>
                            { [ WIRED_CONTRACT_MODE_DONATION, WIRED_CONTRACT_MODE_SPECIFIC ].map(mode =>
                                <label className="wired-contract__choice" key={ mode }>
                                    <input type="radio" name="wired-contract-payment-mode" checked={ draft.paymentMode === mode } onChange={ () => patch({ paymentMode: mode }) } />
                                    <ContractText text={ LocalizeText(`wiredcontracts.payment_contract.mode.${ mode }`) } />
                                </label>) }
                        </ContractSection>
                        <ContractSection title={ LocalizeText('wiredcontracts.payment_contract.receive_text') }>
                            <input className="wired-contract__input" type="text" aria-label={ LocalizeText('wiredcontracts.payment_contract.receive_text') } maxLength={ WIRED_CONTRACT_RECEIVE_TEXT_MAX } value={ draft.receiveText } onChange={ event => patch({ receiveText: event.target.value }) } />
                        </ContractSection>
                    </> }
                    { (type !== WIRED_CONTRACT_REWARD) &&
                        <ContractSection title={ LocalizeText('wiredcontracts.payment_requirements') } disabled={ (type === WIRED_CONTRACT_PAYMENT) && (draft.paymentMode !== WIRED_CONTRACT_MODE_SPECIFIC) }>{ paymentRules }</ContractSection> }
                    { (type !== WIRED_CONTRACT_PAYMENT) &&
                        <ContractSection title={ LocalizeText('wiredcontracts.reward_requirements') }>{ rewardRule }</ContractSection> }
                    { (type === WIRED_CONTRACT_PAYMENT) &&
                        <ContractSection title={ LocalizeText('wiredcontracts.payment_contract.layout_type') } collapsed>
                            <UbuntuDropmenuView label={ LocalizeText('wiredcontracts.payment_contract.layout_type') } disabled={ !canWrite || saving }
                                value={ WIRED_CONTRACT_LAYOUTS.includes(draft.layoutType) ? draft.layoutType : WIRED_CONTRACT_LAYOUTS[0] }
                                options={ WIRED_CONTRACT_LAYOUTS.map((layout, index) => ({ value: layout, label: LocalizeText(`wiredcontracts.payment_contract.layout_type.${ index }`) })) }
                                onSelect={ layoutType => patch({ layoutType }) } />
                        </ContractSection> }
                    { (type === WIRED_CONTRACT_REWARD) && <>
                        <ContractSection title={ LocalizeText('wiredcontracts.reward_contract.reward_popup') }>
                            <textarea className="wired-contract__input wired-contract__textarea" aria-label={ LocalizeText('wiredcontracts.reward_contract.reward_popup.text') } title={ LocalizeText('wiredcontracts.reward_contract.reward_popup.text.tooltip') } maxLength={ WIRED_CONTRACT_REWARD_TEXT_MAX } value={ draft.rewardText } onChange={ event => patch({ rewardText: event.target.value }) } />
                            <label className="wired-contract__choice">
                                <input type="checkbox" checked={ draft.showDialog } onChange={ event => patch({ showDialog: event.target.checked }) } />
                                <ContractText text={ LocalizeText('wiredcontracts.reward_contract.reward_popup.show_by_default') } />
                            </label>
                        </ContractSection>
                        <ContractSection title={ LocalizeText('wiredcontracts.reward_contract.earnings_category') } collapsed disabled={ !wiredContractHasCreditNode(get) }>
                            <UbuntuDropmenuView label={ LocalizeText('wiredcontracts.reward_contract.earnings_category') } disabled={ !canWrite || saving || !wiredContractHasCreditNode(get) }
                                value={ draft.rewardCategory }
                                options={ WIRED_CONTRACT_EARNINGS.map(category => ({ value: category, label: LocalizeText(`wiredfurni.params.earnings_category.${ category }`) })) }
                                onSelect={ rewardCategory => patch({ rewardCategory }) } />
                        </ContractSection>
                    </> }
                </fieldset>
                <ContractFooter saveDisabled={ !canWrite || saving } onSave={ () => onSave(draft) } onClose={ onClose } />
            </ContractFrame>
            { editing && editedRule && renderElementEditor(editing, (editing.node === null) ? null : editedRule.nodes[editing.node] ?? null, applyNode, () => setEditing(null)) }
        </>
    );
};
