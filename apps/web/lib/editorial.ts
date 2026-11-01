/** Published editorial boundary. Reject invalid required content before exporting a site. */
export interface EditorialImage {
  asset: { _ref: string };
  alt: string;
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number; width: number; height: number };
}
export interface TextBlock {
  _key: string;
  style: "normal" | "h2";
  children: { _key: string; text: string; marks: string[] }[];
  markDefs: { _key: string; href: string }[];
}
export interface HomepageContent {
  heroTitle: string;
  heroAccent: string;
  heroIntro: string;
  newsHeading: string;
  competitionId?: string;
  clubTitle: string;
  clubText: string;
  clubImage?: EditorialImage;
  contactTitle: string;
  contactText: string;
  contactName: string;
  contactEmail: string;
  trainingInfo?: string;
  seoDescription: string;
}
export interface NewsArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  image?: EditorialImage;
  body: TextBlock[];
}
export interface EditorialSnapshot {
  homepage: HomepageContent;
  news: NewsArticle[];
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid editorial object.");
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Invalid editorial field: ${name}`);
  return value.trim();
}
function id(value: unknown): string {
  const result = string(value, "document ID");
  if (/^(drafts|versions)\./.test(result))
    throw new Error("Unpublished editorial document.");
  return result;
}
export function safeWebUrl(value: string): boolean {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
function image(value: unknown): EditorialImage | undefined {
  if (value == null) return;
  const raw = object(value);
  const ref = string(object(raw.asset)._ref, "image asset");
  if (!/^image-[a-zA-Z0-9]+-\d+x\d+-(jpg|jpeg|png|webp|gif|avif)$/.test(ref))
    throw new Error("Invalid image asset reference.");
  function fractions(value: unknown, keys: string[]) {
    const raw = object(value);
    for (const key of keys)
      if (
        typeof raw[key] !== "number" ||
        !Number.isFinite(raw[key]) ||
        raw[key] < 0 ||
        raw[key] > 1
      )
        throw new Error("Invalid image crop/hotspot.");
    return raw as Record<string, number>;
  }
  const crop =
    raw.crop == null
      ? undefined
      : fractions(raw.crop, ["top", "bottom", "left", "right"]);
  const hotspot =
    raw.hotspot == null
      ? undefined
      : fractions(raw.hotspot, ["x", "y", "width", "height"]);
  if (crop && (crop.left + crop.right >= 1 || crop.top + crop.bottom >= 1))
    throw new Error("Empty image crop.");
  if (hotspot && (!hotspot.width || !hotspot.height))
    throw new Error("Empty image hotspot.");
  return {
    asset: { _ref: ref },
    alt: string(raw.alt, "image description", 200),
    crop: crop && {
      top: crop.top,
      bottom: crop.bottom,
      left: crop.left,
      right: crop.right,
    },
    hotspot: hotspot && {
      x: hotspot.x,
      y: hotspot.y,
      width: hotspot.width,
      height: hotspot.height,
    },
  };
}
function blocks(value: unknown): TextBlock[] {
  if (!Array.isArray(value) || !value.length)
    throw new Error("Article text is required.");
  const blockKeys = new Set<string>();
  return value.map((item) => {
    const raw = object(item),
      key = string(raw._key, "block key");
    if (
      blockKeys.has(key) ||
      raw._type !== "block" ||
      !["normal", "h2"].includes(String(raw.style)) ||
      raw.listItem
    )
      throw new Error("Unsupported article block.");
    blockKeys.add(key);
    if (
      !Array.isArray(raw.markDefs ?? []) ||
      !Array.isArray(raw.children) ||
      !raw.children.length
    )
      throw new Error("Invalid article spans.");
    const markDefs = ((raw.markDefs ?? []) as unknown[]).map((item) => {
      const mark = object(item),
        href = string(mark.href, "article link");
      if (mark._type !== "link" || !safeWebUrl(href))
        throw new Error("Unsafe article link.");
      return { _key: string(mark._key, "link key"), href };
    });
    const marks = new Set([
      "strong",
      "em",
      ...markDefs.map((mark) => mark._key),
    ]);
    const childKeys = new Set<string>();
    const children = raw.children.map((item) => {
      const span = object(item),
        key = string(span._key, "span key");
      if (
        span._type !== "span" ||
        typeof span.text !== "string" ||
        childKeys.has(key) ||
        !Array.isArray(span.marks ?? [])
      )
        throw new Error("Invalid article span.");
      childKeys.add(key);
      const decorators = (span.marks ?? []) as unknown[];
      if (
        !decorators.every(
          (mark): mark is string => typeof mark === "string" && marks.has(mark),
        )
      )
        throw new Error("Unsupported article mark.");
      return { _key: key, text: span.text, marks: decorators };
    });
    return {
      _key: key,
      style: raw.style as TextBlock["style"],
      children,
      markDefs,
    };
  });
}
export function parseEditorial(
  value: unknown,
  now = new Date(),
): EditorialSnapshot {
  const raw = object(value),
    home = object(raw.homepage);
  if (home._id !== "homepage")
    throw new Error("Publish the required homepage document.");
  const homepage: HomepageContent = {
    heroTitle: string(home.heroTitle, "heroTitle", 40),
    heroAccent: string(home.heroAccent, "heroAccent", 30),
    heroIntro: string(home.heroIntro, "heroIntro", 250),
    newsHeading: string(home.newsHeading, "newsHeading", 80),
    clubTitle: string(home.clubTitle, "clubTitle", 100),
    clubText: string(home.clubText, "clubText", 1500),
    clubImage: image(home.clubImage),
    contactTitle: string(home.contactTitle, "contactTitle", 100),
    contactText: string(home.contactText, "contactText", 700),
    contactName: string(home.contactName, "contactName", 100),
    contactEmail: string(home.contactEmail, "contactEmail", 254),
    trainingInfo: home.trainingInfo
      ? string(home.trainingInfo, "trainingInfo", 700)
      : undefined,
    seoDescription: string(home.seoDescription, "seoDescription", 200),
    competitionId:
      home.featuredCompetition == null
        ? undefined
        : id(object(home.featuredCompetition)._ref),
  };
  if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(homepage.contactEmail))
    throw new Error("Invalid contact email.");
  if (!Array.isArray(raw.news)) throw new Error("Missing news collection.");
  const ids = new Set<string>(),
    slugs = new Set<string>();
  const news = raw.news
    .map((item) => {
      const doc = object(item),
        articleId = id(doc._id),
        slug = string(object(doc.slug).current, "slug", 80);
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        ids.has(articleId) ||
        slugs.has(slug)
      )
        throw new Error("Invalid or duplicate article ID/slug.");
      ids.add(articleId);
      slugs.add(slug);
      const publishedAt = string(doc.publishedAt, "publishedAt");
      if (
        !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedAt) ||
        !Number.isFinite(Date.parse(publishedAt))
      )
        throw new Error("Invalid publication date.");
      return {
        _id: articleId,
        slug,
        publishedAt,
        title: string(doc.title, "article title", 150),
        excerpt: string(doc.excerpt, "excerpt", 350),
        image: image(doc.image),
        body: blocks(doc.body),
      };
    })
    .filter((article) => Date.parse(article.publishedAt) <= now.getTime())
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
        a._id.localeCompare(b._id),
    );
  return { homepage, news };
}
