"use client";

import { useState } from "react";
import LoadingScreen from "@/components/Loading/LoadingScreen";
import { HomeInteractive } from "@/components/HomeInteractive";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}
      {loaded && <HomeInteractive />}
    </>
  );
}
