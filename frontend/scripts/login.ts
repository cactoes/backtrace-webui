function get_input(elementid: string): string | undefined {
    return (document.getElementById(elementid) as HTMLInputElement | null)?.value;
}

function submit_callback() {
    console.log(get_input("input#username"), get_input("input#password"));
}

link_component("button#submit", {
    click: submit_callback
});