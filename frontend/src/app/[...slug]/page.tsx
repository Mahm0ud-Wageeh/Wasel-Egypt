import ClientRootDynamic from "@/components/client-root-dynamic";

export function generateStaticParams() {
  return [
    { slug: ["login"] },
    { slug: ["register"] },
    { slug: ["auth"] },
    { slug: ["admin"] },
    { slug: ["admin", "network"] },
    { slug: ["admin", "fares"] },
    { slug: ["admin", "users"] },
    { slug: ["admin", "analytics"] },
    { slug: ["admin", "moderation"] },
    { slug: ["home"] },
    { slug: ["search"] },
    { slug: ["map"] },
    { slug: ["profile"] },
    { slug: ["notifications"] },
    { slug: ["community"] },
    { slug: ["active-journeys", "55"] },
    { slug: ["fares"] },
    { slug: ["metro"] },
    { slug: ["lrt"] },
    { slug: ["monorail"] },
    { slug: ["brt"] },
    { slug: ["train"] },
  ];
}

// Server wrapper (keeps generateStaticParams for `output: "export"`).
// The actual app renders client-only via ClientRootDynamic so SSR never
// snapshots the wrong route (e.g. /auth prerendered as "/").
export default function CatchAllPage() {
  return <ClientRootDynamic />;
}
