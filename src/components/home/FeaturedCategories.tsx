import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    name: "Club Jersey",
    slug: "club-jersey",
    emoji: "🏟️",
    description: "Official club kits & replicas",
    color: "from-red-500/10 to-red-500/5",
  },
  {
    name: "National Team",
    slug: "national-team",
    emoji: "🌍",
    description: "World Cup & national team jerseys",
    color: "from-blue-500/10 to-blue-500/5",
  },
  {
    name: "Retro Jersey",
    slug: "retro",
    emoji: "🏆",
    description: "Classic & vintage designs",
    color: "from-amber-500/10 to-amber-500/5",
  },
  {
    name: "Winter",
    slug: "winter",
    emoji: "🧥",
    description: "Hoodies, jackets & winter wear",
    color: "from-sky-500/10 to-sky-500/5",
  },
  {
    name: "Trouser",
    slug: "trouser",
    emoji: "👖",
    description: "Training & sports trousers",
    color: "from-green-500/10 to-green-500/5",
  },
  {
    name: "Football Accessories",
    slug: "football-accessories",
    emoji: "⚽",
    description: "Boots, gloves, balls & more",
    color: "from-orange-500/10 to-orange-500/5",
  },
];

export function FeaturedCategories() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Find your perfect product
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className={`group relative p-5 rounded-xl bg-gradient-to-br ${cat.color} border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300`}
          >
            <div className="text-3xl mb-3">{cat.emoji}</div>
            <h3 className="font-semibold text-sm">{cat.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {cat.description}
            </p>
            <ArrowRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" />
          </Link>
        ))}
      </div>
    </section>
  );
}
