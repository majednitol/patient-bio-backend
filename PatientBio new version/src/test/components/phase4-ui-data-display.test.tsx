import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableFooter,
} from "@/components/ui/table";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
} from "@/components/ui/pagination";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
  ChevronLeft: (props: any) => <span data-testid="chevron-left" {...props} />,
  ChevronRight: (props: any) => <span data-testid="chevron-right" {...props} />,
  MoreHorizontal: (props: any) => <span data-testid="more" {...props} />,
}));

// ─── Table ────────────────────────────────────────────────
describe("Table", () => {
  it("renders a complete table structure", () => {
    render(
      <Table>
        <TableCaption>Patient List</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>30</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane</TableCell>
            <TableCell>25</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total: 2</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    expect(screen.getByText("Patient List")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Total: 2")).toBeInTheDocument();
  });

  it("applies correct classes to table elements", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>H</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>C</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(container.querySelector("table")).toHaveClass("w-full");
    expect(container.querySelector("th")).toHaveClass("text-left");
    expect(container.querySelector("td")).toHaveClass("p-4");
  });
});

// ─── Accordion ────────────────────────────────────────────
describe("Accordion", () => {
  it("renders items collapsed by default", () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
  });

  it("expands item on click", () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText("Section 1"));
    expect(screen.getByText("Content 1")).toBeInTheDocument();
  });

  it("collapses on re-click when collapsible", () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText("Section 1"));
    expect(screen.getByText("Content 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Section 1"));
    expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
  });

  it("supports multiple type", () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="a">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>B</AccordionTrigger>
          <AccordionContent>Content B</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByText("B"));
    expect(screen.getByText("Content A")).toBeInTheDocument();
    expect(screen.getByText("Content B")).toBeInTheDocument();
  });

  it("renders with defaultValue", () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText("Content 1")).toBeInTheDocument();
  });

  it("sets aria-expanded correctly", () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });
});

// ─── Tabs ─────────────────────────────────────────────────
describe("Tabs", () => {
  it("renders tabs with default value active", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Content 1")).toBeInTheDocument();
    expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
  });

  it("switches tabs on click", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    fireEvent.click(screen.getByText("Tab 2"));
    expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    expect(screen.getByText("Content 2")).toBeInTheDocument();
  });

  it("sets correct ARIA attributes", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Tab 1")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Tab 2")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("calls onValueChange", () => {
    const fn = vi.fn();
    render(
      <Tabs defaultValue="tab1" onValueChange={fn}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    fireEvent.click(screen.getByText("Tab 2"));
    expect(fn).toHaveBeenCalledWith("tab2");
  });
});

// ─── ScrollArea ───────────────────────────────────────────
describe("ScrollArea", () => {
  it("renders children with overflow classes", () => {
    const { container } = render(
      <ScrollArea className="h-48">
        <div>Scrollable content</div>
      </ScrollArea>
    );
    expect(screen.getByText("Scrollable content")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("overflow-y-auto");
  });

  it("applies horizontal orientation", () => {
    const { container } = render(
      <ScrollArea orientation="horizontal">Content</ScrollArea>
    );
    expect(container.firstChild).toHaveClass("overflow-x-auto");
  });

  it("applies both orientation", () => {
    const { container } = render(
      <ScrollArea orientation="both">Content</ScrollArea>
    );
    expect(container.firstChild).toHaveClass("overflow-auto");
  });
});

// ─── Pagination ───────────────────────────────────────────
describe("Pagination", () => {
  it("renders pagination navigation", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("marks active page with aria-current", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#" isActive>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
    expect(screen.getByText("1")).toHaveAttribute("aria-current", "page");
  });
});
