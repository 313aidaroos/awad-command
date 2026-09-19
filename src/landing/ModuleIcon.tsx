import {
  House,
  ChartNoAxesCombined,
  Triangle,
  Users,
  HardHat,
  Moon,
  Box,
  Music,
  Film,
  BookOpen,
  Bot,
  Coffee,
  RotateCcw,
  Globe,
  Rocket,
  Star,
  Grid3X3,
} from "lucide-react";
const icons = {
  command: House,
  crypto: ChartNoAxesCombined,
  apixis: Triangle,
  socixis: Users,
  contraxis: HardHat,
  halaxis: Moon,
  rawixis: Box,
  lyrixis: Music,
  awadbot: Bot,
  qahwahworld: Coffee,
  recovra: RotateCcw,
  geoxis: Globe,
  launchixis: Rocket,
  "nursery-toons": Star,
  content: Film,
  books: BookOpen,
  analytics: ChartNoAxesCombined,
};
export function ModuleIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = icons[id as keyof typeof icons] ?? Grid3X3;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
