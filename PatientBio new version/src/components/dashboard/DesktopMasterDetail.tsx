import { ReactNode } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface DesktopMasterDetailProps {
  master: ReactNode;
  detail: ReactNode;
  masterMinSize?: number;
  detailMinSize?: number;
  defaultMasterSize?: number;
  showDetail?: boolean;
  className?: string;
}

/**
 * Desktop-optimized master/detail layout using resizable panels.
 * Renders side-by-side on lg+ screens, stacked on mobile.
 */
export const DesktopMasterDetail = ({
  master,
  detail,
  masterMinSize = 40,
  detailMinSize = 25,
  defaultMasterSize = 60,
  showDetail = true,
  className = "",
}: DesktopMasterDetailProps) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // On mobile, just stack the content
  if (!isDesktop) {
    return (
      <div className={`space-y-4 ${className}`}>
        {master}
        {showDetail && detail}
      </div>
    );
  }

  // On desktop, use resizable panels
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className={`min-h-[600px] rounded-lg border ${className}`}
    >
      <ResizablePanel
        defaultSize={defaultMasterSize}
        minSize={masterMinSize}
        className="bg-background"
      >
        <div className="h-full overflow-auto p-4">{master}</div>
      </ResizablePanel>

      {showDetail && (
        <>
          <ResizableHandle withHandle className="panel-resize-handle" />
          <ResizablePanel
            defaultSize={100 - defaultMasterSize}
            minSize={detailMinSize}
            className="bg-muted/20"
          >
            <div className="h-full overflow-auto">{detail}</div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};
