import { SportsView } from "./sports-view";
import { VisualDirections } from "./homepage-prototype/visual-directions";

export default function Home() {
  return process.env.NODE_ENV === "development"
    ? <VisualDirections />
    : <SportsView view="kampe" />;
}
