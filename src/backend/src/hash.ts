//==========================================
/// @file       hash.ts
/// @brief      hasing funcitons
//==========================================
import { SHA256 } from "bun";

export function sha256(input: string): string {
    return new SHA256().update(input).digest('hex');
}