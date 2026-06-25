import { HomeInteractive } from "@/components/HomeInteractive";
import { getCaseStudies } from "@/lib/projects";

export default function Home() {
  const studies = getCaseStudies();
  return <HomeInteractive studies={studies} />;
}
