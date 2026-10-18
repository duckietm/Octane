import { FurnitureType, GetSessionDataManager, IWiredContractItemType, IWiredContractNode } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import {
    createWiredContractNode,
    filterWiredContractCandidates,
    IWiredContractCandidate,
    validateWiredContractElement,
    WIRED_CONTRACT_COIN,
    WIRED_CONTRACT_FURNI,
    WIRED_CONTRACT_MAX_COINS,
    WIRED_CONTRACT_MAX_FURNI,
    WIRED_CONTRACT_SEARCH_MAX,
    wiredContractCandidates,
    wiredContractItemKey
} from '../../../../api/wired/WiredContract';
import { LayoutFurniImageView } from '../../../../common';
import { ContractFooter, ContractFrame, ContractSection, ContractSkin, ContractText } from './WiredContractEditorView';

/** AIR TableView rows are 20px; only the rows in view (and a few around them) are drawn. */
const ROW_HEIGHT = 20;
const VISIBLE_ROWS = 18;

export interface WiredContractElementEditorViewProps
{
    initial: IWiredContractNode | null;
    canWrite: boolean;
    onSave: (node: IWiredContractNode) => void;
    onClose: () => void;
    /** AIR alerts a refused element (`${wiredfurni.error.title}` with the reason). */
    onInvalid: (message: string) => void;
    /** For tests: the furnidata to list; the session's furnidata otherwise. */
    candidates?: IWiredContractCandidate[];
}

/**
 * AIR AddEditContractElement: type and amount side by side, then the item type selection (furni code, search, a
 * 234px table of name / code / type and the row count). 420px wide, 375px right of centre.
 */
export const WiredContractElementEditorView: FC<WiredContractElementEditorViewProps> = ({ initial, canWrite, onSave, onClose, onInvalid, candidates = null }) =>
{
    const [ type, setType ] = useState<number>(initial?.type ?? WIRED_CONTRACT_COIN);
    const [ amount, setAmount ] = useState(String(initial?.amount ?? 1));
    const [ selected, setSelected ] = useState<IWiredContractItemType | null>(initial?.itemType ?? null);
    const [ query, setQuery ] = useState('');
    const [ scrollTop, setScrollTop ] = useState(0);
    const all = useMemo(() => candidates ?? wiredContractCandidates(GetSessionDataManager().getAllFurnitureData() ?? [], key => LocalizeText(key)), [ candidates ]);
    const filtered = useMemo(() => filterWiredContractCandidates(all, query), [ all, query ]);
    const selectedCandidate = useMemo(() => all.find(candidate => wiredContractItemKey(candidate.itemType) === wiredContractItemKey(selected)) ?? null, [ all, selected ]);
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
    const visible = filtered.slice(first, first + VISIBLE_ROWS);

    const save = () =>
    {
        if(!canWrite) return;

        const value = Number(amount);
        const error = validateWiredContractElement(type, value, selectedCandidate);

        if(error)
        {
            onInvalid(error === 'wiredcontracts.element.too_many_items' ? LocalizeText(error, [ 'amount' ], [ String(WIRED_CONTRACT_MAX_FURNI) ]) : LocalizeText(error));
            return;
        }

        onSave(createWiredContractNode(type, value, selectedCandidate?.itemType ?? null));
    };

    return (
        <ContractFrame title={ LocalizeText(initial ? 'wiredcontracts.edit_element.title' : 'wiredcontracts.add_element.title') } width={ 420 } offsetLeft={ 375 } uniqueKey="wired-contract-element" className="wired-contract--element" onClose={ onClose }>
            <fieldset className="wired-contract__editable" disabled={ !canWrite }>
                <div className="wired-contract__element-top">
                    <ContractSection title={ LocalizeText('wiredcontracts.element.type') }>
                        { [ WIRED_CONTRACT_COIN, WIRED_CONTRACT_FURNI ].map(value =>
                            <label className="wired-contract__choice" key={ value }>
                                <input type="radio" name="wired-contract-element-type" checked={ type === value } onChange={ () => setType(value) } />
                                <ContractText text={ LocalizeText(`wiredcontracts.element.type.${ value }`) } />
                            </label>) }
                    </ContractSection>
                    <ContractSection title={ LocalizeText('wiredcontracts.element.amount') }>
                        <input className="wired-contract__input wired-contract__amount" type="number" min={ 1 } max={ WIRED_CONTRACT_MAX_COINS } aria-label={ LocalizeText('wiredcontracts.element.amount') } value={ amount } onChange={ event => setAmount(event.target.value) } />
                    </ContractSection>
                </div>
                <ContractSection title={ LocalizeText('wiredcontracts.element.itemtype.selection') } disabled={ type !== WIRED_CONTRACT_FURNI }
                    headerOption={ selected && <span className="wired-contract__selected-icon"><LayoutFurniImageView productType={ selected.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR } productClassId={ selected.typeId } extraData={ selected.legacyPosterId } direction={ 2 } /></span> }>
                    <label className="wired-contract__named">
                        <ContractText text={ LocalizeText('wiredcontracts.element.itemtype.furni_code') } />
                        <input className="wired-contract__input wired-contract__named-input" type="text" readOnly aria-label={ LocalizeText('wiredcontracts.element.itemtype.furni_code') } placeholder={ LocalizeText('wiredcontracts.element.itemtype.furni_code.placeholder') } value={ selectedCandidate?.code ?? '' } />
                    </label>
                    <label className="wired-contract__named">
                        <ContractText text={ LocalizeText('wiredcontracts.element.itemtype.search') } />
                        <input className="wired-contract__input wired-contract__named-input" type="text" aria-label={ LocalizeText('wiredcontracts.element.itemtype.search') } maxLength={ WIRED_CONTRACT_SEARCH_MAX } value={ query } onChange={ event => { setQuery(event.target.value); setScrollTop(0); } } />
                    </label>
                    <div className="wired-contract__item-table">
                        <ContractSkin type="table" width={ 404 } height={ 234 } />
                        <div className="wired-contract__item-heading">
                            { [ 'furni_name', 'furni_code', 'furni_type' ].map(key => <span key={ key }><ContractText text={ LocalizeText(`wiredcontracts.element.itemtype.col.${ key }`) } bold background={ 0xffffff } /></span>) }
                        </div>
                        <div className="wired-contract__item-scroll" onScroll={ event => setScrollTop(event.currentTarget.scrollTop) }>
                            <div role="listbox" aria-label={ LocalizeText('wiredcontracts.element.itemtype.selection') } style={ { height: filtered.length * ROW_HEIGHT, position: 'relative' } }>
                                { visible.map((candidate, index) =>
                                    <button role="option" type="button" key={ wiredContractItemKey(candidate.itemType) } className="wired-contract__item-row"
                                        aria-selected={ wiredContractItemKey(candidate.itemType) === wiredContractItemKey(selected) } data-even={ (first + index) % 2 === 0 }
                                        style={ { top: (first + index) * ROW_HEIGHT } } onClick={ () => setSelected(candidate.itemType) }>
                                        <span>{ candidate.name }</span>
                                        <span>{ candidate.code }</span>
                                        <span>{ LocalizeText(candidate.itemType.isWallItem ? 'inventory.filter.placement.wall' : 'inventory.filter.placement.floor') }</span>
                                    </button>) }
                            </div>
                        </div>
                    </div>
                    <div className="wired-contract__count"><ContractText text={ LocalizeText('wiredcontracts.element.show_count', [ 'amount' ], [ String(filtered.length) ]) } /></div>
                </ContractSection>
            </fieldset>
            <ContractFooter saveDisabled={ !canWrite } onSave={ save } onClose={ onClose } />
        </ContractFrame>
    );
};
