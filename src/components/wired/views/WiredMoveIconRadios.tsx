import { FC, ReactNode } from 'react';
import iconMove0 from '../../../assets/images/wired/move/move_0.png';
import iconMove1 from '../../../assets/images/wired/move/move_1.png';
import iconMove2 from '../../../assets/images/wired/move/move_2.png';
import iconMove3 from '../../../assets/images/wired/move/move_3.png';
import iconMove4 from '../../../assets/images/wired/move/move_4.png';
import iconMove5 from '../../../assets/images/wired/move/move_5.png';
import iconMove6 from '../../../assets/images/wired/move/move_6.png';
import iconMove7 from '../../../assets/images/wired/move/move_7.png';
import iconMoveDiag from '../../../assets/images/wired/move/move_diag.png';
import iconMoveRnd from '../../../assets/images/wired/move/move_rnd.png';
import iconMoveVrt from '../../../assets/images/wired/move/move_vrt.png';
import iconRotateCcw from '../../../assets/images/wired/move/rotate_ccw.png';
import iconRotateCw from '../../../assets/images/wired/move/rotate_cw.png';
import { Text } from '../../../common';
import { Checkbox } from '../../../common/Checkbox';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Radio } from '../../../common/Radio';

/** The official wired setup assets `move_0` .. `move_7` (one per room direction). */
export const WIRED_MOVE_ICONS: readonly string[] = [iconMove0, iconMove1, iconMove2, iconMove3, iconMove4, iconMove5, iconMove6, iconMove7];
export const WIRED_MOVE_DIAG_ICON = iconMoveDiag;
export const WIRED_MOVE_VRT_ICON = iconMoveVrt;
export const WIRED_MOVE_RND_ICON = iconMoveRnd;
export const WIRED_ROTATE_CW_ICON = iconRotateCw;
export const WIRED_ROTATE_CCW_ICON = iconRotateCcw;

/** The room directions 0..7 in the official order (rows 0 1 2 3 / 4 5 6 7 in a 4-column group). */
export const WIRED_SEQUENTIAL_DIRECTIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];

export interface WiredIconRadioOption {
    value: number;
    icon?: string;
    label?: ReactNode;
    /** Official RadioButtonParam `newLine`: the option sits on a row of its own. */
    newLine?: boolean;
}

interface WiredIconRadioGroupProps {
    name: string;
    options: readonly WiredIconRadioOption[];
    value: number;
    onChange: (value: number) => void;
    columns?: number;
}

const OptionContent: FC<{ option: WiredIconRadioOption }> = ({ option }) => (
    <NativeTextTree>
        <>
            {option.icon && <img alt="" className="h-auto w-auto object-contain" draggable={false} src={option.icon} />}
            {option.label !== undefined && option.label !== null && <Text>{option.label}</Text>}
        </>
    </NativeTextTree>
);

/** An official `createRadioGroup(options, null, columns)`: the options fill the columns row by row. */
export const WiredIconRadioGroup: FC<WiredIconRadioGroupProps> = (props) => {
    const { name, options, value, onChange, columns = 4 } = props;

    return (
        <div className="grid gap-x-2 gap-y-1 w-fit" style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
            {options.map((option) => (
                <label
                    key={`${name}-${option.value}`}
                    className="flex items-center gap-[2px] cursor-pointer"
                    data-value={option.value}
                    style={option.newLine ? { gridColumn: '1 / -1' } : undefined}
                >
                    <Radio checked={value === option.value} name={name} onCheckedChange={() => onChange(option.value)} />
                    <OptionContent option={option} />
                </label>
            ))}
        </div>
    );
};

interface WiredIconCheckboxGroupProps {
    options: readonly WiredIconRadioOption[];
    isChecked: (value: number) => boolean;
    onChange: (value: number, checked: boolean) => void;
    columns?: number;
}

/** An official `createCheckboxGroup(options, null, columns)`. */
export const WiredIconCheckboxGroup: FC<WiredIconCheckboxGroupProps> = (props) => {
    const { options, isChecked, onChange, columns = 4 } = props;

    return (
        <div className="grid gap-x-2 gap-y-1 w-fit" style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
            {options.map((option) => (
                <label key={option.value} className="flex items-center gap-[2px] cursor-pointer" data-value={option.value}>
                    <Checkbox checked={isChecked(option.value)} onCheckedChange={(checked) => onChange(option.value, checked)} />
                    <OptionContent option={option} />
                </label>
            ))}
        </div>
    );
};
