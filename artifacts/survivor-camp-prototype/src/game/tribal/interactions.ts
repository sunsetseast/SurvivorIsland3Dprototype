import { VOTING } from "./votingAnchors";
import { playerSeat } from "./intro";

export const INTERESTS = [
  {
    id: "last-walk",
    x: 9.7,
    z: 3.2,
    radius: 2,
    action: "Rehearse the last walk",
    title: "The tribe has spoken",
    text: "",
  },
  {
    id: "ballot",
    x: VOTING.writing.x,
    z: VOTING.writing.z,
    radius: 1.1,
    action: "Write a practice ballot",
    title: "The private voting pavilion",
    text: "Write a name, then fold and deposit your parchment. This is a ceremony rehearsal; it does not eliminate anyone or change your season.",
  },
  {
    id: "jury",
    x: -22,
    z: -4,
    radius: 3.3,
    action: "Inspect the jury gallery",
    title: "The jury gallery",
    text: "Three raised rows face the Council. Twelve reserved places support future jurors; the gallery stays empty until a season supplies them.",
  },
  {
    id: "ruins",
    x: 0,
    z: -14,
    radius: 4,
    action: "Examine the ancient skyline",
    title: "A sanctuary reclaimed by the jungle",
    text: "The recessed brick prangs and bell-shaped chedi use different architectural profiles. Stucco remains cling to the masonry. This is a fictional sanctuary inspired by Thai ruins.",
  },
  {
    id: "seat",
    get x() {
      return playerSeat()?.position[0] ?? -38;
    },
    get z() {
      return (playerSeat()?.position[2] ?? -43) + 1.1;
    },
    radius: 2,
    action: "Return to your seat",
    title: "Council",
    text: "",
  },
] as const;
export function nearbyInterest(x: number, z: number) {
  return (
    INTERESTS.find(
      (p) =>
        (p.id !== "seat" || !!playerSeat()) &&
        Math.hypot(p.x - x, p.z - z) < p.radius,
    ) || null
  );
}
type Snapshot = {
  open: string | null;
  ballot: string;
  folded: boolean;
  deposited: boolean;
};
class Interactions {
  private value: Snapshot = {
    open: null,
    ballot: "",
    folded: false,
    deposited: false,
  };
  cameraSuppressed = false;
  private listeners = new Set<() => void>();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.value;
  private set(value: Snapshot) {
    this.value = value;
    this.listeners.forEach((fn) => fn());
  }
  open = (id: string) => this.set({ ...this.value, open: id });
  close = () => {
    this.cameraSuppressed = true;
    this.set({ ...this.value, open: null });
  };
  fold = (name: string) => {
    const ballot = name.trim().slice(0, 32);
    if (ballot && !this.value.folded)
      this.set({ open: null, ballot, folded: true, deposited: false });
  };
  deposit = () => {
    if (this.value.folded && !this.value.deposited)
      this.set({ ...this.value, deposited: true });
  };
  reset = () => {
    this.cameraSuppressed = false;
    this.set({ open: null, ballot: "", folded: false, deposited: false });
  };
}
export const tribalInteractions = new Interactions();
