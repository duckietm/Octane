import { DetailedHTMLProps, HTMLAttributes, PropsWithChildren, Ref } from 'react';
import waSelectedIcon from '../../assets/images/avatareditor/air/bottom-accessories.png';
import waIcon from '../../assets/images/avatareditor/air/bottom-accessories-off.png';
import shSelectedIcon from '../../assets/images/avatareditor/air/bottom-shoes.png';
import shIcon from '../../assets/images/avatareditor/air/bottom-shoes-off.png';
import lgSelectedIcon from '../../assets/images/avatareditor/air/bottom-trousers.png';
import lgIcon from '../../assets/images/avatareditor/air/bottom-trousers-off.png';
import femaleSelectedIcon from '../../assets/images/avatareditor/air/gender-female.png';
import femaleIcon from '../../assets/images/avatareditor/air/gender-female-off.png';
import maleSelectedIcon from '../../assets/images/avatareditor/air/gender-male.png';
import maleIcon from '../../assets/images/avatareditor/air/gender-male-off.png';
import heSelectedIcon from '../../assets/images/avatareditor/air/head-accessories.png';
import heIcon from '../../assets/images/avatareditor/air/head-accessories-off.png';
import eaSelectedIcon from '../../assets/images/avatareditor/air/head-eyewear.png';
import eaIcon from '../../assets/images/avatareditor/air/head-eyewear-off.png';
import faSelectedIcon from '../../assets/images/avatareditor/air/head-face-accessories.png';
import faIcon from '../../assets/images/avatareditor/air/head-face-accessories-off.png';
import hrSelectedIcon from '../../assets/images/avatareditor/air/head-hair.png';
import hrIcon from '../../assets/images/avatareditor/air/head-hair-off.png';
import haSelectedIcon from '../../assets/images/avatareditor/air/head-hats.png';
import haIcon from '../../assets/images/avatareditor/air/head-hats-off.png';
import hdIcon from '../../assets/images/avatareditor/air/main-generic.png';
import mcSelectedIcon from '../../assets/images/avatareditor/air/misc-misc.png';
import mcIcon from '../../assets/images/avatareditor/air/misc-misc-off.png';
import ptSelectedIcon from '../../assets/images/avatareditor/air/misc-pets.png';
import ptIcon from '../../assets/images/avatareditor/air/misc-pets-off.png';
import clearIcon from '../../assets/images/avatareditor/air/remove-selection.png';
import caSelectedIcon from '../../assets/images/avatareditor/air/top-accessories.png';
import caIcon from '../../assets/images/avatareditor/air/top-accessories-off.png';
import ccSelectedIcon from '../../assets/images/avatareditor/air/top-jacket.png';
import ccIcon from '../../assets/images/avatareditor/air/top-jacket-off.png';
import cpSelectedIcon from '../../assets/images/avatareditor/air/top-prints.png';
import cpIcon from '../../assets/images/avatareditor/air/top-prints-off.png';
import chSelectedIcon from '../../assets/images/avatareditor/air/top-shirt.png';
import chIcon from '../../assets/images/avatareditor/air/top-shirt-off.png';
import sellableIcon from '../../assets/images/avatareditor/air/wearable.png';
import arrowLeftIcon from '../../assets/images/avatareditor/arrow-left-icon.png';
import arrowRightIcon from '../../assets/images/avatareditor/arrow-right-icon.png';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { classNames } from '../../layout';

const ICON_MAP: Record<string, { normal: string; selected?: string }> = {
    'arrow-left': { normal: arrowLeftIcon },
    'arrow-right': { normal: arrowRightIcon },
    ca: { normal: caIcon, selected: caSelectedIcon },
    cc: { normal: ccIcon, selected: ccSelectedIcon },
    ch: { normal: chIcon, selected: chSelectedIcon },
    clear: { normal: clearIcon },
    cp: { normal: cpIcon, selected: cpSelectedIcon },
    ea: { normal: eaIcon, selected: eaSelectedIcon },
    fa: { normal: faIcon, selected: faSelectedIcon },
    female: { normal: femaleIcon, selected: femaleSelectedIcon },
    ha: { normal: haIcon, selected: haSelectedIcon },
    hd: { normal: hdIcon },
    he: { normal: heIcon, selected: heSelectedIcon },
    hr: { normal: hrIcon, selected: hrSelectedIcon },
    lg: { normal: lgIcon, selected: lgSelectedIcon },
    male: { normal: maleIcon, selected: maleSelectedIcon },
    mc: { normal: mcIcon, selected: mcSelectedIcon },
    pt: { normal: ptIcon, selected: ptSelectedIcon },
    sellable: { normal: sellableIcon },
    sh: { normal: shIcon, selected: shSelectedIcon },
    wa: { normal: waIcon, selected: waSelectedIcon }
};

type AvatarEditorIconProps = PropsWithChildren<{
    icon: string;
    selected?: boolean;
    ref?: Ref<HTMLDivElement>;
}> &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const AvatarEditorIcon = ({ ref, icon = null, selected = false, className = null, children, ...rest }: AvatarEditorIconProps) => {
    const iconEntry = icon ? ICON_MAP[icon] : null;

    if (!iconEntry) return null;

    const src = selected && iconEntry.selected ? iconEntry.selected : iconEntry.normal;

    return (
        <NativeTextTree>
            <div ref={ref} className={classNames('avatar-editor-icon flex items-center justify-center cursor-pointer', className)} {...rest}>
                <img src={src} alt="" className="pointer-events-none" draggable={false} />
                {children}
            </div>
        </NativeTextTree>
    );
};
