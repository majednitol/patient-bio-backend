import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCachedWalletData } from "@/lib/offlineDB";
 
 export interface PatientWallet {
   id: string;
   user_id: string;
   wallet_address: string;
   token_balance: number;
   total_earned: number;
   total_withdrawn: number;
   created_at: string;
   updated_at: string;
 }
 
 export interface DataTransaction {
   id: string;
   patient_id: string;
   requester_id: string;
   requester_type: string;
   access_tier: number;
   disease_category: string | null;
   tokens_earned: number;
   is_anonymized: boolean;
   transaction_hash: string | null;
   data_access_request_id: string | null;
   created_at: string;
 }
 
 export interface TokenPricing {
   id: string;
   disease_category: string;
   data_type: string;
   base_price_tokens: number;
   is_active: boolean;
 }
 
 export const usePatientWallet = () => {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   // Fetch or create wallet
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["patient-wallet", user?.id],
    queryFn: async (): Promise<PatientWallet | null> => {
      if (!user?.id) return null;

      try {
        const { data, error } = await supabase
          .from("patient_wallets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          const { data: newWallet, error: createError } = await supabase
            .from("patient_wallets")
            .insert({ user_id: user.id })
            .select()
            .single();

          if (createError) throw createError;
          return newWallet as PatientWallet;
        }

        return data as PatientWallet;
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedWalletData(user.id);
          if (cached) {
            return {
              id: "offline",
              user_id: cached.userId,
              wallet_address: cached.walletAddress || "",
              token_balance: cached.tokenBalance,
              total_earned: cached.totalEarned,
              total_withdrawn: cached.totalWithdrawn,
              created_at: cached.cachedAt,
              updated_at: cached.cachedAt,
            } as PatientWallet;
          }
        }
        console.error("Error fetching wallet:", err);
        return null;
      }
    },
    enabled: !!user?.id,
  });
 
   // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["data-transactions", user?.id],
    queryFn: async (): Promise<DataTransaction[]> => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("data_transactions")
          .select("*")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as DataTransaction[];
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedWalletData(user.id);
          if (cached) {
            return cached.transactions.map(t => ({
              id: t.id,
              patient_id: user.id,
              requester_id: "",
              requester_type: t.requesterType,
              access_tier: 1,
              disease_category: t.diseaseCategory,
              tokens_earned: t.tokensEarned,
              is_anonymized: false,
              transaction_hash: null,
              data_access_request_id: null,
              created_at: t.createdAt,
            })) as DataTransaction[];
          }
        }
        console.error("Error fetching transactions:", err);
        return [];
      }
    },
    enabled: !!user?.id,
  });
 
   // Fetch token pricing
   const { data: pricing = [] } = useQuery({
     queryKey: ["token-pricing"],
     queryFn: async (): Promise<TokenPricing[]> => {
       const { data, error } = await supabase
         .from("token_pricing")
         .select("*")
         .eq("is_active", true);
 
       if (error) {
         console.error("Error fetching pricing:", error);
         return [];
       }
 
       return data as TokenPricing[];
     },
   });
 
   // Calculate this month's earnings
   const thisMonthEarnings = transactions
     .filter((t) => {
       const transactionDate = new Date(t.created_at);
       const now = new Date();
       return (
         transactionDate.getMonth() === now.getMonth() &&
         transactionDate.getFullYear() === now.getFullYear()
       );
     })
     .reduce((sum, t) => sum + Number(t.tokens_earned), 0);
 
   // Get recent transactions (last 5)
   const recentTransactions = transactions.slice(0, 5);
 
   // Get price for a disease category
   const getPriceForCategory = (category: string): number => {
     const price = pricing.find((p) => p.disease_category === category);
     return price ? Number(price.base_price_tokens) : 10; // Default 10 PBIO
   };
 
   return {
     wallet,
     transactions,
     recentTransactions,
     pricing,
     thisMonthEarnings,
     isLoading: walletLoading || transactionsLoading,
     refetchWallet,
     getPriceForCategory,
     invalidate: () => {
       queryClient.invalidateQueries({ queryKey: ["patient-wallet", user?.id] });
       queryClient.invalidateQueries({ queryKey: ["data-transactions", user?.id] });
     },
   };
 };