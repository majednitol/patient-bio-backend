import { Linkedin, Twitter, Mail, Pencil, Trash2, Github, Globe, Phone, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamMember } from "@/hooks/useTeamMembers";

interface TeamMemberCardProps {
  member: TeamMember;
  isEditable?: boolean;
  onEdit?: (member: TeamMember) => void;
  onDelete?: (id: string) => void;
  onToggleVisibility?: (member: TeamMember) => void;
}

const TeamMemberCard = ({ member, isEditable, onEdit, onDelete, onToggleVisibility }: TeamMemberCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className={`group relative p-6 sm:p-8 rounded-2xl bg-card dark:bg-card border border-border/50 dark:border-border/60 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-500 text-center ${member.is_visible === false ? 'opacity-50' : ''}`}>
      {member.is_visible === false && (
        <Badge variant="secondary" className="absolute top-3 left-3 z-10">
          Hidden
        </Badge>
      )}
      {isEditable && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleVisibility(member)}
              title={member.is_visible === false ? "Show on public page" : "Hide from public page"}
            >
              {member.is_visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit?.(member)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete?.(member.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="relative mx-auto mb-6 w-20 h-20 sm:w-28 sm:h-28">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 scale-110 transition-all duration-500 blur-md" />
        {member.profile_image_url ? (
          <img
            src={member.profile_image_url}
            alt={member.name}
            className="relative w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-500 ring-2 ring-border dark:ring-border/80 group-hover:ring-primary/40"
          />
        ) : (
          <div
            className={`relative w-full h-full rounded-full bg-gradient-to-br ${member.gradient || "from-primary to-secondary"} flex items-center justify-center text-primary-foreground text-xl sm:text-2xl font-bold group-hover:scale-105 transition-transform duration-500 ring-2 ring-border dark:ring-border/80 group-hover:ring-primary/40`}
          >
            {getInitials(member.name)}
          </div>
        )}
      </div>

      <h3 className="text-lg sm:text-xl font-bold mb-1.5 text-foreground dark:text-foreground">{member.name}</h3>
      <p className="text-primary dark:text-primary font-semibold text-xs sm:text-sm mb-3 tracking-wide uppercase">{member.role}</p>
      {member.bio && (
        <p className="text-muted-foreground text-xs sm:text-sm mb-4 line-clamp-3 leading-relaxed">
          {member.bio}
        </p>
      )}

      <div className="flex justify-center flex-wrap gap-2">
        {member.linkedin_url && (
          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110" title="LinkedIn">
            <Linkedin className="h-4 w-4" />
          </a>
        )}
        {member.twitter_url && (
          <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110" title="X (Twitter)">
            <Twitter className="h-4 w-4" />
          </a>
        )}
        {member.github_url && (
          <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110" title="GitHub">
            <Github className="h-4 w-4" />
          </a>
        )}
        {member.website_url && (
          <a href={member.website_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110" title="Website">
            <Globe className="h-4 w-4" />
          </a>
        )}
        {member.email && (
          <a href={`mailto:${member.email}`} className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110" title="Email">
            <Mail className="h-4 w-4" />
          </a>
        )}
        {member.phone && (
          <a href={`tel:${member.phone}`} className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110" title="Phone">
            <Phone className="h-4 w-4" />
          </a>
        )}
        {!member.linkedin_url && !member.twitter_url && !member.github_url && !member.website_url && !member.email && !member.phone && (
          <div className="flex gap-2">
            <span className="p-2 rounded-lg bg-muted text-muted-foreground/30">
              <Linkedin className="h-4 w-4" />
            </span>
            <span className="p-2 rounded-lg bg-muted text-muted-foreground/30">
              <Twitter className="h-4 w-4" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMemberCard;
