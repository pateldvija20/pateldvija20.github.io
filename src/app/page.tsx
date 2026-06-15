import { HomeInteractive } from "@/components/HomeInteractive";
import { getCaseStudies } from "@/lib/notion";

export const revalidate = 3600;

export default async function Home() {
  const studies = await getCaseStudies();
  return <HomeInteractive studies={studies} />;
}
