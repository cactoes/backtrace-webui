import { element, util, component } from "./global.js";

async function load_video(name: string, episode: string, id: string, quality: string) {
    element.get<HTMLElement>("show_list").classList.add("hide");
    element.get<HTMLElement>("video_container").classList.remove("hide");

    const video_name = element.get<HTMLHeadElement>("vc_title");
    video_name.textContent = `${name} - ${episode}`;

    const video_element = document.querySelector("#video_container>video") as HTMLVideoElement;
    video_element.replaceChildren();

    const subs_data = await util.make_api_call_raw<Response>("GET", `/subs/${id}`);
    const subs_blob = await subs_data!.blob();
    const subs_url = URL.createObjectURL(subs_blob);

    const source = document.createElement("source");
    source.type = "video/mp4";
    source.src = `/api/video/${id}/${quality}`;

    const track = document.createElement("track");
    track.kind = "subtitles";
    track.srclang = "en";
    track.label = "English";
    track.default = true;
    track.src = subs_url;

    video_element.appendChild(source);
    video_element.appendChild(track);
}

// @ts-ignore
async function main() {
    await util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    util.set_version();
    component.set_pfp();

    const all_shows = await util.make_api_call<{ [key: string]: video_meta_entry_t }>("GET", "/shows");
    const show_info = all_shows!.payload!;

    const url = new URL(window.location.href);
    const preload_show = url.searchParams.get("s");
    const preload_episode = url.searchParams.get("h");
    const preload_quality = url.searchParams.get("q");

    if (preload_show && preload_episode && preload_quality) {
        const episode = show_info[preload_show]?.episodes.find(v => v.hash == preload_episode);
        if (episode && [ "1080p", "720p", "480p" ].includes(preload_quality)) {
            load_video(preload_show, episode.name, episode.hash, preload_quality);
            return;
        }
    }

    for (const show_name of Object.keys(show_info)) {
        const container = document.createElement("li");

        const name = document.createElement("p");
        name.textContent = show_name;
        container.appendChild(name);

        const episode_list = document.createElement("ul");

        for (const episode of show_info[show_name].episodes) {
            const episode_entry = document.createElement("li");

            const span = document.createElement("span");
            span.textContent = episode.name;
            episode_entry.appendChild(span);
            // episode_entry.textContent = episode.name;

            const _1080p = document.createElement("p");
            _1080p.textContent = "1080p";
            _1080p.onclick = () => {
                window.location.search = "?h=" + episode.hash + "&s=" + show_name + "&q=" + "1080p";
            }
            episode_entry.appendChild(_1080p);
            const _720p = document.createElement("p");
            _720p.textContent = "720p";
            _720p.onclick = () => {
                window.location.search = "?h=" + episode.hash + "&s=" + show_name + "&q=" + "720p";
            }
            episode_entry.appendChild(_720p);
            const _480p = document.createElement("p");
            _480p.textContent = "480p";
            _480p.onclick = () => {
                window.location.search = "?h=" + episode.hash + "&s=" + show_name + "&q=" + "480p";
            }
            episode_entry.appendChild(_480p);

            // episode_entry.onclick = () => {
            //     window.location.search = "?h=" + episode.hash + "&s=" + show_name + "&q=" + quality;
            // }
            episode_list.appendChild(episode_entry);
        }

        container.appendChild(episode_list);

        element.get("show_list").appendChild(container);
    }
}

window.addEventListener("DOMContentLoaded", main);