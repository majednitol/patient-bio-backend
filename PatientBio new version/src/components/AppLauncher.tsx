 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { 
   Grid3X3, 
   User, 
   Building2, 
   Stethoscope, 
   Microscope, 
   FlaskConical, 
   Shield,
   type LucideIcon
 } from "lucide-react";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Button } from "@/components/ui/button";
 import { cn } from "@/lib/utils";
 
 interface Portal {
   name: string;
   icon: LucideIcon;
   href: string;
   color: string;
   description: string;
 }
 
 const portals: Portal[] = [
   { 
     name: "Patient", 
     icon: User, 
     href: "/auth", 
     color: "bg-blue-500",
     description: "Health records"
   },
   { 
     name: "Hospital", 
     icon: Building2, 
     href: "/hospitals/login", 
     color: "bg-emerald-500",
     description: "Administration"
   },
   { 
     name: "Doctor", 
     icon: Stethoscope, 
     href: "/doctors/login", 
     color: "bg-purple-500",
     description: "Practice portal"
   },
    { 
      name: "Diagnostic", 
      icon: Microscope, 
      href: "/pathologist/login", 
     color: "bg-orange-500",
     description: "Diagnostics"
   },
   { 
     name: "Researcher", 
     icon: FlaskConical, 
     href: "/researcher/login", 
     color: "bg-cyan-500",
     description: "Research data"
   },
   { 
     name: "Admin", 
     icon: Shield, 
     href: "/admin", 
     color: "bg-rose-500",
     description: "Platform admin"
   },
 ];
 
 interface AppLauncherProps {
   className?: string;
 }
 
 const AppLauncher = ({ className }: AppLauncherProps) => {
   const [open, setOpen] = useState(false);
 
   return (
     <Popover open={open} onOpenChange={setOpen}>
       <PopoverTrigger asChild>
         <Button
           variant="ghost"
           size="icon"
           className={cn(
             "h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors",
             className
           )}
           aria-label="Open app launcher"
         >
           <Grid3X3 className="h-5 w-5 text-muted-foreground" />
         </Button>
       </PopoverTrigger>
        <PopoverContent 
          align="end" 
          
          sideOffset={8}
          
          className="w-[360px] p-0 bg-popover border border-border shadow-xl z-[9999]"
        >
         {/* Header */}
         <div className="px-4 py-3 border-b border-border">
           <h3 className="font-semibold text-foreground">Patient Bio</h3>
           <p className="text-xs text-muted-foreground">Select a portal to continue</p>
         </div>
         
         {/* Portal Grid */}
         <div className="p-3">
           <div className="grid grid-cols-3 gap-2">
             {portals.map((portal) => {
               const Icon = portal.icon;
               return (
                 <Link
                   key={portal.name}
                   to={portal.href}
                   onClick={() => setOpen(false)}
                   className={cn(
                     "flex flex-col items-center gap-2 p-3 rounded-xl",
                     "hover:bg-muted/80 transition-all duration-200",
                     "hover:scale-[1.02] active:scale-[0.98]",
                     "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
                     "group cursor-pointer"
                   )}
                 >
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center",
                     "transition-transform duration-200 group-hover:scale-105",
                     portal.color
                   )}>
                     <Icon className="h-5 w-5 text-white" />
                   </div>
                   <div className="text-center">
                     <span className="text-xs font-medium text-foreground block">
                       {portal.name}
                     </span>
                   </div>
                 </Link>
               );
             })}
           </div>
         </div>
       </PopoverContent>
     </Popover>
   );
 };
 
 export default AppLauncher;