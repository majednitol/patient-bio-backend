 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "@/hooks/use-toast";
 
 export interface PathologistTest {
   id: string;
   pathologist_id: string;
   name: string;
   code: string | null;
   category: string;
   description: string | null;
   price: number;
   sample_type: string | null;
   turnaround_time: string | null;
   preparation_instructions: string | null;
   reference_ranges: string | null;
   template_id: string | null;
   is_active: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export interface CreateTestInput {
   name: string;
   code?: string;
   category: string;
   description?: string;
   price: number;
   sample_type?: string;
   turnaround_time?: string;
   preparation_instructions?: string;
   reference_ranges?: string;
   template_id?: string;
   is_active?: boolean;
 }
 
 export interface UpdateTestInput extends Partial<CreateTestInput> {
   id: string;
 }
 
 export function useTestCatalog() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const { data: tests, isLoading } = useQuery({
     queryKey: ["pathologist-tests", user?.id],
     queryFn: async () => {
       if (!user?.id) return [];
       const { data, error } = await supabase
         .from("pathologist_tests")
         .select("id, pathologist_id, name, code, category, description, price, sample_type, turnaround_time, preparation_instructions, reference_ranges, template_id, is_active, created_at, updated_at")
         .eq("pathologist_id", user.id)
         .order("category", { ascending: true })
         .order("name", { ascending: true });
 
       if (error) throw error;
       return data as PathologistTest[];
     },
     enabled: !!user?.id,
   });
 
   const createTest = useMutation({
     mutationFn: async (input: CreateTestInput) => {
       if (!user?.id) throw new Error("Not authenticated");
       const { data, error } = await supabase
         .from("pathologist_tests")
         .insert({
           ...input,
           pathologist_id: user.id,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-tests"] });
       toast.success("Test added to catalog");
     },
     onError: (error) => {
       toast.error("Failed to add test: " + error.message);
     },
   });
 
   const updateTest = useMutation({
     mutationFn: async ({ id, ...input }: UpdateTestInput) => {
       const { data, error } = await supabase
         .from("pathologist_tests")
         .update(input)
         .eq("id", id)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-tests"] });
       toast.success("Test updated");
     },
     onError: (error) => {
       toast.error("Failed to update test: " + error.message);
     },
   });
 
   const deleteTest = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from("pathologist_tests")
         .delete()
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-tests"] });
       toast.success("Test removed from catalog");
     },
     onError: (error) => {
       toast.error("Failed to delete test: " + error.message);
     },
   });
 
   const toggleTestStatus = useMutation({
     mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
       const { error } = await supabase
         .from("pathologist_tests")
         .update({ is_active })
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-tests"] });
     },
   });
 
   return {
     tests: tests || [],
     isLoading,
     createTest,
     updateTest,
     deleteTest,
     toggleTestStatus,
   };
 }