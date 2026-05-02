import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { useConsultationFeedback, FEEDBACK_TAGS } from "@/hooks/useConsultationFeedback";
import { cn } from "@/lib/utils";

interface ConsultationFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  doctorId: string;
  doctorName?: string | null;
}

export function ConsultationFeedbackDialog({
  open,
  onOpenChange,
  appointmentId,
  doctorId,
  doctorName,
}: ConsultationFeedbackDialogProps) {
  const { existingFeedback, isLoadingFeedback, submitFeedback } =
    useConsultationFeedback(appointmentId);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    submitFeedback.mutate(
      {
        appointment_id: appointmentId,
        doctor_id: doctorId,
        rating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
        is_anonymous: isAnonymous,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  // Already submitted state
  if (existingFeedback) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <h3 className="text-lg font-semibold">Feedback Submitted</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-6 w-6",
                    star <= existingFeedback.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            {existingFeedback.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {existingFeedback.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {existingFeedback.comment && (
              <p className="text-sm text-muted-foreground italic text-center">
                "{existingFeedback.comment}"
              </p>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Visit</DialogTitle>
          <DialogDescription>
            How was your consultation with{" "}
            {doctorName ? `Dr. ${doctorName}` : "your doctor"}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      "h-9 w-9 transition-colors",
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30 hover:text-yellow-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {rating === 0
                ? "Tap a star to rate"
                : rating <= 2
                ? "We're sorry to hear that"
                : rating <= 3
                ? "Thank you for the feedback"
                : "Glad you had a good experience!"}
            </p>
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Feedback (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all text-xs",
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Additional Comments (optional)</Label>
            <Textarea
              placeholder="Share any additional thoughts about your visit..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="anonymous" className="text-sm">
              Submit anonymously
            </Label>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitFeedback.isPending}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
