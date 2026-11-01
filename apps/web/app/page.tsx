import type { Metadata } from "next";
import { Homepage } from "../components/homepage/homepage";
import { loadEditorial } from "../lib/editorial-data";
import { loadSports } from "../lib/sports-data";
export async function generateMetadata(): Promise<Metadata> {
  const { data } = await loadEditorial();
  return {
    title: "Aalborg Futsal Klub",
    description:
      data?.homepage.seoDescription ??
      "Kampe, nyheder og menneskerne i Aalborg Futsal Klub.",
  };
}
export default async function Home() {
  const [content, sports] = await Promise.all([loadEditorial(), loadSports()]);
  return <Homepage content={content} sports={sports} />;
}
