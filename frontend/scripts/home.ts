util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
util.set_version();
component.set_pfp();

document.querySelectorAll("div.item").forEach(item_element => {
    element.link(item_element.id, {
        click: () => router.to(`/${item_element.getAttribute("link") || "home"}`)
    });
});

// @ts-ignore
async function main() {
    const _lists = await util.make_api_call<{ message: string, success: boolean, data: { anime: instance_object_t[], manga: instance_object_t[] } }>("GET", "/lists");
    element.get<HTMLHeadingElement>("il#anime").innerText = `${_lists.payload!.data.anime.length}`;
    element.get<HTMLHeadingElement>("il#manga").innerText = `${_lists.payload!.data.manga.length}`;
}

window.addEventListener("DOMContentLoaded", main);