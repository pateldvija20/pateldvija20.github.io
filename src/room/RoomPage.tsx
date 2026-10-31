import RoomLoader from "./RoomLoader";
import "./room.css";

/**
 * /room: the hairline room, built alongside the current site (decisions.md,
 * "Integration: additive route"). For now it is the loader alone; when the
 * three.js room exists it mounts here and takes over from the window
 * the loader leaves behind.
 */
export default function RoomPage() {
  return (
    <main className="hl-room">
      <RoomLoader />
    </main>
  );
}
