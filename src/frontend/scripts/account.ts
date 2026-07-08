import { util, component, element, jwt } from "./global.js";

// TODO @since 18/09/2025 -- 14:43
// refactor

interface account_update_t {
    description?: string;
    website?: string;
    location?: string;
    company?: string;
}

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

function render_permissions(mask: number) {
    const container = element.get<HTMLDivElement>("permissions");
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

function bind_autosave_field(id: string, key: keyof account_update_t) {
    const el = element.get<HTMLInputElement | HTMLTextAreaElement>(id);
    let original = el.value;

    el.addEventListener("blur", async () => {
        const value = el.value.trim();
        if (value === original) return;

        const payload: account_update_t = { [key]: value };

        const res = await util.make_api_call<{}>("POST", "/account/update", payload);

        if (!res?.error) {
            original = value;
            el.classList.add("saved");
            setTimeout(() => el.classList.remove("saved"), 800);
        } else {
            el.value = original;
        }
    });
}

async function main() {
    util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    component.set_pfp();
    
    element.link("file", {
        change: () => {
            const file_data: File = element.get<HTMLInputElement>("file").files![0];
            const is_file_too_big = file_data.size > 1 * 1024 * 1014;
    
            if (is_file_too_big)
                element.get<HTMLParagraphElement>("fu#label").classList.add("error");
            else
                element.get<HTMLParagraphElement>("fu#label").classList.remove("error");
    
            element.get<HTMLParagraphElement>("file_stats").innerHTML = `${file_data.name}; ${Math.round(file_data.size / 1024)} kb; ${is_file_too_big ? "Image too large!" : ""}`;
        }
    });
    
    element.link("btn", {
        click: async () => {
            const input = document.getElementById("file") as HTMLInputElement;
            if (!input!.files?.length) return;
    
            const form = new FormData();
            form.append("image", input.files[0]);
    
            const res = await fetch(`${util.get_api_url()}/account/upload/pfp`, {
                method: "POST",
                headers: {
                    "Authorization": jwt.get(),
                },
                body: form,
            });
    
            const text = await res.json();
            if (text.error)
                element.get<HTMLParagraphElement>("fu#label").classList.add("error");
        }
    })

    const account_me = await util.make_api_call<{ user: { username: string, uuid: number, permissions: number, created_at: number, description: string, website: string, location: string, company: string } }>("GET", "/account/public/me");
    if (!account_me || !account_me.payload || account_me.error)
        return;

    const uuid_el = element.get<HTMLDivElement>("ci#uuid");
    const uuid_text_el = uuid_el.querySelector<HTMLSpanElement>(".uuid-text")!;
    const uuid_icon_el = uuid_el.querySelector<HTMLElement>("i")!;

    uuid_text_el.innerText = `${account_me.payload.user.uuid}`;

    uuid_el.onclick = () => {
        navigator.clipboard.writeText(`${account_me.payload!.user.uuid}`).then(() => {
            uuid_el.classList.add("copied");
            uuid_icon_el.className = "fa-solid fa-check";
            setTimeout(() => {
                uuid_el.classList.remove("copied");
                uuid_icon_el.className = "fa-regular fa-copy";
            }, 1000);
        });
    };

    element.get<HTMLTextAreaElement>("ci#description").value = account_me.payload.user.description ?? "";
    element.get<HTMLInputElement>("ci#website").value = account_me.payload.user.website ?? "";
    element.get<HTMLInputElement>("ci#location").value = account_me.payload.user.location ?? "";
    element.get<HTMLInputElement>("ci#company").value = account_me.payload.user.company ?? "";

    bind_autosave_field("ci#description", "description");
    bind_autosave_field("ci#website", "website");
    bind_autosave_field("ci#location", "location");
    bind_autosave_field("ci#company", "company");

    render_permissions(account_me.payload.user.permissions);
}


document.addEventListener("DOMContentLoaded", main);