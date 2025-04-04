function button_callback() {
    console.log("clicked");
}

link_component("button_basic#test", {
    "onclick": button_callback
});

// TODO @since 04/04/2025 -- 13:45
// turn into typescript files