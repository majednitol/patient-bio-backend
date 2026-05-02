import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// ─── Button ───────────────────────────────────────────────
describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-primary");
  });

  it("applies destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button").className).toContain("bg-destructive");
  });

  it("applies outline variant", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button").className).toContain("border-2");
  });

  it("applies ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button").className).toContain("hover:bg-muted");
  });

  it("applies size sm", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("h-9");
  });

  it("applies size lg", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button").className).toContain("h-14");
  });

  it("applies size icon", () => {
    render(<Button size="icon">X</Button>);
    expect(screen.getByRole("button").className).toContain("w-10");
  });

  it("handles disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("fires onClick", () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Test</Button>);
    expect(screen.getByRole("button").className).toContain("custom-class");
  });

  it("buttonVariants returns class string", () => {
    const classes = buttonVariants({ variant: "secondary", size: "sm" });
    expect(classes).toContain("bg-secondary");
    expect(classes).toContain("h-9");
  });
});

// ─── Input ────────────────────────────────────────────────
describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter name" />);
    expect(screen.getByPlaceholderText("Enter name")).toBeInTheDocument();
  });

  it("accepts type prop", () => {
    render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
  });

  it("handles value changes", () => {
    const fn = vi.fn();
    render(<Input onChange={fn} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(fn).toHaveBeenCalled();
  });

  it("handles disabled state", () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<Input className="custom-input" placeholder="test" />);
    expect(screen.getByPlaceholderText("test").className).toContain("custom-input");
  });
});

// ─── Textarea ─────────────────────────────────────────────
describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText("Enter description")).toBeInTheDocument();
  });

  it("handles value changes", () => {
    const fn = vi.fn();
    render(<Textarea onChange={fn} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "text" } });
    expect(fn).toHaveBeenCalled();
  });

  it("handles disabled state", () => {
    render(<Textarea disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled();
  });
});

// ─── Label ────────────────────────────────────────────────
describe("Label", () => {
  it("renders text content", () => {
    render(<Label>Username</Label>);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("applies htmlFor attribute", () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.getByText("Email")).toHaveAttribute("for", "email");
  });

  it("merges custom className", () => {
    render(<Label className="custom-label">Test</Label>);
    expect(screen.getByText("Test").className).toContain("custom-label");
  });
});

// ─── Card ─────────────────────────────────────────────────
describe("Card", () => {
  it("renders Card with all sub-components", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("Card applies base classes", () => {
    const { container } = render(<Card>Test</Card>);
    expect(container.firstChild).toHaveClass("rounded-lg", "border", "shadow-sm");
  });

  it("merges custom className on Card", () => {
    const { container } = render(<Card className="custom-card">Test</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("custom-card");
  });
});

// ─── Badge ────────────────────────────────────────────────
describe("Badge", () => {
  it("renders text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies default variant", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default").className).toContain("bg-primary");
  });

  it("applies secondary variant", () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText("Secondary").className).toContain("bg-secondary");
  });

  it("applies destructive variant", () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText("Error").className).toContain("bg-destructive");
  });

  it("applies outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText("Outline").className).toContain("text-foreground");
  });
});

// ─── Skeleton ─────────────────────────────────────────────
describe("Skeleton", () => {
  it("renders with animation and base classes", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toHaveClass("rounded-md", "bg-muted");
  });

  it("merges custom className", () => {
    const { container } = render(<Skeleton className="h-8 w-full" />);
    expect((container.firstChild as HTMLElement).className).toContain("h-8");
  });
});

// ─── Separator ────────────────────────────────────────────
describe("Separator", () => {
  it("renders horizontal by default", () => {
    const { container } = render(<Separator />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-[1px]");
    expect(el.className).toContain("w-full");
  });

  it("renders vertical orientation", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("w-[1px]");
  });

  it("applies decorative role=none", () => {
    const { container } = render(<Separator decorative />);
    expect(container.firstChild).toHaveAttribute("role", "none");
  });

  it("applies separator role when not decorative", () => {
    const { container } = render(<Separator decorative={false} />);
    expect(container.firstChild).toHaveAttribute("role", "separator");
  });
});

// ─── Avatar ───────────────────────────────────────────────
describe("Avatar", () => {
  it("renders Avatar container", () => {
    const { container } = render(<Avatar />);
    expect(container.firstChild).toHaveClass("rounded-full", "overflow-hidden");
  });

  it("renders AvatarFallback", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("AvatarImage returns null when no src", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage alt="Test" />
        <AvatarFallback>FB</AvatarFallback>
      </Avatar>
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("FB")).toBeInTheDocument();
  });

  it("AvatarImage renders img when src provided", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.png" alt="User" />
      </Avatar>
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
    expect(img).toHaveAttribute("alt", "User");
  });
});

// ─── Alert ────────────────────────────────────────────────
describe("Alert", () => {
  it("renders with role=alert", () => {
    render(<Alert>Test alert</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders AlertTitle and AlertDescription", () => {
    render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Something happened</AlertDescription>
      </Alert>
    );
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("applies destructive variant", () => {
    render(<Alert variant="destructive">Error</Alert>);
    expect(screen.getByRole("alert").className).toContain("border-destructive");
  });
});

// ─── Progress ─────────────────────────────────────────────
describe("Progress", () => {
  it("renders with progressbar role", () => {
    render(<Progress value={50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
  });

  it("sets aria attributes correctly", () => {
    render(<Progress value={75} max={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps value within bounds", () => {
    render(<Progress value={150} max={100} />);
    const bar = screen.getByRole("progressbar");
    // The indicator should be at 100% max
    const indicator = bar.firstChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-0%)");
  });

  it("handles zero value", () => {
    render(<Progress value={0} />);
    const bar = screen.getByRole("progressbar");
    const indicator = bar.firstChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-100%)");
  });
});
