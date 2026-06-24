//==========================================
/// @file       minfier.ts
/// @brief      minifies js & css in frontend (for prod)
//==========================================

import { minify, type MinifyOptions } from "terser";
import * as path from "path";
import * as fs from "fs";

const terser_config: MinifyOptions = {
    compress: {
        dead_code: true,
        drop_debugger: true,
        keep_fargs: true,
    },
    mangle: {
        toplevel: false
    },
    output: {
        comments: false
    }
};

const terser_config_debug: MinifyOptions = {
    compress: {
        dead_code: true,
        drop_debugger: true,
        keep_fargs: true,
        reduce_funcs: false,
        reduce_vars: false
    },
    mangle: false,
    output: {
        comments: false
    }
};

function minify_css(data: string): string {
    return data
        // comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // whitespace before and after characters
        .replace(/\s*([{}:;,])\s*/g, '$1')
        // whitespace between selectors
        .replace(/\s*([^\{\};]+)\s*\{\s*([^\{\}]+)\s*\}/g, '$1{$2}')
        // whitespace between property-value pairs
        .replace(/\s*([^:;]+)\s*:\s*([^;]+)\s*;/g, '$1:$2;');
}

class timer {
    private m_start: number = 0;
    private m_end: number = 0;

    constructor() {}

    public start(): void {
        this.m_start = performance.now();
    }

    public stop(): void {
        this.m_end = performance.now();
    }

    public get time_ms(): number {
        return Math.round((this.m_end - this.m_start) * 10) / 10;
    }

    public static async timed(func: () => void | Promise<void>): Promise<timer> {
        const _timer = new timer();
        _timer.start();
        await func();
        _timer.stop();
        return _timer;
    }

    public static started(): timer {
        const _timer = new timer();
        _timer.start();
        return _timer;
    }
};

async function filter_files(_path: string, filter: (filename: string) => boolean, callback: (data: string, filename: string, buffer: Uint8Array) => Promise<void>) {
    const files = fs.readdirSync(_path).filter(filter);

    await Promise.all(files.map(async (_file_name) => {
        const _file_data = Bun.file(path.join(_path, _file_name));
        await callback(await _file_data.text(), _file_name, await _file_data.bytes());
    }));
}

async function main(argc: number, argv: string[]): Promise<number> {
    // if (argc != 3 || !["--debug", "--release"].includes(argv[2]!)) {
    //     console.log(`[core_compiler] no valid config given`);
    //     return -1;
    // }

    const frontend_base_path = path.join(__dirname, "frontend");
    const scripts_path = path.join(frontend_base_path, "scripts/js");
    const styles_path = path.join(frontend_base_path, "styles");
    
    const js_minify_timer = timer.started();

    for (const file of fs.readdirSync(scripts_path)) {
        if (file.endsWith(".min.js") || !file.endsWith(".js"))
            continue;

        
        const script = await Bun.file(path.join(scripts_path, file)).text();
        const script_min = await minify(script, terser_config);
        
        Bun.file(path.join(scripts_path, file.replace(".js", ".min.js"))).write(script_min.code!);
    }

    
    js_minify_timer.stop();
    
    const css_minify_timer = timer.started();

    const style_files = [];

    for (const file of fs.readdirSync(styles_path)) {
        if (file.endsWith(".min.css") || !file.endsWith(".css"))
            continue;

        style_files.push({ filename: file, data: undefined });
    }

    for (const file of fs.readdirSync(styles_path)) {
        if (file.endsWith(".min.css") || !file.endsWith(".css"))
            continue;
        
        let style = await Bun.file(path.join(styles_path, file)).text();

        const imports = style.split("\n").filter(a => a.startsWith("@import url"))
        .map(p => {
            const begin = p.indexOf("/", p.indexOf("/") + 1) + 1;
            const end = p.lastIndexOf("\"");
            return [p.slice(begin, end), p];
        })
        .filter(a => style_files.find(b => b.filename == a[0]));

        for (const [filename, target] of imports) {
            const remote_file = await Bun.file(path.join(styles_path, filename)).text();
            style = style.replace(target, remote_file);
        }

        const style_min = minify_css(style);
        
        Bun.file(path.join(styles_path, "build/", file.replace(".css", ".min.css"))).write(style_min);
    }

    css_minify_timer.stop();

    console.log("minified:");
    console.log(`js:    ${js_minify_timer.time_ms}ms`);
    console.log(`css:   ${css_minify_timer.time_ms}ms`);

    return 0;
}

process.exit(await main(process.argv.length, process.argv));