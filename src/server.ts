#!/usr/bin/env node
import * as webui_controller from "controllers/webui";

// function get_keys<T extends object>(obj: T): (keyof T)[] {
//     return Object.keys(obj) as (keyof T)[];
// }

function unused_params(...args: any[]): void { args; }

async function create_html_file_response(filename: string): Promise<Response> {
    return new Response(await Bun.file(`frontend/${filename}.html`).bytes(), {
        headers: {
            "Content-Type": "text/html"
        }
    });
}

Bun.serve({
    port: 8000,
    routes: {
        "/js/:script": () => new Response("script"),
        "/css/:style": () => new Response("stylesheet"),
        
        "/api/*": () => new Response("api"),

        "/*": () => create_html_file_response("404")
    },
});