import { Link } from "react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";

export function NotFoundPage({ redirectTo }: { redirectTo?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<Compass />}
        title="页面不存在"
        description="你访问的页面不存在或已被移动。"
        action={
          redirectTo ? (
            <Button variant="outline">
              <Link to={redirectTo}>进入收件箱</Link>
            </Button>
          ) : (
            <Button variant="outline">
              <Link to="/inbox">返回首页</Link>
            </Button>
          )
        }
      />
    </div>
  );
}
