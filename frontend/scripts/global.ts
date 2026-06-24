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
    async make_api_call<R>(type: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", endpoint: string, data?: Object | Array<any>, headers?: { [key: string]: string }, can_redirect: boolean = true): Promise<{ message: string, error: boolean, payload?: R } | undefined> {
        try {
            const base = `${location.protocol}//${location.host}`;
            const result = await fetch(`${base}/api${endpoint}`, {
                method: type,
                cache: "reload",
                headers: {
                    "Accept": "application/json",
                    "Authorization": jwt.get(),
                    ...(data && { "Content-Type": "application/json" }),
                    ...headers
                },
                ...(data && { body: JSON.stringify(data) })
            });

            const response_data: { message: string, error: boolean, payload?: R } = await result.json();

            if (can_redirect && result.status == 401) {
                window.location.href = "/login";
                return undefined;
            }

            return response_data;
        } catch (_) {
            return undefined;            
        }
    },
    async make_api_call_raw<R>(type: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", endpoint: string, data?: Object | Array<any>, headers?: { [key: string]: string }): Promise<R | undefined> {
        try {
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
    
            return result as R;
        } catch (_) {
            return undefined;            
        }
    },
    get_api_url() {
        return `${location.protocol}//${location.host}/api`;
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
        return result?.payload?.valid ?? false;
    },
    async set_version(): Promise<void> {
        const result = await util.make_api_call<{ ui: string, api: string, proxy: { yuno: string } }>("GET", "/version");
        element.get<HTMLDivElement>("ver").innerText = result!.payload!.ui;
    }
};

const component = {
    async set_pfp() {
        const result = await util.make_api_call<{ user: { username: string, uuid: number } }>("GET", "/account/public/me");
        element.get<HTMLImageElement>("i#pfp").src = `/files/pfp/${result!.payload!.user.uuid}`;
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