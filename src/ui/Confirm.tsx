/**
 * The game's own confirmation dialog, in place of the browser's confirm():
 * a title, a few paragraphs (or any content), and a confirm and a cancel button.
 * Call askConfirm() from anywhere; <ConfirmHost /> (in App) shows it.
 */
import { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export interface ConfirmRequest {
    title: string;
    /** Paragraphs (strings), or any content */
    body: Array<ComponentChildren | string>;
    /** The confirm button's label, e.g. "Ascend" */
    confirm: string;
    cancel?: string;
    /** Styles the confirm button as destructive (erasing, dismissing, abandoning) */
    danger?: boolean;
    /** The look of the confirm button: one of the prestige layers, for their resets */
    tone?: "refound" | "ascend" | "planeshift" | "mastery";
    onConfirm: () => void;
}

let pending: ConfirmRequest | null = null;
const listeners = new Set<() => void>();

function notify(): void {
    for (const l of listeners) l();
}

/** Asks the player to confirm; `onConfirm` runs only if they do */
export function askConfirm(request: ConfirmRequest): void {
    pending = request;
    notify();
}

function close(): void {
    pending = null;
    notify();
}

export function ConfirmHost() {
    const [, setVersion] = useState(0);
    useEffect(() => {
        const listener = () => setVersion((v) => v + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);
    const request = pending;
    const okButton = useRef<HTMLButtonElement>(null);
    const cancelButton = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!request) return;
        // Enter confirms, except where confirming destroys something: then it cancels
        (request.danger ? cancelButton : okButton).current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [request]);
    if (!request) return null;
    const accept = () => {
        close();
        request.onConfirm();
    };
    return (
        <div class="modal-backdrop confirm-backdrop" onClick={close}>
            <div class="modal confirm" role="dialog" aria-modal="true" aria-label={request.title} onClick={(e) => e.stopPropagation()}>
                <h2>{request.title}</h2>
                {request.body.filter((p) => p !== "" && p !== null && p !== undefined && p !== false).map((p, i) =>
                    typeof p === "string" ? <p key={i}>{p}</p> : <div key={i}>{p}</div>,
                )}
                <div class="confirm-buttons">
                    <button ref={cancelButton} onClick={close}>
                        {request.cancel ?? "Cancel"}
                    </button>
                    <button
                        ref={okButton}
                        class={"confirm-ok" + (request.danger ? " danger" : "") + (request.tone ? " prestige-button " + request.tone : "")}
                        onClick={accept}
                    >
                        {request.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
