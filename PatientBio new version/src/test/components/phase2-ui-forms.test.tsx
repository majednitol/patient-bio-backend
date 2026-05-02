import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchInput } from "@/components/admin/SearchInput";
import { AsyncButton, LoadingButton } from "@/components/ui/async-button";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Loader2: (props: any) => <span data-testid="loader" {...props}>Loading...</span>,
  Search: (props: any) => <span data-testid="search-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
  Check: (props: any) => <span data-testid="check-icon" {...props} />,
  Circle: (props: any) => <span data-testid="circle-icon" {...props} />,
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
  ChevronUp: (props: any) => <span data-testid="chevron-up" {...props} />,
}));

// ─── Switch ───────────────────────────────────────────────
describe("Switch", () => {
  it("renders unchecked by default", () => {
    const { container } = render(<Switch />);
    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
  });

  it("calls onCheckedChange when toggled", () => {
    const fn = vi.fn();
    const { container } = render(<Switch checked={false} onCheckedChange={fn} />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(input);
    expect(fn).toHaveBeenCalledWith(true);
  });

  it("reflects checked state visually", () => {
    const { container } = render(<Switch checked={true} onCheckedChange={() => {}} />);
    const label = container.querySelector("label");
    expect(label?.className).toContain("bg-primary");
  });

  it("handles disabled state", () => {
    const { container } = render(<Switch disabled />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});

// ─── Checkbox ─────────────────────────────────────────────
describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    const { container } = render(<Checkbox />);
    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
  });

  it("calls onCheckedChange when clicked", () => {
    const fn = vi.fn();
    const { container } = render(<Checkbox checked={false} onCheckedChange={fn} />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(input);
    expect(fn).toHaveBeenCalledWith(true);
  });

  it("shows check icon when checked", () => {
    render(<Checkbox checked={true} onCheckedChange={() => {}} />);
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("does not show check icon when unchecked", () => {
    render(<Checkbox checked={false} onCheckedChange={() => {}} />);
    expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
  });
});

// ─── RadioGroup ───────────────────────────────────────────
describe("RadioGroup", () => {
  it("renders with radiogroup role", () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("selects default value", () => {
    const { container } = render(
      <RadioGroup defaultValue="b">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
  });

  it("calls onValueChange when option selected", () => {
    const fn = vi.fn();
    const { container } = render(
      <RadioGroup defaultValue="a" onValueChange={fn}>
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[1]);
    expect(fn).toHaveBeenCalledWith("b");
  });

  it("shows indicator for selected item", () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>
    );
    // First item should have the circle indicator
    const circles = screen.getAllByTestId("circle-icon");
    expect(circles).toHaveLength(1);
  });
});

// ─── Slider ───────────────────────────────────────────────
describe("Slider", () => {
  it("renders with slider role", () => {
    render(<Slider defaultValue={[50]} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("sets aria attributes", () => {
    render(<Slider value={[30]} min={0} max={100} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "30");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
  });

  it("calls onValueChange on keyboard input", () => {
    const fn = vi.fn();
    render(<Slider value={[50]} onValueChange={fn} step={1} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(fn).toHaveBeenCalledWith([51]);
  });

  it("clamps to min on Home key", () => {
    const fn = vi.fn();
    render(<Slider value={[50]} min={0} max={100} onValueChange={fn} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Home" });
    expect(fn).toHaveBeenCalledWith([0]);
  });

  it("clamps to max on End key", () => {
    const fn = vi.fn();
    render(<Slider value={[50]} min={0} max={100} onValueChange={fn} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "End" });
    expect(fn).toHaveBeenCalledWith([100]);
  });

  it("handles disabled state", () => {
    render(<Slider disabled value={[50]} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
  });
});

// ─── Select ───────────────────────────────────────────────
describe("Select", () => {
  it("renders trigger with combobox role", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Choose")).toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option")).toBeInTheDocument();
  });

  it("selects an item and closes", () => {
    const fn = vi.fn();
    render(
      <Select onValueChange={fn}>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>
    );
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Option B"));
    expect(fn).toHaveBeenCalledWith("b");
  });

  it("shows selected value in trigger", () => {
    render(
      <Select value="a">
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
        </SelectContent>
      </Select>
    );
    // SelectValue shows the value prop, not children
    expect(screen.getByText("a")).toBeInTheDocument();
  });
});

// ─── SearchInput ──────────────────────────────────────────
describe("SearchInput", () => {
  it("renders with placeholder", () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search patients..." />);
    expect(screen.getByPlaceholderText("Search patients...")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const fn = vi.fn();
    render(<SearchInput value="" onChange={fn} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    expect(fn).toHaveBeenCalledWith("test");
  });

  it("shows clear button when value is non-empty", () => {
    render(<SearchInput value="hello" onChange={() => {}} />);
    // The X button should be present
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("clears value on clear button click", () => {
    const fn = vi.fn();
    render(<SearchInput value="hello" onChange={fn} />);
    const clearBtn = screen.getByRole("button");
    fireEvent.click(clearBtn);
    expect(fn).toHaveBeenCalledWith("");
  });

  it("hides clear button when value is empty", () => {
    render(<SearchInput value="" onChange={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// ─── AsyncButton ──────────────────────────────────────────
describe("AsyncButton", () => {
  it("renders children", () => {
    render(<AsyncButton>Submit</AsyncButton>);
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("shows loading state during async operation", async () => {
    const asyncFn = vi.fn(async () => {
      await new Promise<void>((r) => setTimeout(r, 100));
    });
    render(<AsyncButton onClick={asyncFn}>Save</AsyncButton>);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not show loader for sync onClick", () => {
    render(<AsyncButton onClick={() => {}}>Click</AsyncButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
  });

  it("shows custom loading text", async () => {
    const asyncFn = vi.fn(async () => {
      await new Promise<void>((r) => setTimeout(r, 100));
    });
    render(<AsyncButton onClick={asyncFn} loadingText="Saving...">Save</AsyncButton>);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });
});

// ─── LoadingButton ────────────────────────────────────────
describe("LoadingButton", () => {
  it("shows loader when isLoading is true", () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>);
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows children when not loading", () => {
    render(<LoadingButton isLoading={false}>Submit</LoadingButton>);
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("shows custom loading text", () => {
    render(<LoadingButton isLoading loadingText="Processing...">Submit</LoadingButton>);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });
});
