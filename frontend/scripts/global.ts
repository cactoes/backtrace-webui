const element = {
    get<T extends HTMLElement>(elementid: string) {
        return (document.getElementById(elementid) as T);
    },
    link<R extends HTMLElement, K extends keyof HTMLElementEventMap>(target: string, events: { [E in K]: (this: HTMLElement, e: HTMLElementEventMap[E]) => any } ): R {
        const target_element = element.get<R>(target);
    
        for (const event of Object.keys(events) as K[])
            target_element.addEventListener(event, events[event]);
    
        return target_element;
    },
    toggle_class(target: HTMLElement, _class: string) {
        target.classList.contains(_class)
        ? target.classList.remove(_class)
        : target.classList.add(_class)
    },
    switch_class(target: HTMLElement, classes: [ string, string ]) {
        target.classList.contains(classes[0])
            ? (target.classList.remove(classes[0]), target.classList.add(classes[1]))
            : (target.classList.remove(classes[1]), target.classList.add(classes[0]))
    },
    query_loop<T extends HTMLElement>(query: string, func: (element: T) => void) {
        document.querySelectorAll(query).forEach(e => func(e as T));
    }
};

const jwt = {
    get() {
        return window.localStorage.getItem("token") || "";
    },
    set(jwt: string) {
        window.localStorage.setItem("token", jwt);
    }
};

const util = {
    make_interval(fn: () => void, ms: number): void {
        fn();
        setInterval(fn, ms);
    },
    async sha256(message: string): Promise<string> {
        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
    },
    async make_api_call<R>(type: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", endpoint: string, data?: Object | Array<any>, headers?: { [key: string]: string }): Promise<{ message: string, error: boolean, payload?: R }> {
        const base = `${location.protocol}//${location.host}`;
        const result = await fetch(`${base}/api${endpoint}`, {
            method: type,
            cache: "reload",
            headers: {
                "Accept": "application/json",
                "Authorization": jwt.get(),
                ...(type != "GET" && { "Content-Type": "application/json" }),
                ...headers
            },
            ...(type != "GET" && { body: JSON.stringify(data) })
        });

        return await result.json();
    },
    start_canvas_render_loop(fn: (delta_time: number) => void) {
        let lastTime = Date.now();

        const render_function = () => {
            const currentTime = Date.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            fn(deltaTime);
            lastTime = currentTime;
            window.requestAnimationFrame(render_function);
        }

        render_function();
    },
    async check_logged_in(): Promise<boolean> {
        const result = await util.make_api_call<{ valid: boolean }>("POST", "/account/check/token", { token: jwt.get() });
        return result.payload?.valid ?? false;
    },
    async set_version(): Promise<void> {
        const result = await util.make_api_call<{ ui: string, api: string, proxy: { yuno: string } }>("GET", "/version");
        element.get<HTMLDivElement>("ver").innerText = result.payload!.ui;
    }
};

const component = {
    router: {
        update() {
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
    },
    sidebar: {
        async setup() {
            const result = await util.make_api_call<{ user: { username: string, uuid: number } }>("GET", "/account/public/me");
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
            
            component.router.update();

            document.getElementById("sidebar")!.querySelectorAll("button").forEach(button => {
                element.link(button.id, {
                    click: () => {
                        window.location.href = `${button.id.split("#").at(-1)}`
                    }
                });
            });
        }
    },
    async set_pfp() {
        const result = await util.make_api_call<{ user: { username: string, uuid: number } }>("GET", "/account/public/me");
        element.get<HTMLImageElement>("i#pfp").src = `/files/pfp/${result.payload!.user.uuid}`;
        element.link("i#pfp", {
            click: () => {
                router.to("/account");
            }
        });
    }
};

const router = {
    to(loc: string) {
        window.location.href = loc;
    }
};