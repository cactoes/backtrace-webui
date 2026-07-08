import { component, util, element } from "./global.js";

enum permissions_t {
    ANIME_LISTS = 1 << 0,
    PASSWORD_MANAGER = 1 << 1,
    STREAMING = 1 << 2,
    SERVICE_LIST = 1 << 3,
}

const permission_meta: Record<permissions_t, { name: string; icon: string }> = {
    [permissions_t.ANIME_LISTS]: { name: "Anime / Manga Lists", icon: "fa-solid fa-database" },
    [permissions_t.PASSWORD_MANAGER]: { name: "Password Manager", icon: "fa-solid fa-shield-halved" },
    [permissions_t.STREAMING]: { name: "Streaming", icon: "fa-solid fa-clapperboard" },
    [permissions_t.SERVICE_LIST]: { name: "Service List", icon: "fa-solid fa-server" },
};

interface profile_t {
    username: string;
    uuid: string;
    created_at: number;
    description?: string;
    website?: string;
    location?: string;
    company?: string;
    permissions: number;
}

function format_joined(date_str: number) {
    const d = new Date(date_str);
    return d.toLocaleDateString("en-UK", { month: "long", year: "numeric" });
}

function render_meta(profile: profile_t) {
    const container = element.get<HTMLDivElement>("p#meta");
    container.innerHTML = "";

    const rows: { icon: string; value?: string; is_link?: boolean }[] = [
        { icon: "fa-solid fa-link", value: profile.website, is_link: true },
        { icon: "fa-solid fa-location-dot", value: profile.location },
        { icon: "fa-solid fa-building", value: profile.company },
    ];

    for (const row of rows) {
        const div = document.createElement("div");
        div.className = `meta-item${row.value ? "" : " empty"}`;

        const icon = document.createElement("i");
        icon.className = row.icon;
        div.appendChild(icon);

        if (row.value && row.is_link) {
            const a = document.createElement("a");
            a.href = row.value;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.innerText = row.value.replace(/^https?:\/\//, "");
            div.appendChild(a);
        } else {
            const span = document.createElement("span");
            span.innerText = row.value ?? "Not set";
            div.appendChild(span);
        }

        container.appendChild(div);
    }
}

function render_services(mask: number) {
    const container = element.get<HTMLDivElement>("p#services");
    container.innerHTML = "";

    for (const key of Object.values(permissions_t).filter(v => typeof v === "number") as permissions_t[]) {
        const granted = (mask & key) !== 0;
        const meta = permission_meta[key];

        const row = document.createElement("div");
        row.className = `perm${granted ? " granted" : ""}`;

        const icon = document.createElement("div");
        icon.className = "perm-icon";
        icon.innerHTML = `<i class="${meta.icon}"></i>`;

        const body = document.createElement("div");
        body.className = "perm-body";
        const name = document.createElement("p");
        name.className = "perm-name";
        name.innerText = meta.name;
        const status = document.createElement("p");
        status.className = "perm-status";
        status.innerText = granted ? "granted" : "restricted";
        body.appendChild(name);
        body.appendChild(status);

        row.appendChild(icon);
        row.appendChild(body);
        container.appendChild(row);
    }
}

function populate_profile(profile: profile_t) {
    const pfp_img = element.get<HTMLImageElement>("p#pfp");
    const pfp_placeholder = element.get<HTMLElement>("p#pfp-placeholder");

    pfp_img.onload = () => {
        pfp_img.style.display = "block";
        pfp_placeholder.style.display = "none";
    };
    pfp_img.onerror = () => {
        pfp_img.style.display = "none";
        pfp_placeholder.style.display = "flex";
    };
    pfp_img.src = `/files/pfp/${profile.uuid}`;

    element.get<HTMLHeadingElement>("p#username").innerText = profile.username;
    element.get<HTMLParagraphElement>("p#description").innerText = profile.description ? profile.description : "Not set";
    element.get<HTMLSpanElement>("p#joined").innerText = format_joined(profile.created_at);

    const uuid_el = element.get<HTMLDivElement>("p#uuid");
    const uuid_text_el = uuid_el.querySelector<HTMLSpanElement>(".uuid-text")!;
    const uuid_icon_el = uuid_el.querySelector<HTMLElement>("i")!;

    uuid_text_el.innerText = profile.uuid;

    uuid_el.onclick = () => {
        navigator.clipboard.writeText(profile.uuid).then(() => {
            uuid_el.classList.add("copied");
            uuid_icon_el.className = "fa-solid fa-check";
            setTimeout(() => {
                uuid_el.classList.remove("copied");
                uuid_icon_el.className = "fa-regular fa-copy";
            }, 2000);
        });
    };

    render_meta(profile);
    render_services(profile.permissions);
}

async function main() {
    util.check_logged_in().then(r => {
        if (r) {
            component.set_pfp();
        } else {
            document.querySelector<HTMLElement>(".top-bar>nav")!.style.display = "none";
        }
    });

    const uuid = window.location.pathname.slice("/profile/".length);
    const res = await util.make_api_call<{ user: profile_t }>("GET", `/public/${uuid}`);
    if (res!.error)
        window.location.href = "/404";

    populate_profile(res!.payload!.user);
}

window.addEventListener("DOMContentLoaded", main);