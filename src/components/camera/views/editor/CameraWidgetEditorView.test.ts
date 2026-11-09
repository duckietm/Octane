import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CameraWidgetEditorView layout', () => {
    it('keeps the fixed-size editor non-resizable', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/camera/views/editor/CameraWidgetEditorView.tsx'), 'utf8');

        expect(source).toContain('isResizable={false}');
        expect(source).toContain("style={{ resize: 'none' }}");
    });
});
