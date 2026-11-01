import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEditorial } from "../../../lib/editorial-data";
import { ArticleBody } from "../../../components/article-body";
import { EditorialImage } from "../../../components/editorial-image";
import { DataNotice } from "../../../components/data-notice";
export const dynamicParams = false;
export async function generateStaticParams() {
  const { data } = await loadEditorial();
  const articles = data?.news.map((article) => ({ slug: article.slug })) ?? [];
  // Next 16.4 static export requires at least one param. This reserved, invalid
  // article slug reaches notFound(), allowing a genuinely empty news collection.
  // Real article rendering is validated by the populated fixture export.
  return articles.length ? articles : [{ slug: "__empty__" }];
}
export async function generateMetadata({
  params,
}: PageProps<"/nyheder/[slug]">): Promise<Metadata> {
  const { slug } = await params,
    { data } = await loadEditorial();
  const article = data?.news.find((article) => article.slug === slug);
  return {
    title: article ? `${article.title} · Aalborg Futsal Klub` : "Nyhed",
    description: article?.excerpt,
  };
}
export default async function NewsArticle({
  params,
}: PageProps<"/nyheder/[slug]">) {
  const { slug } = await params,
    content = await loadEditorial();
  const article = content.data?.news.find((article) => article.slug === slug);
  if (!article) notFound();
  return (
    <main id="indhold" tabIndex={-1}>
      <article className="news-article">
        <Link href="/nyheder/">← Alle nyheder</Link>
        <header>
          <p className="eyebrow">
            Fra klubben ·{" "}
            <time dateTime={article.publishedAt}>
              {new Intl.DateTimeFormat("da-DK", {
                dateStyle: "long",
                timeZone: "Europe/Copenhagen",
              }).format(new Date(article.publishedAt))}
            </time>
          </p>
          <h1>{article.title}</h1>
          <p className="article-intro">{article.excerpt}</p>
        </header>
        <DataNotice editorialMode={content.mode} />
        {article.image && content.imageContext && (
          <EditorialImage
            image={article.image}
            context={content.imageContext}
          />
        )}
        <ArticleBody blocks={article.body} />
      </article>
    </main>
  );
}
