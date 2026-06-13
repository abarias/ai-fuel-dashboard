import "./app.css";
import { useProviders } from "./store/useProviders";
import Widget from "./components/Widget";
import PillWidget from "./components/PillWidget";

export default function App() {
  const { widgetState } = useProviders();
  return widgetState.viewMode === "pill" ? <PillWidget /> : <Widget />;
}
