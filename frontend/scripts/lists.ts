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

link_component("button#dropdown", {
    click: () => {
        const e = get_element<HTMLButtonElement>("button#dropdown");
        switch_class(e.querySelector("i")!, ["fa-angle-up", "fa-angle-down"])

        const e_options = get_element<HTMLDivElement>("div#options");
        toggle_class(e_options, "show");
    }
})

function resolve_status(status: instance_object_t["state"]): [string, string] {
    return [
        ["Finished", "finished"],
        ["Watching", "watching"],
        ["Planned", "planned"],
        ["Dropped", "dropped"]
    ][status] as any;
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
    edit.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
    div.appendChild(edit);

    return div;

    // return `<div class="item" id="$${obj._id}">
    //             <p class="name">${obj.name}</p>
    //             <p class="status">${obj.state}</p>
    //             <p class="note">${obj.current}</p>
    //             <p class="edit"><i class="fa-solid fa-ellipsis-vertical"></i></p>
    //         </div>`;
}

function update_list() {}

async function main() {
    const lists = await make_api_call<{ message: string, success: boolean, data: { anime: instance_object_t[], manga: instance_object_t[] } }>("GET", "/lists");
    // i == page count
    const i = 1;

    const target = get_element("div#list");
    for (const item of lists.payload!.data.anime.slice(0, 16 * i)) {
        target.appendChild(create_list_item(item));
    }

    const e_options = get_element<HTMLDivElement>("div#options");
    e_options.querySelectorAll("a").forEach(element => {
        element.addEventListener("click", (ev) => {
            const e = get_element<HTMLButtonElement>("button#dropdown");
            e.click();
            e.querySelector("span")!.innerText = (ev.target as HTMLAnchorElement).innerText;
            update_list();
        });
    });
}

window.addEventListener("DOMContentLoaded", main);