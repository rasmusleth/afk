import type { ReactNode } from "react";
import type { TextBlock } from "../lib/editorial";
export function ArticleBody({ blocks }: { blocks: TextBlock[] }) {
  return (
    <div className="article-body">
      {blocks.map((block) => {
        const content = block.children.map((span) => {
          let node: ReactNode = span.text;
          for (const mark of span.marks) {
            if (mark === "strong") node = <strong>{node}</strong>;
            else if (mark === "em") node = <em>{node}</em>;
            else {
              const link = block.markDefs.find((item) => item._key === mark);
              if (link) node = <a href={link.href}>{node}</a>;
            }
          }
          return <span key={span._key}>{node}</span>;
        });
        return block.style === "h2" ? (
          <h2 key={block._key}>{content}</h2>
        ) : (
          <p key={block._key}>{content}</p>
        );
      })}
    </div>
  );
}
