import { Skeleton } from "@/components/ui/skeleton";

export default function TodosLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>

      <Skeleton className="h-[58px] w-full rounded-panel" />

      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-8 w-56 rounded-[9px]" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="mt-4 overflow-hidden rounded-panel border border-hairline bg-surface">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-b-0"
          >
            <Skeleton className="size-5 rounded-full" />
            <Skeleton
              className="h-4"
              style={{ width: `${["60%", "45%", "72%"][row]}` }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
