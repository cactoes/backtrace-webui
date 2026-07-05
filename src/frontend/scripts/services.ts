import { util, component } from "./global.js";

async function main(): Promise<void> {
    util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    component.set_pfp();
    component.set_version();
    component.set_clock();

    const services = await util.make_api_call<[string, [boolean, string]][]>("GET", "/services/list");

    if (!services || !services.payload)
        return;

    document
        .querySelectorAll("div.item")
        .forEach((element) => {
            element.querySelector("div>i.status")!.classList.remove("waiting");
            element.querySelector("div>i.status")!.classList.add("offline");

            const service = element.getAttribute("service");
            if (!service)
                return;

            const service_data = services.payload?.find(v => v[0] == service);
            if (!service_data)
                return;

            const is_online = service_data[1][0];
            const version = service_data[1][1];

            if (is_online) {
                element.querySelector("div>i.status")!.classList.remove("offline");
                element.querySelector("div>i.status")!.classList.add("online");
            }

            if (version)
                element.querySelector(".version")!.innerHTML = `v${version}`;
        });
}

window.addEventListener("DOMContentLoaded", main);