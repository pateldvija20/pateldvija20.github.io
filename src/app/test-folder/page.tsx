import { FolderCard } from "@/components/FolderCard"

export default function TestFolderPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        padding: 40,
      }}
    >
      <FolderCard />
    </main>
  )
}
