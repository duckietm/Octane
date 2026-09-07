import { FC, useEffect, useState } from 'react';
import { Text } from '../../../../common';

interface WiredPlaceholderPreviewProps {
    previewHtml: string;
    previewToken: string;
}

const copyToClipboard = async (value: string) => {
    if (!value) return false;

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);

            return true;
        }
    } catch {}

    try {
        const textArea = document.createElement('textarea');

        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';

        document.body.appendChild(textArea);
        textArea.select();

        const copied = document.execCommand('copy');

        document.body.removeChild(textArea);

        return copied;
    } catch {
        return false;
    }
};

export const WiredPlaceholderPreview: FC<WiredPlaceholderPreviewProps> = (props) => {
    const { previewHtml, previewToken } = props;
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;

        const timeout = window.setTimeout(() => setCopied(false), 1200);

        return () => window.clearTimeout(timeout);
    }, [copied]);

    const handleCopy = async () => {
        const didCopy = await copyToClipboard(previewToken);

        setCopied(didCopy);
    };

    return (
        <button type="button" className={`octane-wired__placeholder-preview ${copied ? 'is-copied' : ''}`} onClick={handleCopy}>
            <Text dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </button>
    );
};
