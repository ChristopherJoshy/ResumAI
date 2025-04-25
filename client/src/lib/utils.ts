import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDateString(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getSkillIcon(category: string): string {
  switch (category.toLowerCase()) {
    case "programming":
      return "code";
    case "database":
      return "database";
    case "ai":
      return "brain";
    case "analysis":
      return "chart-line";
    case "cloud":
      return "cloud";
    case "devops":
      return "server";
    case "design":
      return "paint-brush";
    case "project management":
      return "tasks";
    default:
      return "cog";
  }
}

export function getSkillColorClass(category: string): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (category.toLowerCase()) {
    case "programming":
      return {
        bg: "bg-primary-100",
        text: "text-primary-800",
        icon: "text-primary-600",
      };
    case "database":
      return {
        bg: "bg-secondary-100",
        text: "text-secondary-800",
        icon: "text-secondary-600",
      };
    case "ai":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: "text-green-600",
      };
    case "analysis":
      return {
        bg: "bg-amber-100",
        text: "text-amber-800",
        icon: "text-amber-600",
      };
    case "cloud":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: "text-blue-600",
      };
    case "devops":
      return {
        bg: "bg-purple-100",
        text: "text-purple-800",
        icon: "text-purple-600",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        icon: "text-gray-600",
      };
  }
}

export function getLevelClass(level: string): {
  bg: string;
  text: string;
} {
  switch (level.toLowerCase()) {
    case "beginner":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "intermediate":
      return { bg: "bg-secondary-100", text: "text-secondary-800" };
    case "advanced":
      return { bg: "bg-primary-100", text: "text-primary-800" };
    case "expert":
      return { bg: "bg-green-100", text: "text-green-800" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800" };
  }
}

export function getImprovementClass(type: string): {
  bg: string;
  border: string;
  text: string;
  icon: string;
  iconClass: string;
} {
  switch (type.toLowerCase()) {
    case "suggestion":
      return {
        bg: "bg-amber-50",
        border: "border-amber-500",
        text: "text-amber-700",
        icon: "lightbulb",
        iconClass: "text-amber-500",
      };
    case "missing":
      return {
        bg: "bg-red-50",
        border: "border-red-500",
        text: "text-red-700",
        icon: "exclamation-circle",
        iconClass: "text-red-500",
      };
    case "strength":
      return {
        bg: "bg-green-50",
        border: "border-green-500",
        text: "text-green-700",
        icon: "check-circle",
        iconClass: "text-green-500",
      };
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-500",
        text: "text-gray-700",
        icon: "info-circle",
        iconClass: "text-gray-500",
      };
  }
}

export function getMatchScoreColor(score: number): string {
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 70) return "bg-amber-100 text-amber-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function getGapIndicator(gap: number): { icon: string; color: string } {
  if (gap <= 5) {
    return { icon: "check", color: "text-green-500" };
  } else if (gap <= 15) {
    return { icon: "arrow-up", color: "text-amber-500" };
  } else {
    return { icon: "arrow-up", color: "text-red-500" };
  }
}
