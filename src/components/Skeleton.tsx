"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClass = "skeleton animate-pulse";

  const getVariantClass = () => {
    switch (variant) {
      case "circular":
        return "rounded-full";
      case "rectangular":
        return "rounded-lg";
      case "card":
        return "rounded-2xl";
      case "text":
      default:
        return "rounded";
    }
  };

  const style: React.CSSProperties = {
    width: width || (variant === "text" ? "100%" : undefined),
    height: height || (variant === "text" ? "1em" : undefined),
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClass} ${getVariantClass()} ${className}`}
      style={style}
    />
  ));

  if (count === 1) {
    return skeletons[0];
  }

  return <div className="space-y-2">{skeletons}</div>;
}

// Pre-built skeleton patterns
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-md space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      </div>
      <Skeleton variant="text" count={2} height={16} />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height={18} />
        <Skeleton variant="text" width="40%" height={14} />
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="rectangular" width={64} height={64} className="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="50%" height={24} />
          <Skeleton variant="text" width="30%" height={16} />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <Skeleton variant="text" width="40%" height={14} className="mb-2" />
      <Skeleton variant="text" width="60%" height={28} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="space-y-3">
        <Skeleton variant="text" width="30%" height={20} />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
