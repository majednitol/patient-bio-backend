import { useState } from "react";
import { useFollowUpReminders } from "@/hooks/useFollowUpReminders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ClipboardCheck, Plus, Trash2, CheckCircle2, Circle, ListTodo,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FollowUpChecklistProps {
  /** When provided, scopes to a single appointment */
  appointmentId?: string;
  /** Compact mode for embedding in cards */
  compact?: boolean;
}

const QUICK_TASKS = [
  { title: "Get lab tests done", type: "lab_test" },
  { title: "Pick up prescribed medications", type: "medication" },
  { title: "Schedule follow-up appointment", type: "follow_up" },
  { title: "Review dietary recommendations", type: "lifestyle" },
];

export function FollowUpChecklist({ appointmentId, compact = false }: FollowUpChecklistProps) {
  const { tasks, isLoading, pendingCount, completedCount, toggleTask, addTask, deleteTask } =
    useFollowUpReminders(appointmentId);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !appointmentId) return;
    try {
      await addTask({
        appointment_id: appointmentId,
        title: newTaskTitle.trim(),
      });
      setNewTaskTitle("");
      setIsAdding(false);
      toast({ title: "Task added", description: "Follow-up task has been added." });
    } catch {
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
    }
  };

  const handleQuickAdd = async (task: { title: string; type: string }) => {
    if (!appointmentId) return;
    try {
      await addTask({
        appointment_id: appointmentId,
        title: task.title,
        task_type: task.type,
      });
      toast({ title: "Task added", description: `"${task.title}" added to your checklist.` });
    } catch {
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0 && !appointmentId) return null;

  return (
    <Card className={cn(compact && "border-0 shadow-none")}>
      <CardHeader className={cn("pb-3", compact ? "px-0 pt-0" : "px-4 pt-4 sm:px-6 sm:pt-6")}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Follow-Up Tasks
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {pendingCount} pending
              </Badge>
            )}
            {completedCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 text-green-600">
                {completedCount} done
              </Badge>
            )}
          </CardTitle>
          {appointmentId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(compact ? "px-0 pb-0" : "px-4 pb-4 sm:px-6 sm:pb-6")}>
        <div className="space-y-2">
          {/* Task items */}
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-2.5 p-2 rounded-lg transition-colors group hover:bg-muted/50",
                task.is_completed && "opacity-60"
              )}
            >
              <button
                onClick={() => toggleTask({ taskId: task.id, completed: !task.is_completed })}
                className="mt-0.5 flex-shrink-0"
              >
                {task.is_completed ? (
                  <CheckCircle2 className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-green-500" />
                ) : (
                  <Circle className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs sm:text-sm",
                    task.is_completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                {task.due_date && (
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                    Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Empty state with quick-add */}
          {tasks.length === 0 && appointmentId && (
            <div className="text-center py-4">
              <ListTodo className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3">
                No follow-up tasks yet. Add common tasks:
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {QUICK_TASKS.map((qt) => (
                  <Button
                    key={qt.type}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] sm:text-xs px-2.5"
                    onClick={() => handleQuickAdd(qt)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {qt.title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Add task input */}
          {isAdding && (
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Enter follow-up task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                className="h-8 text-xs sm:text-sm"
                autoFocus
              />
              <Button size="sm" className="h-8 px-3 text-xs" onClick={handleAddTask}>
                Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
