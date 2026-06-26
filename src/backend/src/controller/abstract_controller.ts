//==========================================
/// @file       abstract_controller.ts
/// @brief      
//==========================================

import { BunRouter } from "@backend/server";

export default abstract class AbstractController {
    public abstract create_router(): BunRouter;
}