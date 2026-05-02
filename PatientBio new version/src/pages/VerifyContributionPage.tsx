import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Shield, Loader2, Link2 } from "lucide-react";
import { format } from "date-fns";

const VerifyContributionPage = () => {
  const { hash } = useParams<{ hash: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['verify-contribution', hash],
    queryFn: async () => {
      // Look up contribution by hash in the public pool view
      const { data: contribution, error } = await supabase
        .from('anonymous_pool_view' as 'anonymous_health_contributions')
        .select('id, contribution_hash, data_categories, disease_categories, source_jurisdiction, contributed_at, quality_score')
        .eq('contribution_hash', hash!)
        .single();
      if (error) throw error;

      // Look up blockchain verification
      const { data: bcTx } = await supabase
        .from('blockchain_transactions')
        .select('data_hash, created_at, is_verified')
        .eq('target_resource_id', contribution.id)
        .eq('target_resource_type', 'anonymous_contribution')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        contribution: contribution as {
          id: string;
          contribution_hash: string;
          data_categories: string[];
          disease_categories: string[];
          source_jurisdiction: string;
          contributed_at: string;
          quality_score: number | null;
        },
        blockchain: bcTx as { data_hash: string; created_at: string; is_verified: boolean } | null,
      };
    },
    enabled: !!hash,
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Contribution Verification</CardTitle>
          <CardDescription>Verify the authenticity of an anonymous health data contribution</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying contribution...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 py-8">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">Contribution Not Found</p>
              <p className="text-xs text-muted-foreground text-center">
                The hash does not match any active contribution in the research pool.
              </p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <CheckCircle className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-sm font-medium text-accent">Verified Contribution</p>
                  <p className="text-xs text-muted-foreground">This contribution exists in the global research pool</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contributed</span>
                  <span>{format(new Date(data.contribution.contributed_at), 'PP')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jurisdiction</span>
                  <span>{data.contribution.source_jurisdiction}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categories</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {data.contribution.data_categories.map(c => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
                {data.contribution.quality_score != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quality Score</span>
                    <span className="font-medium">{data.contribution.quality_score}/100</span>
                  </div>
                )}
              </div>

              {data.blockchain && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Blockchain Verification
                  </p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-mono break-all">
                      Hash: {data.blockchain.data_hash}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Recorded: {format(new Date(data.blockchain.created_at), 'PPpp')}
                    </p>
                    <Badge variant={data.blockchain.is_verified ? "default" : "secondary"} className="text-[10px]">
                      {data.blockchain.is_verified ? "Chain Verified" : "Pending Verification"}
                    </Badge>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center pt-2">
                Contribution Hash: <span className="font-mono">{hash?.slice(0, 32)}...</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyContributionPage;
