import { util, component, element, jwt } from "./global.js";

// TODO @since 18/09/2025 -- 14:43
// refactor

// @ts-ignore
async function main() {
    util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    util.set_version();
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

    const account_me = await util.make_api_call<{ user: { username: string, uuid: number } }>("GET", "/account/public/me");
    if (!account_me || !account_me.payload || account_me.error)
        return;

    element.get<HTMLInputElement>("ci#uuid").value = `${account_me.payload.user.uuid}`;
}


document.addEventListener("DOMContentLoaded", main);