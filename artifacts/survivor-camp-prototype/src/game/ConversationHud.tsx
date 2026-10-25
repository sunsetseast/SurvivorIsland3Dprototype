import { useEffect, useRef, useSyncExternalStore } from "react";
import { camp } from "./CampRuntime";
import { ACTIVITY_LABEL, personName } from "./simulation/DemoProvider";
import { input } from "./state";

/** Safari/Chromium may suppress a compatibility click after multitouch camera
 * gestures. Complete a deliberate touch on pointerup, while retaining keyboard
 * clicks and suppressing the duplicate compatibility click. Scroll cancels it. */
function SocialButton({
  onActivate,
  ...props
}: React.ComponentProps<"button"> & { onActivate: () => void }) {
  const touch = useRef({ x: 0, y: 0, suppressUntil: 0 });
  return (
    <button
      {...props}
      onPointerDown={(e) => {
        touch.current.x = e.clientX;
        touch.current.y = e.clientY;
      }}
      onPointerUp={(e) => {
        if (
          e.pointerType !== "mouse" &&
          Math.hypot(e.clientX - touch.current.x, e.clientY - touch.current.y) <
            12
        ) {
          e.preventDefault();
          touch.current.suppressUntil = performance.now() + 500;
          onActivate();
        }
      }}
      onClick={(e) => {
        if (e.detail === 0 || performance.now() > touch.current.suppressUntil)
          onActivate();
      }}
    />
  );
}

export function ConversationHud() {
  const state = useSyncExternalStore(camp.subscribe, camp.getSnapshot);
  const dialog = useRef<HTMLDivElement>(null);
  const leave = useRef<HTMLButtonElement>(null);
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const s = latest.current;
      if (event.code === "Escape") {
        camp.endConversation();
        camp.declineApproach();
      }
      if (event.code === "KeyE" && !s.conversation) {
        const id = s.incomingId ?? s.nearbyId;
        if (id !== null) {
          event.preventDefault();
          camp.talk(id);
        }
      }
      if (event.code === "Tab" && s.conversation) {
        const controls = [
          ...(dialog.current?.querySelectorAll<HTMLButtonElement>("button") ??
            []),
        ];
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (state.conversation) {
      input.joyX = input.joyY = 0;
      input.run = false;
      leave.current?.focus({ preventScroll: true });
    }
  }, [!!state.conversation]);

  const c = state.conversation;
  const nearby = state.nearbyId !== null ? camp.npc(state.nearbyId) : null;
  return (
    <div className="social-hud">
      {state.toast && !c && (
        <div className="camp-toast" role="status">
          {state.toast}
        </div>
      )}
      {!c && state.incomingId !== null && (
        <div className="approach-card" data-testid="npc-approach">
          <div>
            <span className="social-eyebrow">A MOMENT TO TALK</span>
            <strong>{personName(state.incomingId)} is waiting nearby</strong>
          </div>
          <div className="approach-actions">
            <SocialButton onActivate={() => camp.talk(state.incomingId!)}>
              Talk <kbd>E</kbd>
            </SocialButton>
            <SocialButton
              className="quiet-button"
              onActivate={() => camp.declineApproach()}
            >
              Not now
            </SocialButton>
          </div>
        </div>
      )}
      {!c && state.incomingId === null && nearby && (
        <SocialButton
          className="talk-prompt"
          data-testid="talk-prompt"
          onActivate={() => camp.talk(nearby.id)}
        >
          <span className="talk-icon" aria-hidden="true">
            ···
          </span>
          <span>
            <strong>{personName(nearby.id)}</strong>
            <small>
              {nearby.groupId
                ? "Approach conversation"
                : ACTIVITY_LABEL[nearby.activity]}
            </small>
          </span>
          <span className="talk-action">
            Talk <kbd>E</kbd>
          </span>
        </SocialButton>
      )}
      {c && (
        <div
          className="conversation-panel"
          data-testid="conversation-panel"
          ref={dialog}
          role="dialog"
          aria-label={`Conversation with ${personName(c.actorId)}`}
        >
          <div className="conversation-heading">
            <div>
              <span className="social-eyebrow">CAMP CONVERSATION</span>
              <h2>{personName(c.actorId)}</h2>
            </div>
            <SocialButton
              ref={leave}
              className="leave-conversation"
              onActivate={() => {
                camp.endConversation();
                (
                  document.querySelector(
                    '[data-testid="button-help"]',
                  ) as HTMLElement
                )?.focus();
              }}
              aria-label="Leave conversation"
            >
              Leave <span aria-hidden="true">↗</span>
            </SocialButton>
          </div>
          <p className="spoken-line" aria-live="polite" key={c.turn}>
            {c.dialogue.line}
          </p>
          <div className="dialogue-choices" aria-label="Choose your response">
            {c.dialogue.choices.map((choice) => (
              <SocialButton
                key={choice.id}
                data-topic={choice.id}
                onActivate={() => camp.choose(choice.id)}
              >
                {choice.label}
                <span aria-hidden="true">›</span>
              </SocialButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
