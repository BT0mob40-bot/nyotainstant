import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { config } from './lib/web3';
import { AuthProvider } from './contexts/AuthContext';
import { SolanaWalletContextProvider } from './contexts/SolanaWalletContext';
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Portfolio from "./pages/MemeCoin";
import MemeCoinDetailPage from "./pages/MemeCoinDetailPage";
import NotFound from "./pages/NotFound";
import ErrorPage from "./pages/Error";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <SolanaWalletContextProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/trading" element={<Index />} />
                  <Route path="/meme/:id" element={<MemeCoinDetailPage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/error" element={<ErrorPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SolanaWalletContextProvider>
  </WagmiProvider>
);

export default App;
