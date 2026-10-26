/** Presentation roster. Season adapters pass the actual attending IDs here.
 * 0 is the local player; Jeff (-1) and jurors never occupy contestant stools. */
export const DEFAULT_ATTENDEES = Object.freeze([4, 11, 13, 18, 0]);
class Attendance {
  private ids: readonly number[] = DEFAULT_ATTENDEES;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.ids;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  setParticipants = (ids: readonly number[]) => {
    if (
      ids.length > 12 ||
      ids.some((id) => !Number.isSafeInteger(id) || id < 0) ||
      new Set(ids).size !== ids.length
    )
      throw new Error(
        "Council requires 0–12 unique contestant IDs; host and jury are separate",
      );
    this.ids = Object.freeze([...ids]);
    this.listeners.forEach((fn) => fn());
  };
  reset = () => this.setParticipants(DEFAULT_ATTENDEES);
}
export const councilAttendance = new Attendance();
