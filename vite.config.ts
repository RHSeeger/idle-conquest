import { defineConfig, Plugin } from "vite";
import preact from "@preact/preset-vite";

/**
 * Engine and content changes reload the page instead of hot-swapping modules:
 * a hot swap keeps the old in-memory state (missing any new fields, which are
 * only filled in when a save loads) and can leave two copies of a module's
 * registries. The page saves on unload, so nothing is lost.
 */
function reloadOnEngineChange(): Plugin {
    return {
        name: "reload-on-engine-change",
        handleHotUpdate({ file, server }) {
            if (/\/src\/(engine|content)\//.test(file.replace(/\\/g, "/"))) {
                server.ws.send({ type: "full-reload" });
                return [];
            }
        },
    };
}

export default defineConfig({
    plugins: [preact(), reloadOnEngineChange()],
    base: "./",
    test: {
        include: ["tests/**/*.test.ts"],
    },
} as any);
