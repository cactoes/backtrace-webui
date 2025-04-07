function button_callback() {
    console.log("clicked");
}

link_component("button_basic#test", {
    click: button_callback
});