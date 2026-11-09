export interface GiftRecipientLike {
    name: string;
}

export interface GiftWrappingSelection {
    wrapperId: number;
    boxType: number;
    ribbonType: number;
    previewExtraData: string;
}

export const findGiftRecipientMatchIndex = (value: string, query: string): number => {
    const normalizedValue = value.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    try {
        return normalizedValue.search(new RegExp(normalizedQuery));
    } catch {
        // AIR treats the query as a pattern. Keep malformed input usable
        // instead of letting an incomplete expression break the dialog.
        return normalizedValue.indexOf(normalizedQuery);
    }
};

export const getRandomGiftDefaultStuffType = (defaultStuffTypes: number[], random: () => number = Math.random): number => {
    if (!defaultStuffTypes?.length) return 0;

    const index = Math.min(Math.floor(random() * defaultStuffTypes.length), defaultStuffTypes.length - 1);

    return defaultStuffTypes[index];
};

export const wrapGiftSelectionIndex = (index: number, offset: number, length: number): number => {
    if (length <= 0) return 0;

    return (index + offset + length) % length;
};

export const filterGiftRecipients = <T extends GiftRecipientLike>(recipients: T[], query: string): T[] => {
    return recipients.filter((recipient) => findGiftRecipientMatchIndex(recipient.name, query) !== -1).slice(0, 10);
};

export const limitGiftMessageLines = (value: string, maxLines = 5): string => value.split('\n').slice(0, maxLines).join('\n');

/** Flash max_lines counts soft-wrapped rows as well as explicit newlines. */
export const limitGiftMessageToTextarea = (value: string, textarea: HTMLTextAreaElement, maxLines = 5, lineHeight = 16): string => {
    let limitedValue = limitGiftMessageLines(value, maxLines);

    if (!textarea || typeof textarea.scrollHeight !== 'number') return limitedValue;

    const previousHeight = textarea.style.height;

    textarea.style.height = '1px';
    textarea.value = limitedValue;

    while (limitedValue.length && textarea.scrollHeight > maxLines * lineHeight) {
        limitedValue = limitedValue.slice(0, -1);
        textarea.value = limitedValue;
    }

    textarea.style.height = previousHeight;

    return limitedValue;
};

export const resolveGiftWrappingSelection = (
    isDefaultBox: boolean,
    defaultStuffType: number,
    selectedColorId: number,
    selectedBoxType: number,
    selectedRibbonType: number
): GiftWrappingSelection => {
    if (isDefaultBox) {
        return {
            wrapperId: defaultStuffType,
            boxType: 0,
            ribbonType: 0,
            previewExtraData: ''
        };
    }

    return {
        wrapperId: selectedColorId,
        boxType: selectedBoxType,
        ribbonType: selectedRibbonType,
        previewExtraData: (selectedBoxType * 1000 + selectedRibbonType).toString()
    };
};
