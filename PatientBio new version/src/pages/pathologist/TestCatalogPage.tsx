import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, FlaskConical, Filter, Copy, Download, TrendingUp } from "lucide-react";
import { ReportsDataSummaryStrip } from "@/components/pathologist/ReportsDataSummaryStrip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestCatalog, PathologistTest } from "@/hooks/useTestCatalog";
import { TestCatalogDialog } from "@/components/pathologist/TestCatalogDialog";
import { reportTemplates } from "@/components/pathologist/reportTemplates";

const categoryLabels: Record<string, string> = {
  blood_work: "Blood Work",
  pathology: "Pathology",
  microbiology: "Microbiology",
  imaging: "Imaging",
  cardiology: "Cardiology",
  biochemistry: "Biochemistry",
  immunology: "Immunology",
  other: "Other",
};

export default function TestCatalogPage() {
  const { tests, isLoading, createTest, updateTest, deleteTest, toggleTestStatus } =
    useTestCatalog();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<PathologistTest | null>(null);
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Get unique categories from tests
  const categories = useMemo(() => {
    const cats = new Set(tests.map((t) => t.category));
    return Array.from(cats).sort();
  }, [tests]);

  // Category breakdown counts
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    tests.forEach((t) => {
      breakdown[t.category] = (breakdown[t.category] || 0) + 1;
    });
    return breakdown;
  }, [tests]);

  const filteredTests = useMemo(() => {
    let result = tests.filter(
      (test) => {
        const matchesSearch =
          test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          test.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          test.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || test.category === categoryFilter;
        return matchesSearch && matchesCategory;
      }
    );

    // Sort
    if (sortBy === "price_asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [tests, searchQuery, categoryFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTests.length / itemsPerPage));
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTests.slice(start, start + itemsPerPage);
  }, [filteredTests, currentPage]);

  const getTemplateIcon = (templateId: string | null) => {
    if (!templateId) return null;
    const template = reportTemplates.find((t) => t.id === templateId);
    return template?.icon;
  };

  const handleAddTest = () => {
    setEditingTest(null);
    setIsDialogOpen(true);
  };

  const handleEditTest = (test: PathologistTest) => {
    setEditingTest(test);
    setIsDialogOpen(true);
  };

  const handleDuplicateTest = (test: PathologistTest) => {
    const { id, ...testData } = test;
    setEditingTest(null);
    handleSubmit({ ...testData, name: `${testData.name} (Copy)` });
  };

  const handleSubmit = (data: any) => {
    if (editingTest) {
      updateTest.mutate(
        { id: editingTest.id, ...data },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      createTest.mutate(data, { onSuccess: () => setIsDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTestId) {
      deleteTest.mutate(deleteTestId, { onSuccess: () => setDeleteTestId(null) });
    }
  };

  // Bulk actions
  const handleToggleSelect = (testId: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTests.size === paginatedTests.length && selectedTests.size > 0) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(paginatedTests.map((t) => t.id)));
    }
  };

  const handleBulkActivate = () => {
    selectedTests.forEach((testId) => {
      toggleTestStatus.mutate({ id: testId, is_active: true });
    });
    setSelectedTests(new Set());
  };

  const handleBulkDeactivate = () => {
    selectedTests.forEach((testId) => {
      toggleTestStatus.mutate({ id: testId, is_active: false });
    });
    setSelectedTests(new Set());
  };

  const handleBulkDelete = () => {
    selectedTests.forEach((testId) => {
      deleteTest.mutate(testId);
    });
    setSelectedTests(new Set());
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["Name", "Code", "Category", "Price", "Sample Type", "TAT", "Active"];
    const rows = filteredTests.map((test) => [
      test.name,
      test.code || "",
      test.category,
      test.price,
      test.sample_type || "",
      test.turnaround_time || "",
      test.is_active ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-catalog-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const activeCount = tests.filter((t) => t.is_active).length;

  return (
    <div className="space-y-6">
      <ReportsDataSummaryStrip />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">Test Catalog</h1>
          <p className="text-muted-foreground">
            Define available tests and their pricing for your diagnostic center
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="border-gray-200">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleAddTest} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Test
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="diagnostic-stat-card border-teal-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{tests.length}</div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Price Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {tests.length > 0
                ? `৳${Math.min(...tests.map((t) => t.price))} - ৳${Math.max(
                    ...tests.map((t) => t.price)
                  )}`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {tests.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground font-medium">Categories:</span>
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
              {categoryLabels[cat] || cat} ({categoryBreakdown[cat]})
            </Badge>
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedTests.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm font-medium text-gray-700">
                {selectedTests.size} test{selectedTests.size !== 1 ? "s" : ""} selected
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkActivate}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkDeactivate}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkDelete}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTests(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-gray-200 focus:border-teal-300 focus:ring-teal-200"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] border-gray-200">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] border-gray-200">
            <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="price_asc">Price (Low-High)</SelectItem>
            <SelectItem value="price_desc">Price (High-Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tests Table */}
      <Card className="diagnostic-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                <FlaskConical className="h-8 w-8 text-teal-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-800">
                {searchQuery ? "No tests found" : "No tests in catalog"}
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first test to start building your diagnostic catalog"}
              </p>
              {!searchQuery && (
                <Button onClick={handleAddTest} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTests.size === paginatedTests.length && paginatedTests.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-gray-600">Test Name</TableHead>
                    <TableHead className="text-gray-600">Category</TableHead>
                    <TableHead className="text-gray-600">Sample</TableHead>
                    <TableHead className="text-gray-600">TAT</TableHead>
                    <TableHead className="text-gray-600">Ref. Range</TableHead>
                    <TableHead className="text-right text-gray-600">Price</TableHead>
                    <TableHead className="text-center text-gray-600">Active</TableHead>
                    <TableHead className="text-right text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTests.map((test) => (
                    <TableRow 
                      key={test.id} 
                      className={`${!test.is_active ? "opacity-50" : ""} ${selectedTests.has(test.id) ? "bg-blue-50" : ""} hover:bg-teal-50/30`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedTests.has(test.id)}
                          onCheckedChange={() => handleToggleSelect(test.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTemplateIcon(test.template_id) && (
                            <span className="text-lg">{getTemplateIcon(test.template_id)}</span>
                          )}
                          <div>
                            <div className="font-medium text-gray-800">{test.name}</div>
                            {test.code && (
                              <div className="text-xs text-muted-foreground">{test.code}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-teal-50 text-teal-700 hover:bg-teal-50">
                          {categoryLabels[test.category] || test.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {test.sample_type || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {test.turnaround_time || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={test.reference_ranges || undefined}>
                        {test.reference_ranges || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-800">৳{test.price}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={test.is_active}
                          onCheckedChange={(checked) =>
                            toggleTestStatus.mutate({ id: test.id, is_active: checked })
                          }
                          className="data-[state=checked]:bg-teal-600"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateTest(test)}
                            className="hover:bg-teal-50 hover:text-teal-700"
                            title="Duplicate test"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTest(test)}
                            className="hover:bg-teal-50 hover:text-teal-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={() => setDeleteTestId(test.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} • {filteredTests.length} total tests
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <TestCatalogDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isLoading={createTest.isPending || updateTest.isPending}
        editTest={editingTest}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTestId} onOpenChange={() => setDeleteTestId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800">Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the test from your catalog. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
