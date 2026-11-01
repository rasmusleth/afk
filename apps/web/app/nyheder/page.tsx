import Link from "next/link";
import { loadEditorial } from "../../lib/editorial-data";
import { DataNotice } from "../../components/data-notice";
import { PageIntro } from "../../components/page-intro";
export const metadata = { title: "Nyheder · Aalborg Futsal Klub" };
export default async function News() {
  const { data, mode } = await loadEditorial();
  return (
    <main id="indhold" tabIndex={-1}>
      <PageIntro
        eyebrow="Aalborg Futsal Klub · Fra klubben"
        title="Nyheder"
        description="Historierne fra holdet og hverdagen omkring klubben."
      />
      <DataNotice editorialMode={mode} />
      <div className="news-index">
        {data?.news.length ? (
          data.news.map((article) => (
            <article key={article._id}>
              <time dateTime={article.publishedAt}>
                {new Intl.DateTimeFormat("da-DK", {
                  dateStyle: "long",
                  timeZone: "Europe/Copenhagen",
                }).format(new Date(article.publishedAt))}
              </time>
              <h2>
                <Link href={`/nyheder/${article.slug}/`}>{article.title}</Link>
              </h2>
              <p>{article.excerpt}</p>
              <Link href={`/nyheder/${article.slug}/`}>Læs historien ↗</Link>
            </article>
          ))
        ) : (
          <p>Der er ingen udgivne nyheder endnu.</p>
        )}
      </div>
    </main>
  );
}
