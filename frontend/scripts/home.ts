// @ts-ignore
async function main() {
    await util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    util.set_version();
    component.set_pfp();

    document.querySelectorAll("div.item").forEach(item_element => {
        element.link(item_element.id, {
            click: () => router.to(`/${item_element.getAttribute("link") || "home"}`)
        });
    });

    const _lists = await util.make_api_call<{ message: string, success: boolean, data: { anime: instance_object_t[], manga: instance_object_t[] } }>("GET", "/lists");
    if (_lists.error) {
        element.get<HTMLHeadingElement>("il#anime").innerText = `N/A`;
        element.get<HTMLHeadingElement>("il#manga").innerText = `N/A`;
    } else {
        element.get<HTMLHeadingElement>("il#anime").innerText = `${_lists.payload!.data.anime.length}`;
        element.get<HTMLHeadingElement>("il#manga").innerText = `${_lists.payload!.data.manga.length}`;
    }

    const _services = await util.make_api_call<[string, boolean][]>("GET", "/services/list");
    console.log(_services);
    if (_services.error) {
        element.get<HTMLHeadingElement>("il#services").innerText = `N/A`;
    } else {
        element.get<HTMLHeadingElement>("il#services").innerText = `${_services.payload!.filter((r) => r[1]).length}`;
    }
}

window.addEventListener("DOMContentLoaded", main);