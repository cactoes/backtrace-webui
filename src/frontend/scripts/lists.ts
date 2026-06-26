import { FuzzySearch } from "./fuzzy_search.js";
import { util, component, element } from "./global.js";

// async function edit_dialogue(obj: instance_object_t[]) {
//     // update dialogue
//     // show dialogue
// }

let lists: { anime: instance_object_t[]; manga: instance_object_t[]; } = {
    anime: [],
    manga: []
}

let filters: number[] = [];
let search: string = "";

function resolve_status(status: instance_object_t["state"]): [string, string] {
    return [
        ["Finished", "finished"],
        ["Watching", "watching"],
        ["Planned", "planned"],
        ["Dropped", "dropped"]
    ][status] as any;
}

function resolve_filter(filter: string) {
    return [ "finished", "watching", "planned", "dropped"].indexOf(filter);
}

function create_list_item(obj: instance_object_t) {
    const [status, status_class] = resolve_status(obj.state);

    const div = document.createElement("div");
    div.className = `item ${status_class}`;
    div.id = obj._id;

    div.onclick = () => {
        element.get<HTMLDivElement>("dialogue").style.display = "flex";
        element.get<HTMLDivElement>("dialogue").setAttribute("data-id", obj._id);
        element.get<HTMLInputElement>("d#name").value = obj.name;
        element.get<HTMLInputElement>("d#note").value = obj.current;
        element.get<HTMLInputElement>("d#state").innerText = resolve_status(obj.state)[0];
        element.get<HTMLInputElement>("d#state").className = resolve_status(obj.state)[1];
    };

    const p1 = document.createElement("p");
    p1.innerText = status;

    const h3 = document.createElement("h3");
    h3.innerText = obj.name;

    const p2 = document.createElement("p");
    p2.innerText = obj.current;

    div.appendChild(p1);
    div.appendChild(h3);
    div.appendChild(p2);

    return div;
}

let sorting = "";
function update_list() {
    const list_selector = window.location.hash.substring(1) as "anime" | "manga";
    let list = lists[list_selector];

    const target = element.get<HTMLDivElement>("list");
    target.innerHTML = "";

    if (search.length != 0) {
        const fuzzy = new FuzzySearch(list, ["name"], {
            caseSensitive: false, sort: true
        });
    
        list = fuzzy.search(search.replace(/\W+/g, ""));
    }

    if (sorting == "alphabetical") {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sorting == "type") {
        list = [...list].sort((a, b) => a.state - b.state);
    } else {
        // list = list;
    }

    for (const item of list) {
        if (!filters.includes(item.state) && filters.length != 0)
            continue

        const div = create_list_item(item);
        target.appendChild(div);
    }
}

// @ts-ignore
async function main() {
    util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    util.set_version();
    component.set_pfp();

    element.query_loop<HTMLParagraphElement>("div.type>p", item_element => {
        element.link(item_element.id, {
            click: () => {
                element.toggle_class(item_element as HTMLElement, "selected");
                item_element.classList.contains("selected")
                    ? filters.push(resolve_filter(item_element.classList[0]))
                    : filters = filters.filter(filter => filter != resolve_filter(item_element.classList[0]));

                update_list();
            }
        });
    });

    element.query_loop<HTMLAnchorElement>("div.selector>a", item_element => {
        element.link(item_element.id, {
            click: () => {
                element.query_loop("div.selector>a", _e => _e.classList.remove("selected"));
                element.toggle_class(item_element as HTMLElement, "selected");
                window.location.hash = `${item_element.id.slice(2)}`;

                update_list();

                let list_selector = window.location.hash.substring(1);

                element.get<HTMLParagraphElement>("ft#finished").innerText = `Finished (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 0).length})`;
                element.get<HTMLParagraphElement>("ft#watching").innerText = `Watching (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 1).length})`;
                element.get<HTMLParagraphElement>("ft#planned").innerText = `Planned (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 2).length})`;
                element.get<HTMLParagraphElement>("ft#dropped").innerText = `Dropped (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 3).length})`;
            }
        });
    });

    element.query_loop<HTMLParagraphElement>("div.sort>p", item_element => {
        element.link(item_element.id, {
            click: () => {
                element.query_loop("div.sort>p", _e => _e.classList.remove("selected"));
                element.toggle_class(item_element as HTMLElement, "selected");
                sorting = item_element.id.slice(6);
                update_list();
            }
        });
    });

    element.link("f#search", {
        keydown: () => {
            search = element.get<HTMLInputElement>("f#search").value;
            update_list();
        }
    });

    element.link("d#close", {
        click: () => {
            element.get<HTMLInputElement>("dialogue").style.display = "none";
        }
    });

    element.link("f#add", {
        click: () => {
            element.get<HTMLDivElement>("dialogue").style.display = "flex";
            element.get<HTMLDivElement>("dialogue").setAttribute("data-id", "unkown");
            element.get<HTMLInputElement>("d#name").value = "New Anime";
            element.get<HTMLInputElement>("d#note").value = "";
            element.get<HTMLInputElement>("d#state").innerText = resolve_status(2)[0];
            element.get<HTMLInputElement>("d#state").className = resolve_status(2)[1];
        }
    });

    element.link("d#delete", {
        click: async () => {
            const d_element = element.get<HTMLDivElement>("dialogue");

            const list_selector = window.location.hash.substring(1) as "anime" | "manga";
            let list = lists[list_selector];

            lists[list_selector] = list.filter(item => item._id != d_element.getAttribute("data-id"));

            await util.make_api_call("DELETE", `/lists/${list_selector}`, { id: d_element.getAttribute("data-id") });

            element.get<HTMLInputElement>("dialogue").style.display = "none";

            update_list();
        }
    });

    element.link("d#save", {
        click: async () => {
            const d_name = element.get<HTMLInputElement>("d#name").value;
            const d_note = element.get<HTMLInputElement>("d#note").value;
            const d_state_text = element.get<HTMLDivElement>("d#state").innerHTML;
            const d_element = element.get<HTMLDivElement>("dialogue");

            // console.log(d_name, d_note, resolve_filter(d_state_text.toLowerCase()), d_element.getAttribute("data-id"));
            
            const list_selector = window.location.hash.substring(1) as "anime" | "manga";
            let list = lists[list_selector];

            if (d_element.getAttribute("data-id") == "unkown") {
                const result = await util.make_api_call<{ data: { id: string } }>("POST", `/lists/${list_selector}/create`, {
                    name: d_name.trim(),
                    current: d_note.trim(),
                    state: resolve_filter(d_state_text.toLowerCase())
                });

                list.push({
                    _id: result!.payload!.data.id as string,
                    name: d_name.trim(),
                    current: d_note.trim(),
                    state: resolve_filter(d_state_text.toLowerCase()) as 0 | 1 | 2 | 3
                });

                element.get<HTMLInputElement>("dialogue").style.display = "none";
                update_list();
                return;
            }

            const item = list.find(i => i._id == d_element.getAttribute("data-id"))!;
            item.current = d_note.trim();
            item.name = d_name.trim();
            item.state = resolve_filter(d_state_text.toLowerCase()) as 0 | 1 | 2 | 3;

            await util.make_api_call("POST", `/lists/${list_selector}`, item);
            element.get<HTMLInputElement>("dialogue").style.display = "none";
            update_list();
        }
    });

    element.query_loop<HTMLParagraphElement>(".dialogue>.settings>.dropdown>.content>p", (e) => {
        element.link(e.id, {
            click: () => {
                element.get<HTMLInputElement>("d#state").innerHTML = e.innerHTML;
                element.get<HTMLInputElement>("d#state").className = e.innerHTML.toLowerCase();
            }
        });
    });

    let list_selector = window.location.hash.substring(1);

    if (!["anime", "manga"].includes(list_selector)) {
        window.location.hash = "#anime";
        list_selector = "anime";
    }

    element.link("d#dropdown", {
        click: (e) => {
            e.stopPropagation();
            element.toggle_class(element.get("d#dropdown"), "open");
        }
    });

    document.addEventListener("click", () => {
        element.get("d#dropdown").classList.remove("open");
    });

    element.get<HTMLAnchorElement>(`fs#${list_selector}`).classList.add("selected");

    const _lists = await util.make_api_call<{ message: string, success: boolean, data: { anime: instance_object_t[], manga: instance_object_t[] } }>("GET", "/lists");
    lists = _lists!.payload!.data;

    element.get<HTMLParagraphElement>("ft#finished").innerText = `Finished (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 0).length})`;
    element.get<HTMLParagraphElement>("ft#watching").innerText = `Watching (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 1).length})`;
    element.get<HTMLParagraphElement>("ft#planned").innerText = `Planned (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 2).length})`;
    element.get<HTMLParagraphElement>("ft#dropped").innerText = `Dropped (${lists[list_selector as "anime" | "manga"].filter(k => k.state == 3).length})`;

    update_list();
}

window.addEventListener("DOMContentLoaded", main);