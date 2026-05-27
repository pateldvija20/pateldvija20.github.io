"use client";

import { useState } from "react";
import LoadingScreen from "@/components/Loading/LoadingScreen";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}
      <div
        style={{
          minHeight: "100vh",
          background: "#F3F2EE",
        }}
      />
    </>
  );
}
