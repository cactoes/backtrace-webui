import { FuzzySearch } from "./fuzzy_search.js";
import { component, util, element } from "./global.js";

let lists: password_t[] = [];

let search: string = "";
let sorting = "";

function get_password() {
    return "test";
}

function create_field_list_item(list: password_t, obj: password_field_t) {
    const div = document.createElement("div");
    div.className = "field";
    const p1 = document.createElement("p");
    p1.innerText = "Name";
    const i1 = document.createElement("input");
    i1.type = "text";
    i1.value = `${obj.name}`;
    if (obj.name.length)
        i1.disabled = true;

    i1.onblur = () => { obj.name = i1.value; }

    const p2 = document.createElement("p");
    p2.innerText = "Value";
    const i2 = document.createElement("input");
    i2.type = "text";
    i2.value = `${obj.value}`;
    i2.onblur = () => {
        if (!(obj as any).is_new)
            (obj as any).edited = true;

        obj.value = i2.value;
    }
    const del = document.createElement("div");
    del.className = "field-delete";
    del.innerHTML = `<i class="fa-solid fa-xmark"></i>`;

    del.onclick = () => {
        div.remove();
        (obj as any).remove = true;
    };

    div.appendChild(p1);
    div.appendChild(i1);
    div.appendChild(p2);
    div.appendChild(i2);
    div.appendChild(del);
    return div;
}

function create_list_item(obj: password_t) {
    const div = document.createElement("div");
    div.className = `item`;
    div.id = obj._id;

    div.onclick = () => {
        element.get<HTMLDivElement>("dialogue").style.display = "flex";
        element.get<HTMLDivElement>("dialogue").setAttribute("data-id", obj._id);
        element.get<HTMLInputElement>("d#name").value = obj.name;

        let last_name = obj.name;
        element.get<HTMLInputElement>("d#name").onblur = () => {
            const e = element.get<HTMLInputElement>("d#name");
            
            if (e.value.length)
                last_name = e.value;
            else
                e.value = last_name;

            obj.name = last_name;
        }

        element.get<HTMLDivElement>("d#fields").innerHTML = "";

        for (const field of obj.fields)
            element.get<HTMLDivElement>("d#fields").appendChild(create_field_list_item(obj, field));

        element.link("d#add-field", {
            click: () => {
                obj.fields.push({ name: "", value: "", is_new: true } as password_field_t);
                element.get<HTMLDivElement>("d#fields").appendChild(create_field_list_item(obj, obj.fields[obj.fields.length - 1]));
            }
        });
    };

    const h3 = document.createElement("h3");
    h3.innerText = obj.name;

    const p2 = document.createElement("p");
    p2.innerText = `${obj.fields.length} fields`;

    div.appendChild(h3);
    div.appendChild(p2);

    return div;
}

function update_list() {
    const target = element.get<HTMLDivElement>("list");
    target.innerHTML = "";

    let list = lists;

    if (search.length != 0) {
        const fuzzy = new FuzzySearch(list, ["name"], {
            caseSensitive: false, sort: true
        });
    
        list = fuzzy.search(search.replace(/\W+/g, ""));
    }

    if (sorting == "alphabetical") {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // list = list;
    }

    for (const item of list) {
        const div = create_list_item(item);
        target.appendChild(div);
    }
}

async function main() {
    util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
    component.set_pfp();

    const has_account_result = await util.make_api_call<{ message: string, success: boolean, data: { status: "SETUP_COMPLETE" | "TO_BE_SETUP" } }>("GET", "/password/account/check");
    if (!has_account_result || !has_account_result.payload || has_account_result.payload.data.status != "SETUP_COMPLETE")
        window.location.href = "/password-register";

    element.link("d#close", {
        click: () => {
            element.get<HTMLInputElement>("dialogue").style.display = "none";
            element.get<HTMLButtonElement>("d#save").disabled = false;
            element.get<HTMLButtonElement>("d#delete").disabled = false;
            element.get<HTMLButtonElement>("d#close").disabled = false;

            const d_element = element.get<HTMLDivElement>("dialogue");
            const current_id = d_element.getAttribute("data-id");
            if (current_id == "TEMP_ID")
                lists = lists.filter(v => v._id == "TEMP_ID");
        }
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

    element.link("f#add", {
        click: () => {
            element.get<HTMLDivElement>("dialogue").style.display = "flex";
            element.get<HTMLDivElement>("dialogue").setAttribute("data-id", "TEMP_ID");
            element.get<HTMLInputElement>("d#name").value = "";

            const obj: password_t = {
                _id: "TEMP_ID",
                name: "",
                fields: [],
            };

            let last_name = "";
            element.get<HTMLInputElement>("d#name").onblur = () => {
                const e = element.get<HTMLInputElement>("d#name");
                
                if (e.value.length)
                    last_name = e.value;
                else
                    e.value = last_name;

                obj.name = last_name;
            }

            element.get<HTMLDivElement>("d#fields").innerHTML = "";

            element.link("d#add-field", {
                click: () => {
                    obj.fields.push({ name: "", value: "", is_new: true } as password_field_t);
                    element.get<HTMLDivElement>("d#fields").appendChild(create_field_list_item(obj, obj.fields[obj.fields.length - 1]));
                }
            });

            lists.push(obj);
        }
    });

    element.link("d#delete", {
        click: async () => {
            element.get<HTMLButtonElement>("d#save").disabled = true;
            element.get<HTMLButtonElement>("d#delete").disabled = true;
            element.get<HTMLButtonElement>("d#close").disabled = true;

            const d_element = element.get<HTMLDivElement>("dialogue");

            const current_id = d_element.getAttribute("data-id");
            if (!current_id || current_id == "TEMP_ID") {
                if (current_id == "TEMP_ID")
                    lists = lists.filter(v => v._id == "TEMP_ID");

                element.get<HTMLInputElement>("dialogue").style.display = "none";
                element.get<HTMLButtonElement>("d#save").disabled = false;
                element.get<HTMLButtonElement>("d#delete").disabled = false;
                element.get<HTMLButtonElement>("d#close").disabled = false;
                return;
            }

            const target_entry = lists.find(entry => entry._id == current_id);
            if (!target_entry)
                return;

            await util.make_api_call<{ data: any }>("DELETE", `/password/entry/delete`, {
                password: get_password(),
                id: target_entry._id,
            });

            lists = lists.filter(v => v != target_entry);

            element.get<HTMLInputElement>("dialogue").style.display = "none";
            element.get<HTMLButtonElement>("d#save").disabled = false;
            element.get<HTMLButtonElement>("d#delete").disabled = false;
            element.get<HTMLButtonElement>("d#close").disabled = false;
            update_list();
        }
    });

    element.link("d#save", {
        click: async () => {
            element.get<HTMLButtonElement>("d#save").disabled = true;
            element.get<HTMLButtonElement>("d#delete").disabled = true;
            element.get<HTMLButtonElement>("d#close").disabled = true;

            const d_element = element.get<HTMLDivElement>("dialogue");

            const current_id = d_element.getAttribute("data-id");
            if (!current_id) {
                return;
            }

            const target_entry = lists.find(entry => entry._id == current_id);
            if (!target_entry)
                return;

            if (target_entry._id == "TEMP_ID") {
                target_entry.fields = target_entry.fields.filter((v: any) => !v.remove);
                target_entry.fields.map(k => { return { name: k.name, value: k.value } });

                const result = await util.make_api_call<{ data: { passwords: password_t[] } }>("POST", `/password/entry/add`, {
                    password: get_password(),
                    name: target_entry.name,
                    fields: target_entry.fields
                });

                if (!result || result.error || !result.payload || !result.payload.data)
                    return;

                target_entry._id = result.payload.data.passwords[0]!._id;

                element.get<HTMLInputElement>("dialogue").style.display = "none";
                element.get<HTMLButtonElement>("d#save").disabled = false;
                element.get<HTMLButtonElement>("d#delete").disabled = false;
                element.get<HTMLButtonElement>("d#close").disabled = false;
                update_list();

                return;
            }

            target_entry.fields = target_entry.fields.filter(field => field.name.length && field.value.length);

            for (const field of target_entry.fields) {
                if ((field as any).remove && !(field as any).is_new) {
                    await util.make_api_call<{ data: any }>("DELETE", `/password/entry/field/delete`, {
                        password: get_password(),
                        id: target_entry._id,
                        name: field.name
                    });
                }

                if ((field as any).is_new || (field as any).edited) {
                    await util.make_api_call<{ data: any }>("POST", `/password/entry/field/edit`, {
                        password: get_password(),
                        id: target_entry._id,
                        field: {
                            name: field.name,
                            value: field.value,
                        }
                    });
                }
            }

            // sanitse the list
            target_entry.fields = target_entry.fields.filter((v: any) => !v.remove);
            target_entry.fields.map(k => { return { name: k.name, value: k.value } });

            await util.make_api_call<{ data: any }>("POST", `/password/entry/edit`, {
                password: get_password(),
                id: target_entry._id,
                name: target_entry.name
            });

            element.get<HTMLInputElement>("dialogue").style.display = "none";
            element.get<HTMLButtonElement>("d#save").disabled = false;
            element.get<HTMLButtonElement>("d#delete").disabled = false;
            element.get<HTMLButtonElement>("d#close").disabled = false;
            update_list();
        }
    });

    const _lists = await util.make_api_call<{ message: string, success: boolean, data: { instance: string, passwords: password_t[] } }>("POST", "/password/get-all", {
        password: get_password()
    });

    lists = _lists!.payload!.data.passwords;

    update_list();
}

window.addEventListener("DOMContentLoaded", main);