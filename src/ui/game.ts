/**
 * Holds the live game state for the UI. The state object can be replaced
 * wholesale (import, hard reset), so components always read it via game().
 */
import { useEffect, useState } from "preact/hooks";
import { GameState } from "../engine/state";

let current: GameState;

export function game(): GameState {
    return current;
}

export function setGame(state: GameState): void {
    current = state;
}

/** Re-renders the calling component `fps` times per second */
export function useTicker(fps: number): void {
    const [, setFrame] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setFrame((f) => f + 1), 1000 / fps);
        return () => clearInterval(id);
    }, [fps]);
}
