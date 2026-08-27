import {
  BookOpen,
  LineChart,
  ShieldCheck,
  Users,
  Landmark,
  ClipboardList,
  ClipboardCheck,
  FolderOpen,
  TrendingUp,
  Lock,
  ServerCog,
  GraduationCap,
  Cpu,
  HeartHandshake,
  Settings2,
  Mail,
  Phone,
  MapPin,
  Search,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

const ICONS = {
  BookOpen,
  LineChart,
  ShieldCheck,
  Users,
  Landmark,
  ClipboardList,
  ClipboardCheck,
  FolderOpen,
  TrendingUp,
  Lock,
  ServerCog,
  GraduationCap,
  Cpu,
  HeartHandshake,
  Settings2,
  Mail,
  Phone,
  MapPin,
  Search,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
};

/** Renders a lucide icon by its string name (used when icons live in data files). */
export default function Icon({ name, size = 20, className = "", strokeWidth = 2 }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
}
