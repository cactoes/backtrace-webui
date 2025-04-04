function link_component(target, events) {
    const target_element = document.getElementById(target);
    for (const event of Object.keys(events)) {
        target_element[event] = events[event];
    }
}