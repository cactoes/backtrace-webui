import * as data_controller from "controllers/data";

interface server_t {
    server: string;
};

type server_list_t = { [key: string]: server_t };

export async function get_server_details(id: string): Promise<server_t | undefined> {
    const [servers, release] = await data_controller.get_file_with_lock("servers");
    release();
    return (servers as server_list_t)[id];
}