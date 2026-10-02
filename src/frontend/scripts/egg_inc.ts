import { component, util } from "./global.js";

function set_text(id: string, value: string, fallback = "-") {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? fallback;
}

function format_name(value: string, fallback = "Unknown") {
    if (!value || value === "UNRECOGNIZED") return fallback;

    return String(value)
        .toLowerCase()
        .split("_")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function format_grade(value: string) {
    if (
        !value ||
        value === "UNSET" ||
        value === "GRADE_UNSET" ||
        value === "UNRECOGNIZED" ||
        value === "GRADE_UNRECOGNIZED"
    ) {
        return "None";
    }

    return String(value).replace(/^GRADE_/, "");
}

function format_permit(value: string) {
    if (!value) return "None";
    return format_name(value, "None");
}

function css_value(value: string | undefined, fallback: string) {
    return String(value ?? fallback)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
}

function create_image(base64: string, alt: string) {
    const image = document.createElement("img");
    image.src = `data:image/png;base64,${base64}`;
    image.alt = alt;
    image.loading = "lazy";
    return image;
}

function format_time(unix_time: number) {
    if (!unix_time) return "Unknown";

    const date = new Date(Number(unix_time) * 1000);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function create_artifact_card(artifact: any) {
    const card = document.createElement("article");
    card.className = `artifact-card rarity-${css_value(artifact.rarity, "common")}`;

    const main = document.createElement("div");
    main.className = "artifact-main";

    const image_container = document.createElement("div");
    image_container.className = "artifact-image";

    if (artifact.imageBase64) {
        image_container.appendChild(create_image(
            artifact.imageBase64,
            artifact.name ?? "Artifact"
        ));
    }

    const info = document.createElement("div");
    info.className = "artifact-info";

    const name = document.createElement("p");
    name.className = "artifact-name";
    name.textContent = artifact.name ?? "Unknown artifact";

    const tier = document.createElement("p");
    tier.className = "artifact-tier";
    tier.textContent = artifact.tier ?? "Unknown tier";

    const rarity = document.createElement("p");
    rarity.className = "artifact-rarity";
    rarity.textContent = artifact.rarity ?? "common";

    info.append(name, tier, rarity);
    main.append(image_container, info);

    const stones = document.createElement("div");
    stones.className = "stones";

    if (!artifact.stones?.length) {
        const empty = document.createElement("span");
        empty.className = "no-stones";
        empty.textContent = "No stones equipped";
        stones.appendChild(empty);
    } else {
        for (const stone of artifact.stones) {
            if (!stone?.imageBase64) continue;

            const stone_element = document.createElement("div");
            stone_element.className = "stone";
            stone_element.title = stone.name ?? "Stone";
            stone_element.appendChild(create_image(
                stone.imageBase64,
                stone.name ?? "Stone"
            ));

            stones.appendChild(stone_element);
        }
    }

    card.append(main, stones);
    return card;
}

function render_artifacts(artifacts: any) {
    const section = document.getElementById("artifacts");
    if (!section) return;

    section.replaceChildren();

    if (!artifacts.length) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No equipped artifacts found.";
        section.appendChild(empty);
        return;
    }

    for (const artifact of artifacts) {
        section.appendChild(create_artifact_card(artifact));
    }
}

function render_trophies(trophies: any) {
    const section = document.getElementById("trophies");
    if (!section) return;

    section.replaceChildren();

    if (!trophies.length) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No trophy data found.";
        section.appendChild(empty);
        return;
    }

    for (const trophy of trophies) {
        const card = document.createElement("article");
        card.className = `trophy-card trophy-${css_value(trophy.level, "none")}`;

        const egg = document.createElement("span");
        egg.className = "trophy-egg";
        egg.textContent = format_name(trophy.egg, "Unknown egg");

        const level = document.createElement("span");
        level.className = "trophy-level";
        level.textContent = trophy.level ?? "None";

        card.append(egg, level);
        section.appendChild(card);
    }
}

function render_dashboard(payload: any) {
    const artifacts = payload.artifacts ?? [];
    const trophies = payload.trophies ?? [];

    set_text("current-egg", format_name(payload.current_egg, "Unknown egg"));
    set_text(
        "farm-description",
        `${artifacts.length} equipped artifact${artifacts.length === 1 ? "" : "s"}`
    );

    set_text("permit", format_permit(payload.permit));
    set_text("contract-grade", format_grade(payload.average_contract_grade));
    set_text("updated-at", format_time(payload.time));

    set_text("soul-eggs", payload.soul_eggs);
    set_text("eggs-of-prophecy", payload.eggs_of_prophecy);
    set_text("eggs-of-virtue", payload.eggs_of_virtue);
    set_text("prestige-count", payload.prestiege_count);
    set_text("golden-eggs", payload.golden_eggs_total);
    // set_text("lifetime-earnings", payload.lifetime_earnings);
    set_text("earnings-bonus", payload.earnings_bonus);

    set_text("total-items", payload.total_items);
    set_text("common-items", payload.total_common_items);
    set_text("rare-items", payload.total_rare_items);
    set_text("epic-items", payload.total_epic_items);
    set_text("legendary-items", payload.total_legendary_items);
    set_text("equipped-count", artifacts.length);

    render_artifacts(artifacts);
    render_trophies(trophies);
}

async function main() {
    const logged_in = await util.check_logged_in();

    if (!logged_in) {
        window.location.href = "/login";
        return;
    }

    component.set_pfp();

    try {
        const response = await util.make_api_call("GET", "/egg-inc/me");
        if (!response?.payload) throw new Error("No player data returned.");

        console.log(response.payload);
        render_dashboard(response.payload);
    } catch (error) {
        console.error(error);
        set_text("current-egg", "Unable to load player data");
        set_text("farm-description", "Check your linked Egg Inc. ID and try again.");
        render_artifacts([]);
        render_trophies([]);
    }
}

window.addEventListener("DOMContentLoaded", main);