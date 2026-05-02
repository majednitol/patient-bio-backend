import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft, Calendar, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { Badge } from "@/components/ui/badge";
import { useBlogPost } from "@/hooks/useBlogPosts";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { data: post, isLoading, error } = useBlogPost(slug || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <ContentLoader />
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{t("blog.notFound", "Post not found")}</h1>
            <Link to="/blog" className="text-primary hover:underline">
              ← {t("blog.backToBlog", "Back to Blog")}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const youtubeId = post.video_url ? extractYouTubeId(post.video_url) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        <article className="container mx-auto px-4 py-10 max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("blog.backToBlog", "Back to Blog")}
          </Link>

          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full rounded-2xl object-cover aspect-video mb-8"
            />
          )}

          {youtubeId && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={post.title}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          <Badge variant="secondary" className="mb-3">
            {post.category.replace("_", " ")}
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            {post.author_name && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {post.author_name}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </span>
            )}
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
