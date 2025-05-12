check_logged_in().then(r => {
    if (!r)
        window.location.href = "/login";
});

/* await */setup_sidebar();

interface instance_object_t {
    _id: string,
    name: string,
    current: string,
    // finished, watching, planned, dropped
    state: 0 | 1 | 2 | 3
};

function toggle_class(target: HTMLElement, _class: string) {
    target.classList.contains(_class)
        ? target.classList.remove(_class)
        : target.classList.add(_class)
}

function switch_class(target: HTMLElement, classes: [ string, string ]) {
    target.classList.contains(classes[0])
        ? (target.classList.remove(classes[0]), target.classList.add(classes[1]))
        : (target.classList.remove(classes[1]), target.classList.add(classes[0]))
}

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
    const div = document.createElement("div");
    div.className = "item";

    const name = document.createElement("p");
    name.className = "name";
    name.innerText = obj.name;
    div.appendChild(name);

    const status = document.createElement("p");
    status.className = `status ${resolve_status(obj.state)[1]}`;
    status.innerText = resolve_status(obj.state)[0];
    div.appendChild(status);

    const note = document.createElement("p");
    note.className = "note";
    note.innerText = obj.current;
    div.appendChild(note);

    const edit = document.createElement("p");
    edit.className = "edit";
    const i = document.createElement("i");
    i.className = "fa-solid fa-ellipsis-vertical";
    i.onclick = () => {
        console.log("edit:", obj);
    }
    edit.appendChild(i);
    div.appendChild(edit);

    return div;

    // return `<div class="item" id="$${obj._id}">
    //             <p class="name">${obj.name}</p>
    //             <p class="status">${obj.state}</p>
    //             <p class="note">${obj.current}</p>
    //             <p class="edit"><i class="fa-solid fa-ellipsis-vertical"></i></p>
    //         </div>`;
}

let page_index = 1;
let page_max_index = 1;

function update_list(list: instance_object_t[], filters: string[]) {
    const mapped_filters: number[] = filters.map(resolve_filter);

    if (mapped_filters.length == 0)
        mapped_filters.push(0, 1, 2, 3);

    const filterd_list = list.filter(item => mapped_filters.includes(item.state));

    const e_controls_start = get_element<HTMLDivElement>("start");
    const e_controls_start_split = get_element<HTMLDivElement>("start_split");
    const e_controls_current = get_element<HTMLDivElement>("current");
    const e_controls_end_split = get_element<HTMLDivElement>("end_split");
    const e_controls_end = get_element<HTMLDivElement>("end");

    page_max_index = Math.ceil(filterd_list.length / 16);

    if (page_index > page_max_index)
        page_index = page_max_index;

    e_controls_current.innerHTML = `${page_index}`;
    e_controls_end.innerHTML = `${page_max_index}`;

    if (page_index > 1) {
        e_controls_start.classList.remove("hidden");
        e_controls_start_split.classList.remove("hidden");
    } else {
        e_controls_start.classList.add("hidden");
        e_controls_start_split.classList.add("hidden");
    }

    if (page_index >= page_max_index) {
        e_controls_end.classList.add("hidden");
        e_controls_end_split.classList.add("hidden");
    } else {
        e_controls_end.classList.remove("hidden");
        e_controls_end_split.classList.remove("hidden");
    }

    const target = get_element("div#list");
    target.innerHTML = "";
    for (const item of filterd_list.slice(16 * (page_index - 1), 16 * page_index))
        target.appendChild(create_list_item(item));
}

async function main() {
    const lists = await make_api_call<{ message: string, success: boolean, data: { anime: instance_object_t[], manga: instance_object_t[] } }>("GET", "/lists");

    let current_list = lists.payload!.data.anime;
    let filters: string[] = [];
    update_list(current_list, filters);

    get_element<HTMLDivElement>("div#options").querySelectorAll("a").forEach(element => {
        element.addEventListener("click", (ev) => {
            const e = get_element<HTMLButtonElement>("button#dropdown");
            e.click();
            e.querySelector("span")!.innerText = (ev.target as HTMLAnchorElement).innerText;
            
            if (e.textContent == "Anime") {
                current_list = lists.payload!.data.anime;
            } else if (e.textContent == "Manga") {
                current_list = lists.payload!.data.manga;
            }

            update_list(current_list, filters);
        });
    });
    
    const e_filters = get_element<HTMLDivElement>("div#filters");
    e_filters.querySelectorAll("p").forEach(element => {
        element.addEventListener("click", (ev) => {
            const target = (ev.target as HTMLElement).classList[1];
            if (target == "clear" || target == "fa-xmark") {
                filters = [];
                e_filters.querySelectorAll("p").forEach(el => el.classList.remove("active"));
            } else if (filters.includes(target)) {
                filters = filters.filter(f => f != target);
                (ev.target as HTMLElement).classList.remove("active");
            } else {
                filters.push(target);
                (ev.target as HTMLElement).classList.add("active");
            }

            update_list(current_list, filters);
        });
    });

    const button_dropdown = link_component("button#dropdown", {
        click: () => {
            switch_class(button_dropdown.querySelector("i")!, ["fa-angle-up", "fa-angle-down"])
    
            const e_options = get_element<HTMLDivElement>("div#options");
            toggle_class(e_options, "show");
        }
    });

    link_component("next", {
        click: () => {
            if (page_index < page_max_index)
                page_index++;
            update_list(current_list, filters);
        }
    });

    link_component("prev", {
        click: () => {
            if (page_index - 1 > 0)
                page_index--;
            update_list(current_list, filters);
        }
    });

    link_component("start", {
        click: () => {
            page_index = 1;
            update_list(current_list, filters);
        }
    });

    link_component("end", {
        click: () => {
            page_index = page_max_index;
            update_list(current_list, filters);
        }
    });
}

window.addEventListener("DOMContentLoaded", main);