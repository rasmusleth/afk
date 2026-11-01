import Image from "next/image";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { EditorialImage as Photo } from "../lib/editorial";

export interface ImageContext {
  projectId: string;
  dataset: string;
}
export function editorialImageUrls(image: Photo, context: ImageContext) {
  const builder = createImageUrlBuilder(context)
    .image(image)
    .auto("format")
    .fit("crop");
  return [480, 800, 1200].map((width) => ({
    width,
    url: builder
      .width(width)
      .height(Math.round((width * 2) / 3))
      .url(),
  }));
}
export function EditorialImage({
  image,
  context,
  className = "",
  sizes = "(max-width: 700px) 90vw, 50vw",
  eager = false,
}: {
  image: Photo;
  context: ImageContext;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  // Native responsive CDN URLs preserve crop/hotspot without an image-optimization server.
  const builder = createImageUrlBuilder(context)
    .image(image)
    .auto("format")
    .fit("crop");
  const sources = editorialImageUrls(image, context)
    .map((source) => `${source.url} ${source.width}w`)
    .join(", ");
  return (
    <picture>
      <source srcSet={sources} sizes={sizes} />
      <Image
        unoptimized
        loading={eager ? "eager" : "lazy"}
        src={builder.width(1200).height(800).url()}
        width={1200}
        height={800}
        alt={image.alt}
        className={`h-auto w-full object-cover ${className}`}
      />
    </picture>
  );
}
