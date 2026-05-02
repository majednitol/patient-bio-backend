/**
 * BlockchainProofViewer - Visual display of Merkle proofs
 * Part of Data Integrity Dashboard (Phase 4.4)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Clock,
  Hash,
  GitBranch
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MerkleProofData {
  recordId: string;
  recordHash: string;
  proof: Array<{ hash: string; position: 'left' | 'right' }>;
  root: string;
  transactionCount: number;
  verified: boolean;
  generatedAt: string;
  firstTransaction?: {
    id: string;
    hash: string;
    timestamp: string;
  };
  lastTransaction?: {
    id: string;
    hash: string;
    timestamp: string;
  };
}

interface BlockchainProofViewerProps {
  proof: MerkleProofData | null;
  recordTitle?: string;
  className?: string;
  isLoading?: boolean;
}

export const BlockchainProofViewer: React.FC<BlockchainProofViewerProps> = ({
  proof,
  recordTitle,
  className = '',
  isLoading = false,
}) => {
  const [showFullProof, setShowFullProof] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const formatHash = (hash: string, length = 12) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, length)}...${hash.substring(hash.length - 4)}`;
  };

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!proof) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No blockchain proof available for this record
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Blockchain Proof
          </CardTitle>
          <Badge variant={proof.verified ? 'default' : 'destructive'}>
            {proof.verified ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </>
            ) : (
              'Unverified'
            )}
          </Badge>
        </div>
        {recordTitle && (
          <p className="text-sm text-muted-foreground mt-1">
            <FileText className="h-3 w-3 inline mr-1" />
            {recordTitle}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Merkle Root */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary">Merkle Root</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(proof.root, 'Merkle root')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <code className="text-sm font-mono break-all">
            {formatHash(proof.root, 16)}
          </code>
        </div>

        {/* Record Hash */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Record Hash
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(proof.recordHash, 'Record hash')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <code className="text-sm font-mono break-all">
            {formatHash(proof.recordHash, 16)}
          </code>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-2xl font-bold">{proof.transactionCount}</div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-2xl font-bold">{proof.proof.length}</div>
            <div className="text-xs text-muted-foreground">Proof Nodes</div>
          </div>
        </div>

        {/* Timestamps */}
        {proof.firstTransaction && proof.lastTransaction && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                First recorded
              </span>
              <span>
                {format(new Date(proof.firstTransaction.timestamp), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated
              </span>
              <span>
                {format(new Date(proof.lastTransaction.timestamp), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        )}

        {/* Expandable Proof Path */}
        {proof.proof.length > 0 && (
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowFullProof(!showFullProof)}
            >
              <span>Proof Path ({proof.proof.length} nodes)</span>
              {showFullProof ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showFullProof && (
              <div className="mt-3 space-y-2">
                {proof.proof.map((node, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs"
                  >
                    <Badge variant="outline" className="text-xs">
                      {node.position}
                    </Badge>
                    <code className="font-mono flex-1 truncate">
                      {formatHash(node.hash, 20)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyToClipboard(node.hash, `Node ${index + 1}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generated timestamp */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Proof generated {format(new Date(proof.generatedAt), 'MMM d, yyyy HH:mm:ss')}
        </p>
      </CardContent>
    </Card>
  );
};

export default BlockchainProofViewer;
