function link_component<K extends keyof HTMLElementEventMap>(target: string, events: { [E in K]: (this: HTMLElement, e: HTMLElementEventMap[E]) => any } ): void {
    const target_element = document.getElementById(target);
    if (!target_element)
        return;

    for (const event of Object.keys(events) as K[]) {
        target_element.addEventListener(event, events[event]);
    }
}