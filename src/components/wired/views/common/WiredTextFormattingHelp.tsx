import { FC, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WIRED_TEXT_MESSAGE_MAX_LENGTH = 512;

export const getWiredTextLineCount = (value: string) => {
    if (!value.length) return 0;

    return value.replace(/\r/g, '').split('\n').length;
};

/** Our text counter (the official editor has none): "N lines - n/max characters", or with a line limit "N/max lines - ...". */
export const formatWiredTextCounter = (lines: number, count: number, limit: number, maxLines: number | null = null) =>
    maxLines === null
        ? localizeWithFallback('wiredfurni.params.text_counter', `${lines} lines - ${count}/${limit} characters`, ['lines', 'count', 'limit'], [String(lines), String(count), String(limit)])
        : localizeWithFallback(
              'wiredfurni.params.text_counter.lines_limit',
              `${lines}/${maxLines} lines - ${count}/${limit} characters`,
              ['lines', 'max_lines', 'count', 'limit'],
              [String(lines), String(maxLines), String(count), String(limit)]
          );

interface WiredTextCounterProps {
    value: string;
    maxLength?: number;
}

export const WiredTextCounter: FC<WiredTextCounterProps> = (props) => {
    const { value = '', maxLength = WIRED_TEXT_MESSAGE_MAX_LENGTH } = props;

    return <Text small>{formatWiredTextCounter(getWiredTextLineCount(value), value.length, maxLength)}</Text>;
};

export const WiredTextFormattingHelp: FC<{}> = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1 rounded bg-black/5 p-1 text-[11px] leading-[14px]">
                <BaseButton className="w-full text-left" type="button" onClick={() => setIsOpen((value) => !value)}>
                    <Text small bold>
                        {isOpen ? 'Hide format examples' : 'Show format examples'}
                    </Text>
                </BaseButton>
                {isOpen && (
                    <>
                        <Text small>
                            <span className="font-bold">[b]Example Bold[/b]</span>
                            <span> - </span>
                            <span className="italic">[i]Example Italic[/i]</span>
                            <span> - </span>
                            <span className="underline">[u]Example Underline[/u]</span>
                        </Text>
                        <Text small>
                            <span style={{ color: '#008000' }}>[green]Example Green[/green]</span>
                            <span> - </span>
                            <span style={{ color: '#008b8b' }}>[cyan]Example Cyan[/cyan]</span>
                            <span> - </span>
                            <span style={{ color: '#d60000' }}>[red]Example Red[/red]</span>
                            <span> - </span>
                            <span style={{ color: '#005dff' }}>[blue]Example Blue[/blue]</span>
                            <span> - </span>
                            <span style={{ color: '#7d31b8' }}>[purple]Example Purple[/purple]</span>
                        </Text>
                    </>
                )}
            </div>
        </NativeTextTree>
    );
};
