

const user_element = get_element<HTMLHeadingElement>("user#username");
const uuid_element = get_element<HTMLParagraphElement>("user#uuid");


make_api_call("GET", "/account/public/me").then((r) => {
    user_element.innerText = r.payload.user.username;
    uuid_element.innerText = r.payload.user.uuid;
});