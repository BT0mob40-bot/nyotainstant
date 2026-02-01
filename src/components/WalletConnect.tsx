import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, LogOut, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export const WalletConnect = () => {
  const [activeTab, setActiveTab] = useState<'evm' | 'solana'>('evm');

  // EVM Wallet hooks
  const { address: evmAddress, isConnected: evmConnected, chain } = useAccount();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { data: evmBalance } = useBalance({ address: evmAddress });

  // Solana Wallet hooks
  const { publicKey: solanaPublicKey, disconnect: solanaDisconnect, connected: solanaConnected } = useWallet();

  const isAnyWalletConnected = evmConnected || solanaConnected;

  if (!isAnyWalletConnected) {
    return (
      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <CardTitle>Connect Wallet</CardTitle>
          </div>
          <CardDescription>
            Connect your wallet to start automated trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'evm' | 'solana')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evm">EVM Chains</TabsTrigger>
              <TabsTrigger value="solana">Solana</TabsTrigger>
            </TabsList>
            <TabsContent value="evm" className="mt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Supports: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom, Cronos, Celo, zkSync
                </p>
                <w3m-button />
              </div>
            </TabsContent>
            <TabsContent value="solana" className="mt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Supports: Phantom, Solflare, Trust Wallet, Coinbase
                </p>
                <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !w-full !rounded-md !h-10" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <CardTitle>Wallet</CardTitle>
          </div>
          <Badge variant="default" className="gap-1">
            <div className="h-2 w-2 bg-accent rounded-full animate-pulse" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={evmConnected ? 'evm' : 'solana'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="evm" disabled={!evmConnected}>
              EVM {evmConnected && '✓'}
            </TabsTrigger>
            <TabsTrigger value="solana" disabled={!solanaConnected}>
              Solana {solanaConnected && '✓'}
            </TabsTrigger>
          </TabsList>

          {evmConnected && (
            <TabsContent value="evm" className="space-y-4 mt-4">
              <div className="space-y-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Network</p>
                  <Badge variant="secondary" className="text-xs">
                    {chain?.name || 'Unknown'}
                  </Badge>
                </div>

                {evmBalance && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-sm font-bold">
                      {parseFloat(evmBalance.formatted).toFixed(4)} {evmBalance.symbol}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                  {evmAddress}
                </p>
              </div>

              <Button
                onClick={() => evmDisconnect()}
                variant="outline"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect EVM Wallet
              </Button>
            </TabsContent>
          )}

          {solanaConnected && (
            <TabsContent value="solana" className="space-y-4 mt-4">
              <div className="space-y-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Network</p>
                  <Badge variant="secondary" className="text-xs">
                    Solana Mainnet
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                  {solanaPublicKey?.toBase58()}
                </p>
              </div>

              <Button
                onClick={() => solanaDisconnect()}
                variant="outline"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect Solana Wallet
              </Button>
            </TabsContent>
          )}
        </Tabs>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Auto-Trading Status</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure your trading strategies in the dashboard to enable automated trading
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
