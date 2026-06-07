import { PurpleFile } from "@/components/PurpleFile"

export default function TestFolderPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        padding: 40,
      }}
    >
      <PurpleFile state="closed" />
    </main>
  )
}
