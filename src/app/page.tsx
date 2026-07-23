import { HomeInteractive } from "@/components/HomeInteractive";
import { getCaseStudies } from "@/lib/projects";
import { getResume } from "@/lib/resume";

export default async function Home() {
  const studies = getCaseStudies();
  const resume = await getResume();
  return <HomeInteractive studies={studies} resume={resume} />;
}
