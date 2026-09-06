import { useEffect, useState } from "react";
import { useNavigation } from "react-router";
import { cn } from "@/lib/utils";

/** 路由过渡进度（TOKEN-007）：高度/颜色来自 token；reduced-motion 下静态显示（NN-018）。 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const active = navigation.state === "loading";
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!active) {
      setWidth(100);
      const t = setTimeout(() => setWidth(0), 250);
      return () => clearTimeout(t);
    }
    setWidth(30);
    const timer = setInterval(() => setWidth((w) => Math.min(90, w + 10)), 250);
    return () => clearInterval(timer);
  }, [active]);

  if (width <= 0) return null;
  return (
    <div
      role="progressbar"
      aria-label="页面加载进度"
      className="fixed inset-x-0 top-0 z-[70]"
      style={{ height: "var(--layout-navigation-progress-height)" }}
    >
      <div
        className={cn("h-full bg-brand transition-[width] duration-200 ease-out")}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
