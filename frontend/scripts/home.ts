// @ts-ignore
async function main() {
    await util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    component.set_pfp();
    component.set_version();
    component.set_clock();

    const _lists = await util.make_api_call<{ message: string, success: boolean, data: { anime: instance_object_t[], manga: instance_object_t[] } }>("GET", "/lists");

    if (!_lists || _lists.error) {
        element.get<HTMLHeadingElement>("il#anime").innerText = `N/A`;
        element.get<HTMLHeadingElement>("il#manga").innerText = `N/A`;
    } else {
        element.get<HTMLHeadingElement>("il#anime").innerText = `${_lists.payload!.data.anime.length}`;
        element.get<HTMLHeadingElement>("il#manga").innerText = `${_lists.payload!.data.manga.length}`;
    }

    const _services = await util.make_api_call<[string, boolean][]>("GET", "/services/list");
    if (!_services || _services.error) {
        element.get<HTMLHeadingElement>("il#services").innerText = `N/A`;
    } else {
        element.get<HTMLHeadingElement>("il#services").innerText = `${_services.payload!.filter((r) => r[1]).length}`;
    }

    const _shows = await util.make_api_call<{ [key: string]: video_meta_entry_t }>("GET", "/shows");
    if (!_shows || _shows.error) {
        element.get<HTMLHeadingElement>("il#shows").innerText = `N/A`;
        element.get<HTMLHeadingElement>("il#episodes").innerText = `N/A`;
    } else {
        element.get<HTMLHeadingElement>("il#shows").innerText = `${Object.keys(_shows.payload!).length}`;
        let episode_count = 0;
        for (const show_name of Object.keys(_shows.payload!)) {
            episode_count += _shows.payload![show_name].episodes.length;
        }
        element.get<HTMLHeadingElement>("il#episodes").innerText = `${episode_count}`;
    }
}

window.addEventListener("DOMContentLoaded", main);