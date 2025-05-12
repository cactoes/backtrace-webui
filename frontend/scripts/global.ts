function link_component<R extends HTMLElement, K extends keyof HTMLElementEventMap>(target: string, events: { [E in K]: (this: HTMLElement, e: HTMLElementEventMap[E]) => any } ): R {
    const target_element = get_element<R>(target);

    for (const event of Object.keys(events) as K[])
        target_element.addEventListener(event, events[event]);

    return target_element;
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

async function make_api_call<R>(type: "GET" | "POST" | "PATCH" | "PUT", endpoint: string, data?: Object | Array<any>, headers?: { [key: string]: string }): Promise<{ message: string, error: boolean, payload?: R }> {
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

    window.location.pathname.split("/").filter(Boolean).forEach(segment => {
        const p = document.createElement("p");
        p.innerHTML = `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`;
        nav_element.appendChild(p);

        const slice = document.createElement("div");
        slice.className = "slice";
        slice.innerText = "/";
        nav_element.appendChild(slice);
    });

    nav_element.removeChild(nav_element.lastChild!);

    (nav_element.firstElementChild as HTMLParagraphElement).addEventListener("click", () => {
        window.location.href = "/";
    });
}

async function setup_sidebar() {
    const result = await make_api_call<{ user: { username: string, uuid: number } }>("GET", "/account/public/me");
    const url = window.location.pathname.split("/").filter(Boolean)[0];

    const sidebar = document.querySelector(".sidebar")!;
    sidebar.innerHTML = `<div class="sidebar">
            <div class="section1">
                <div class="image"><img src="/files/pfp/${result.payload!.user.uuid}"></div>
                <div class="details">
                    <!-- // TODO @since 01/05/2025 -- 20:49
                         // add skeleton loaders -->
                    <h3>${result.payload!.user.username}</h3>
                    <p>${result.payload!.user.uuid}</p>
                </div>
            </div>
            <div id="sidebar" class="section2">
                <button id="button#sidebar#home" class="button ${url == "home" ? "active" : ""}"><i class="fa-solid fa-house"></i>Home</button>
                <button id="button#sidebar#profile" class="button ${url == "profile" ? "active" : ""}"><i class="fa-solid fa-user"></i>Profile</button>
                <button id="button#sidebar#passwords" class="button ${url == "passwords" ? "active" : ""}"><i class="fa-solid fa-lock"></i>Passwords</button>
                <button id="button#sidebar#lists" class="button ${url == "lists" ? "active" : ""}"><i class="fa-solid fa-list"></i>Lists</button>
            </div>
        </div>`
    
    update_router();

    document.getElementById("sidebar")!.querySelectorAll("button").forEach(button => {
        link_component(button.id, {
            click: () => {
                window.location.href = `${button.id.split("#").at(-1)}`
            }
        });
    });
}