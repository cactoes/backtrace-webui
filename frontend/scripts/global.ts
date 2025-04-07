function link_component<K extends keyof HTMLElementEventMap>(target: string, events: { [E in K]: (this: HTMLElement, e: HTMLElementEventMap[E]) => any } ): void {
    const target_element = document.getElementById(target);
    if (!target_element)
        return;

    for (const event of Object.keys(events) as K[]) {
        target_element.addEventListener(event, events[event]);
    }
}

function get_jwt() {
    return window.localStorage.getItem("token") || "";
}

async function api_call() {
    // const url = `${window.location.origin}`;
    const url = `${window.location.protocol}//${window.location.host}`;
    const res = await fetch(`${url}/api/account`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: get_jwt() })
    });

    console.log(await res.json())
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
} update_router();

document.getElementById("sidebar")!.querySelectorAll("button").forEach(button => {
    link_component(button.id, {
        click: () => {
            window.location.href = `${button.id.split("#").at(-1)}`
        }
    });
});