export function DataNotice({
  editorialMode,
  sportsMode,
}: {
  editorialMode: string;
  sportsMode?: string;
}) {
  return (
    <aside className="site-data-notice">
      {editorialMode === "example" || sportsMode === "example"
        ? "Eksempelvisning med lokale testdata. Ikke aktuelle klubdata. "
        : editorialMode === "development" || sportsMode === "development"
          ? "Forhåndsvisning fra udviklingsdata. "
          : "Forsidens indhold er endnu ikke tilsluttet. "}
      Indhold og kampdata opdateres, når siden bygges igen.
    </aside>
  );
}
