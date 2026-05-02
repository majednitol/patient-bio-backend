import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft, ExternalLink,
  Save, FileText, Image as ImageIcon, Upload, Loader2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { SearchInput } from "@/components/admin/SearchInput";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import {
  useBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost,
  BlogPost,
} from "@/hooks/useBlogPosts";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "achievement", label: "Achievements" },
  { value: "healthcare_tips", label: "Healthcare Tips" },
  { value: "news", label: "News" },
  { value: "video", label: "Video" },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "news",
  cover_image_url: "",
  video_url: "",
  is_published: false,
  published_at: null as string | null,
  author_name: "",
};

type FormState = typeof emptyForm;

/* ─── List View ────────────────────────────────────────────── */

function BlogListView({
  onEdit,
  onCreate,
}: {
  onEdit: (post: BlogPost) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: posts, isLoading } = useBlogPosts({
    publishedOnly: false,
    search: debouncedSearch || undefined,
    category: filterCategory !== "all" ? filterCategory : undefined,
  });

  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  // Count posts per category (from unfiltered data for badges)
  const { data: allPosts } = useBlogPosts({ publishedOnly: false });
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPosts?.length || 0 };
    CATEGORIES.forEach((c) => {
      counts[c.value] = allPosts?.filter((p) => p.category === c.value).length || 0;
    });
    return counts;
  }, [allPosts]);

  const togglePublish = (post: BlogPost) => {
    updatePost.mutate({
      id: post.id,
      is_published: !post.is_published,
      published_at: !post.is_published ? new Date().toISOString() : null,
    });
  };

  const categoryLabel = (val: string) =>
    CATEGORIES.find((c) => c.value === val)?.label || val;

  if (isLoading) return <ContentLoader />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("blog.manageBlog", "Manage Blog")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("blog.manageBlogDesc", "Create, edit and publish blog posts")}
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("blog.createPost", "Create Post")}
        </Button>
      </div>

      {/* Search + Category Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search posts by title..."
          className="sm:max-w-xs"
        />
        <Tabs value={filterCategory} onValueChange={setFilterCategory} className="flex-1">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{categoryCounts.all}</Badge>
            </TabsTrigger>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {categoryCounts[c.value] || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>{t("blog.title", "Title")}</TableHead>
              <TableHead>{t("blog.category", "Category")}</TableHead>
              <TableHead>Words</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t("blog.noPosts", "No blog posts yet. Create your first one!")}
                </TableCell>
              </TableRow>
            )}
            {posts?.map((post) => (
              <TableRow key={post.id} className="cursor-pointer" onClick={() => onEdit(post)}>
                {/* Thumbnail */}
                <TableCell className="pr-0">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-9 w-14 rounded object-cover bg-muted"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-9 w-14 rounded bg-muted flex items-center justify-center">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium max-w-[220px] truncate">{post.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{categoryLabel(post.category)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {wordCount(post.content)}
                </TableCell>
                <TableCell>
                  <Badge variant={post.is_published ? "default" : "outline"}>
                    {post.is_published ? t("blog.published", "Published") : t("blog.draft", "Draft")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(post.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    {post.is_published && (
                      <Button variant="ghost" size="icon" asChild title="Preview">
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => togglePublish(post)}
                      title={post.is_published ? "Unpublish" : "Publish"}
                    >
                      {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(post)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("blog.deleteConfirm", "Are you sure you want to delete this post? This cannot be undone.")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePost.mutate(post.id)}>
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ─── Editor View ──────────────────────────────────────────── */

function BlogEditorView({
  editingId,
  initialForm,
  onBack,
}: {
  editingId: string | null;
  initialForm: FormState;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const [form, setForm] = useState<FormState>(initialForm);
  const [dirty, setDirty] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_COVER_SIZE = 2 * 1024 * 1024;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      toast({ title: "File too large", description: "Please upload an image smaller than 2MB.", variant: "destructive" });
      return;
    }

    setCoverUploading(true);
    try {
      // Delete old cover if it was uploaded to our bucket
      if (form.cover_image_url?.includes("/avatars/blog-covers/")) {
        const oldPath = form.cover_image_url.split("/avatars/")[1];
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const safeName = slugify(file.name.replace(/\.[^.]+$/, ""));
      const fileName = `blog-covers/${Date.now()}-${safeName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      update({ cover_image_url: urlData.publicUrl });
      setImageError(false);
      toast({ title: "Cover image uploaded!" });
    } catch (error: any) {
      console.error("Cover upload error:", error);
      toast({ title: "Upload failed", description: error.message || "Failed to upload image.", variant: "destructive" });
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleRemoveCover = async () => {
    if (form.cover_image_url?.includes("/avatars/blog-covers/")) {
      const oldPath = form.cover_image_url.split("/avatars/")[1];
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    }
    update({ cover_image_url: "" });
    setImageError(false);
  };

  const update = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleTitleChange = (title: string) => {
    update({ title, ...(editingId ? {} : { slug: slugify(title) }) });
  };

  const handleBack = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
    onBack();
  };

  const handleSubmit = (publish?: boolean) => {
    const isPublished = publish !== undefined ? publish : form.is_published;
    const payload = {
      ...form,
      is_published: isPublished,
      cover_image_url: form.cover_image_url || null,
      video_url: form.video_url || null,
      excerpt: form.excerpt || null,
      author_name: form.author_name || null,
      published_at: isPublished
        ? form.published_at || new Date().toISOString()
        : null,
    };

    if (editingId) {
      updatePost.mutate({ id: editingId, ...payload }, { onSuccess: () => { setDirty(false); onBack(); } });
    } else {
      createPost.mutate(payload, { onSuccess: () => onBack() });
    }
  };

  const isBusy = createPost.isPending || updatePost.isPending;
  const words = wordCount(form.content);
  const chars = form.content.length;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-lg">
            {editingId ? t("blog.editPost", "Edit Post") : t("blog.createPost", "Create Post")}
          </h2>
          {dirty && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Unsaved</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={!form.title || !form.slug || !form.content || isBusy}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={!form.title || !form.slug || !form.content || isBusy}
          >
            <Eye className="h-4 w-4 mr-2" />
            {form.is_published ? "Update & Publish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Main content column */}
          <div className="space-y-5 min-w-0">
            <div>
              <Label className="mb-1.5">{t("blog.title", "Title")}</Label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Post title"
                className="text-lg font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>{t("blog.content", "Content")}</Label>
                <span className="text-xs text-muted-foreground">
                  {words} words · {chars} chars
                </span>
              </div>
              <MarkdownEditor
                value={form.content}
                onChange={(v) => update({ content: v })}
                placeholder="Write your post in Markdown..."
                minRows={16}
              />
            </div>

            <div>
              <Label className="mb-1.5">{t("blog.excerpt", "Excerpt")}</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => update({ excerpt: e.target.value })}
                placeholder="Short summary for post cards..."
                rows={3}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div>
              <Label className="mb-1.5">{t("blog.slug", "Slug")}</Label>
              <Input
                value={form.slug}
                onChange={(e) => update({ slug: e.target.value })}
                placeholder="post-slug"
              />
            </div>

            <div>
              <Label className="mb-1.5">{t("blog.authorName", "Author Name")}</Label>
              <Input
                value={form.author_name}
                onChange={(e) => update({ author_name: e.target.value })}
                placeholder="Author name"
              />
            </div>

            <div>
              <Label className="mb-1.5">{t("blog.category", "Category")}</Label>
              <Select value={form.category} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cover image upload */}
            <div>
              <Label className="mb-1.5">{t("blog.coverImage", "Cover Image")}</Label>
              {form.cover_image_url && !imageError ? (
                <div className="relative mt-1 rounded-md overflow-hidden border bg-muted group">
                  <img
                    src={form.cover_image_url}
                    alt="Cover preview"
                    className="w-full h-40 object-cover"
                    onError={() => setImageError(true)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
                      <Upload className="h-3 w-3 mr-1" /> Replace
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={handleRemoveCover}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-1 border-2 border-dashed rounded-md h-40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                    "hover:border-primary/50 hover:bg-muted/50",
                    coverUploading && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverUploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload cover image</span>
                      <span className="text-xs text-muted-foreground">JPG, PNG or WebP · Max 2MB</span>
                    </>
                  )}
                </div>
              )}
              {imageError && (
                <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Could not load image
                </p>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>

            {/* Video URL (all categories) */}
            <div>
              <Label className="mb-1.5">
                {t("blog.videoUrl", "Video URL")}
                {form.category !== "video" && (
                  <span className="text-muted-foreground font-normal"> (optional)</span>
                )}
              </Label>
              <Input
                value={form.video_url}
                onChange={(e) => update({ video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => update({ is_published: v })}
              />
              <Label>{t("blog.publishNow", "Publish now")}</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page Root ────────────────────────────────────────────── */

export default function AdminBlogPage() {
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingId(post.id);
      setInitialForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content,
        category: post.category,
        cover_image_url: post.cover_image_url || "",
        video_url: post.video_url || "",
        is_published: post.is_published,
        published_at: post.published_at,
        author_name: post.author_name || "",
      });
    } else {
      setEditingId(null);
      setInitialForm(emptyForm);
    }
    setViewMode("editor");
  };

  if (viewMode === "editor") {
    return (
      <BlogEditorView
        editingId={editingId}
        initialForm={initialForm}
        onBack={() => setViewMode("list")}
      />
    );
  }

  return <BlogListView onEdit={openEditor} onCreate={() => openEditor()} />;
}
