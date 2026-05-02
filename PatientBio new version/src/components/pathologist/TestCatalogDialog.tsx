 import { useState, useEffect } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { reportTemplates } from "./reportTemplates";
 import { CreateTestInput, PathologistTest } from "@/hooks/useTestCatalog";
 
 const categories = [
   { value: "blood_work", label: "Blood Work" },
   { value: "pathology", label: "Pathology" },
   { value: "microbiology", label: "Microbiology" },
   { value: "imaging", label: "Imaging" },
   { value: "cardiology", label: "Cardiology" },
   { value: "biochemistry", label: "Biochemistry" },
   { value: "immunology", label: "Immunology" },
   { value: "other", label: "Other" },
 ];
 
 const sampleTypes = [
   "Blood (Serum)",
   "Blood (Plasma)",
   "Blood (Whole)",
   "Urine",
   "Stool",
   "Swab (Nasopharyngeal)",
   "Swab (Throat)",
   "Tissue Biopsy",
   "CSF",
   "Other",
 ];
 
 interface TestCatalogDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSubmit: (data: CreateTestInput) => void;
   isLoading?: boolean;
   editTest?: PathologistTest | null;
 }
 
 export function TestCatalogDialog({
   open,
   onOpenChange,
   onSubmit,
   isLoading,
   editTest,
 }: TestCatalogDialogProps) {
   const [formData, setFormData] = useState<CreateTestInput>({
     name: "",
     code: "",
     category: "blood_work",
     description: "",
     price: 0,
     sample_type: "",
     turnaround_time: "",
     preparation_instructions: "",
     reference_ranges: "",
     template_id: "",
   });
 
   useEffect(() => {
     if (editTest) {
       setFormData({
         name: editTest.name,
         code: editTest.code || "",
         category: editTest.category,
         description: editTest.description || "",
         price: editTest.price,
         sample_type: editTest.sample_type || "",
         turnaround_time: editTest.turnaround_time || "",
         preparation_instructions: editTest.preparation_instructions || "",
         reference_ranges: editTest.reference_ranges || "",
         template_id: editTest.template_id || "",
       });
     } else {
       setFormData({
         name: "",
         code: "",
         category: "blood_work",
         description: "",
         price: 0,
         sample_type: "",
         turnaround_time: "",
         preparation_instructions: "",
         reference_ranges: "",
         template_id: "",
       });
     }
   }, [editTest, open]);
 
   const handleTemplateSelect = (templateId: string) => {
     const template = reportTemplates.find((t) => t.id === templateId);
     if (template && template.id !== "blank") {
       setFormData((prev) => ({
         ...prev,
         name: template.name,
         template_id: template.id,
         category: template.type || prev.category,
         description: template.description,
         reference_ranges: template.findings,
       }));
     } else {
       setFormData((prev) => ({ ...prev, template_id: templateId }));
     }
   };
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     onSubmit(formData);
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>{editTest ? "Edit Test" : "Add New Test"}</DialogTitle>
           <DialogDescription>
             {editTest
               ? "Update the test details below"
               : "Define a new test for your catalog. You can auto-fill from templates."}
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           {/* Template Selection */}
           {!editTest && (
             <div className="space-y-2">
               <Label>Auto-fill from Template</Label>
               <Select value={formData.template_id} onValueChange={handleTemplateSelect}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select a template (optional)" />
                 </SelectTrigger>
                 <SelectContent>
                   {reportTemplates
                     .filter((t) => t.id !== "blank")
                     .map((template) => (
                       <SelectItem key={template.id} value={template.id}>
                         {template.icon} {template.name}
                       </SelectItem>
                     ))}
                 </SelectContent>
               </Select>
             </div>
           )}
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="name">Test Name *</Label>
               <Input
                 id="name"
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 placeholder="e.g., Complete Blood Count"
                 required
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="code">Test Code</Label>
               <Input
                 id="code"
                 value={formData.code}
                 onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                 placeholder="e.g., CBC001"
               />
             </div>
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Category *</Label>
               <Select
                 value={formData.category}
                 onValueChange={(value) => setFormData({ ...formData, category: value })}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {categories.map((cat) => (
                     <SelectItem key={cat.value} value={cat.value}>
                       {cat.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
                <Label htmlFor="price">Price (৳) *</Label>
               <Input
                 id="price"
                 type="number"
                 min="0"
                 step="0.01"
                 value={formData.price}
                 onChange={(e) =>
                   setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                 }
                 required
               />
             </div>
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Sample Type</Label>
               <Select
                 value={formData.sample_type}
                 onValueChange={(value) => setFormData({ ...formData, sample_type: value })}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select sample type" />
                 </SelectTrigger>
                 <SelectContent>
                   {sampleTypes.map((type) => (
                     <SelectItem key={type} value={type}>
                       {type}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label htmlFor="turnaround_time">Turnaround Time</Label>
               <Input
                 id="turnaround_time"
                 value={formData.turnaround_time}
                 onChange={(e) => setFormData({ ...formData, turnaround_time: e.target.value })}
                 placeholder="e.g., 24 hours, Same day"
               />
             </div>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="description">Description</Label>
             <Textarea
               id="description"
               value={formData.description}
               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               placeholder="Brief description of the test..."
               rows={2}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="preparation_instructions">Patient Preparation Instructions</Label>
             <Textarea
               id="preparation_instructions"
               value={formData.preparation_instructions}
               onChange={(e) =>
                 setFormData({ ...formData, preparation_instructions: e.target.value })
               }
               placeholder="e.g., Fasting for 8-12 hours required..."
               rows={2}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="reference_ranges">Reference Ranges / Report Template</Label>
             <Textarea
               id="reference_ranges"
               value={formData.reference_ranges}
               onChange={(e) => setFormData({ ...formData, reference_ranges: e.target.value })}
               placeholder="Normal ranges and units..."
               rows={4}
               className="font-mono text-xs"
             />
           </div>
 
           <div className="flex justify-end gap-2 pt-4">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={isLoading || !formData.name}>
               {isLoading ? "Saving..." : editTest ? "Update Test" : "Add Test"}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 }