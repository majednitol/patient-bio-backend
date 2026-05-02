import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Newspaper, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentLoader } from "@/components/ui/ContentLoader";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useBlogPosts } from "@/hooks/useBlogPosts";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "achievement", label: "Achievements" },
  { value: "healthcare_tips", label: "Healthcare Tips" },
  { value: "news", label: "News" },
  { value: "video", label: "Video" },
];

const categoryColor: Record<string, string> = {
  achievement: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  healthcare_tips: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  news: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  video: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function BlogPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState("all");
  const { data: posts, isLoading } = useBlogPosts({ category, publishedOnly: true });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 sm:py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              {t("blog.heroTitle", "Blog")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("blog.heroSubtitle", "National & international achievements, healthcare tips, news, and video content from Patient Bio.")}
            </p>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="container mx-auto px-4 -mt-6">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c.value} value={c.value} className="text-sm">
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </section>

        {/* Posts Grid */}
        <section className="container mx-auto px-4 py-10">
          {isLoading ? (
            <ContentLoader />
          ) : !posts?.length ? (
            <div className="text-center py-20">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {t("blog.noPosts", "No blog posts yet. Create your first one!")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {post.cover_image_url ? (
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {post.category === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <PlayCircle className="h-12 w-12 text-white/90" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {post.category === "video" ? (
                        <PlayCircle className="h-12 w-12 text-muted-foreground/30" />
                      ) : (
                        <Newspaper className="h-12 w-12 text-muted-foreground/30" />
                      )}
                    </div>
                  )}
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={categoryColor[post.category] || ""} variant="secondary">
                        {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                      </Badge>
                      {post.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.published_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
