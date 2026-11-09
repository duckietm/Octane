import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('interface scrollbar theme', () => {
    const cssRoot = join(process.cwd(), 'src');

    const cssFiles = (directory: string): string[] =>
        readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
            const path = join(directory, entry.name);

            if (entry.isDirectory()) return cssFiles(path);

            return entry.isFile() && entry.name.endsWith('.css') ? [path] : [];
        });

    it('is enabled globally with compact control dimensions', () => {
        const entry = readFileSync(join(process.cwd(), 'src/index.tsx'), 'utf8');
        const css = readFileSync(join(process.cwd(), 'src/css/common/ClassicScrollbar.css'), 'utf8');
        const rootRule = css.match(/\.has-classic-scrollbar\s*\{([^}]+)\}/)?.[1] ?? '';
        const scrollbar = css.match(/\.has-classic-scrollbar \*::\-webkit-scrollbar,([\s\S]*?)\{([^}]+)\}/)?.[2] ?? '';
        const thumb = css.match(/\.has-classic-scrollbar \*::\-webkit-scrollbar-thumb:vertical,([\s\S]*?)\{([^}]+)\}/)?.[2] ?? '';
        const upButton = css.match(/\.has-classic-scrollbar \*::\-webkit-scrollbar-button:single-button:vertical:decrement,([\s\S]*?)\{([^}]+)\}/)?.[2] ?? '';

        expect(entry).toContain("document.documentElement.classList.add('has-classic-scrollbar')");
        expect(rootRule).toContain('scrollbar-color: auto');
        expect(css).toMatch(/@supports not selector\(::\-webkit-scrollbar\)[\s\S]*scrollbar-color:\s*#d9d9d9 #bdbbb3/);
        expect(scrollbar).toContain('width: 17px');
        expect(scrollbar).toContain('height: 17px');
        expect(thumb).toContain('min-height: 12px');
        expect(upButton).toContain('width: 17px');
        expect(upButton).toContain('height: 16px');
    });

    it('is the final interface stylesheet and has no competing global scrollbar theme', () => {
        const entry = readFileSync(join(process.cwd(), 'src/index.tsx'), 'utf8');
        const skin = readFileSync(join(process.cwd(), 'src/css/habbo/HabboSkin.css'), 'utf8');
        const stylesheetImports = [...entry.matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);

        expect(stylesheetImports.at(-1)).toBe('./css/common/ClassicScrollbar.css');
        expect(skin).not.toContain('::-webkit-scrollbar');
    });

    it('is the only stylesheet that visually themes native scrollbars', () => {
        const themePath = join(cssRoot, 'css/common/ClassicScrollbar.css');
        const competingFiles = cssFiles(cssRoot)
            .filter((path) => path !== themePath)
            .filter((path) => {
                const css = readFileSync(path, 'utf8');
                const webkitRules = [...css.matchAll(/::\-webkit-scrollbar[^\{]*\{([^}]*)\}/g)];
                const hasVisibleWebkitTheme = webkitRules.some(([, declarations]) => {
                    const normalized = declarations.replace(/\/\*[\s\S]*?\*\//g, '').trim();

                    if (/display\s*:\s*none/i.test(normalized)) return false;
                    if (/(?:width|height)\s*:\s*0(?:px|rem|em|%)?\b/i.test(normalized)) return false;

                    return /(?:background|border|box-shadow|width|height)\s*:/i.test(normalized);
                });
                const hasVisibleFirefoxTheme = /scrollbar-color\s*:|scrollbar-width\s*:\s*(?:auto|thin)/i.test(css);

                return hasVisibleWebkitTheme || hasVisibleFirefoxTheme;
            })
            .map((path) => path.slice(cssRoot.length + 1).replaceAll('\\', '/'));

        expect(competingFiles).toEqual([]);
    });

    it('keeps hidden-scrollbar exceptions centralized and limited to custom controls', () => {
        const allowedFiles = new Set(['css/common/ClassicScrollbar.css', 'css/toolbar/ToolBar.css']);
        const filesWithHiddenNativeScrollbars = cssFiles(cssRoot)
            .filter((path) => {
                const relativePath = path.slice(cssRoot.length + 1).replaceAll('\\', '/');
                if (allowedFiles.has(relativePath)) return false;

                const css = readFileSync(path, 'utf8');
                const hidesFirefoxScrollbar = /scrollbar-width\s*:\s*none/i.test(css);
                const hidesWebkitScrollbar = [...css.matchAll(/::\-webkit-scrollbar[^\{]*\{([^}]*)\}/g)].some(([, declarations]) =>
                    /display\s*:\s*none|(?:width|height)\s*:\s*0(?:px|rem|em|%)?\b/i.test(declarations)
                );

                return hidesFirefoxScrollbar || hidesWebkitScrollbar;
            })
            .map((path) => path.slice(cssRoot.length + 1).replaceAll('\\', '/'));

        expect(filesWithHiddenNativeScrollbars).toEqual([]);
    });
});
