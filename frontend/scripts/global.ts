function link_component<K extends keyof HTMLElementEventMap>(target: string, events: { [E in K]: (this: HTMLElement, e: HTMLElementEventMap[E]) => any } ): void {
    const target_element = document.getElementById(target);
    if (!target_element)
        return;

    for (const event of Object.keys(events) as K[]) {
        target_element.addEventListener(event, events[event]);
    }
}

function make_interval(fn: () => void, ms: number): void {
    fn();
    setInterval(fn, ms);
}

function canvas_render_loop(fn: (delta_time: number) => void) {
    let lastTime = Date.now();

    const render_function = () => {
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        fn(deltaTime);
        lastTime = currentTime;
        window.requestAnimationFrame(render_function);
    }

    render_function();
}

function get_jwt() {
    return window.localStorage.getItem("token") || "";
}

function set_jwt(jwt: string) {
    window.localStorage.setItem("token", jwt);
}

function get_element<T extends HTMLElement>(elementid: string) {
    return (document.getElementById(elementid) as T);
}

async function make_api_call<R>(type: "GET" | "POST", endpoint: string, data?: Object | Array<any>, headers?: { [key: string]: string }): Promise<{ message: string, error: boolean, payload?: R }> {
    const base = `${location.protocol}//${location.host}`;
    const result = await fetch(`${base}/api${endpoint}`, {
        method: type,
        cache: "reload",
        headers: {
            "Accept": "application/json",
            "Authorization": get_jwt(),
            ...(type != "GET" && { "Content-Type": "application/json" }),
            ...headers
        },
        ...(type != "GET" && { body: JSON.stringify(data) })
    });

    return await result.json();
}

async function sha256(message: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function check_logged_in(): Promise<boolean> {
    const result = await make_api_call<{ valid: boolean }>("POST", "/account/check/token", { token: get_jwt() });
    return result.payload?.valid ?? false;
}

function update_router() {
    const nav_element = document.getElementById("navigation")!;

    location.pathname.split("/").filter(Boolean).forEach(segment => {
        const p = document.createElement("p");
        p.innerHTML = `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`;
        nav_element.appendChild(p);

        const slice = document.createElement("div");
        slice.className = "slice";
        nav_element.appendChild(slice);
    });

    nav_element.removeChild(nav_element.lastChild!);
}

async function setup_sidebar() {
    const user_element = get_element<HTMLHeadingElement>("user#username");
    const uuid_element = get_element<HTMLParagraphElement>("user#uuid");
    const pfp_element = get_element<HTMLImageElement>("user#pfp");

    const result = await make_api_call<{ user: { username: string, uuid: number } }>("GET", "/account/public/me");
    user_element.innerText = result.payload!.user.username;
    uuid_element.innerText = `${result.payload!.user.uuid}`;
    
    update_router();

    pfp_element.src = `/files/pfp/${result.payload!.user.uuid}`;

    document.getElementById("sidebar")!.querySelectorAll("button").forEach(button => {
        link_component(button.id, {
            click: () => {
                window.location.href = `${button.id.split("#").at(-1)}`
            }
        });
    });
}