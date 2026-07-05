import React, { useState } from 'react';
import { 
  INITIAL_CAMPAIGNS, 
  INITIAL_PRIZES, 
  INITIAL_LEADS 
} from './data';
import { 
  Campaign, 
  PrizeTemplate, 
  LeadEntry, 
  TabType 
} from './types';

// B2B view subcomponents
import { DashboardHome } from './components/DashboardHome';
import { CampaignsList } from './components/CampaignsList';
import { CampaignWizard } from './components/CampaignWizard';
import { PrizesManager } from './components/PrizesManager';
import { InventoryManager } from './components/InventoryManager';
import { AnalyticsCenter } from './components/AnalyticsCenter';
import { BillingUsage } from './components/BillingUsage';
import { AccountSettings } from './components/AccountSettings';

// Player facing portal sandbox (embedded preview)
import { PhoneFrame } from './components/PhoneFrame';
import { PlayerLanding } from './components/PlayerLanding';
import { PlayerGame } from './components/PlayerGame';
import { PlayerResult } from './components/PlayerResult';

import { 
  Flame, LayoutDashboard, Sliders, Gift, BarChart3, 
  Database, User, CreditCard, ChevronRight, Search, 
  Smartphone, X, Check, ArrowRight, RotateCcw, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [prizes, setPrizes] = useState<PrizeTemplate[]>(INITIAL_PRIZES);
  const [leads, setLeads] = useState<LeadEntry[]>(INITIAL_LEADS);

  // Focus & Draft states
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [relaunchDraftCampaign, setRelaunchDraftCampaign] = useState<Campaign | null>(null);

  // Player Preview Sandbox state
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [sandboxCampaignId, setSandboxCampaignId] = useState<string>(INITIAL_CAMPAIGNS[0].id);
  const [sandboxScreen, setSandboxScreen] = useState<'landing' | 'game' | 'result'>('landing');
  const [sandboxPlayerData, setSandboxPlayerData] = useState({ name: '', phone: '', consent: false });
  const [sandboxSelectedPrize, setSandboxSelectedPrize] = useState<any>(null);

  // Handler: Add new prize template
  const handleAddPrize = (newPrize: Omit<PrizeTemplate, 'id' | 'allocatedStock' | 'availableStock'>) => {
    const id = `prize_${Date.now()}`;
    const item: PrizeTemplate = {
      ...newPrize,
      id,
      allocatedStock: 0,
      availableStock: newPrize.totalStock,
    };
    setPrizes([...prizes, item]);
  };

  // Handler: Update Stock values manually
  const handleUpdateStock = (id: string, amount: number) => {
    setPrizes(prizes.map(p => {
      if (p.id === id) {
        return {
          ...p,
          totalStock: p.totalStock + amount,
          availableStock: p.availableStock + amount
        };
      }
      return p;
    }));
  };

  // Handler: Bulk restock parsing
  const handleBulkRestock = (parsedPrizes: { id: string; additionalStock: number }[]) => {
    setPrizes(prizes.map(p => {
      const match = parsedPrizes.find(item => item.id === p.id);
      if (match) {
        return {
          ...p,
          totalStock: p.totalStock + match.additionalStock,
          availableStock: p.availableStock + match.additionalStock
        };
      }
      return p;
    }));
  };

  // Handler: Save campaign from wizard
  const handleSaveCampaign = (newCamp: Omit<Campaign, 'id' | 'participantsCount' | 'rewardsClaimed'>) => {
    const id = `camp_${Date.now()}`;
    const finalCamp: Campaign = {
      ...newCamp,
      id,
      participantsCount: 0,
      rewardsClaimed: 0
    };

    // Update allocated stocks in warehouse
    const updatedPrizes = prizes.map(p => {
      const match = finalCamp.prizes.find(cp => cp.templateId === p.id);
      if (match) {
        return {
          ...p,
          allocatedStock: p.allocatedStock + match.quantity,
          availableStock: Math.max(0, p.availableStock - match.quantity)
        };
      }
      return p;
    });

    setPrizes(updatedPrizes);
    setCampaigns([finalCamp, ...campaigns]);
    setRelaunchDraftCampaign(null);
    setSelectedCampaignId(null);
    setActiveTab('campaigns');
  };

  // Handler: Toggle Campaign Status (Active vs Paused)
  const handleToggleCampaignStatus = (id: string) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'active' ? 'paused' : 'active';
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  // Handler: Archive Campaign
  const handleArchiveCampaign = (id: string) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        return { ...c, status: 'archived' };
      }
      return c;
    }));
  };

  // Handler: Relaunch Campaign pre-fill
  const handleRelaunchTrigger = (camp: Campaign) => {
    setRelaunchDraftCampaign(camp);
    setActiveTab('creator');
  };

  // Helper: map a B2B Campaign object to the older player-facing BrandPreset type
  const activeSandboxCampaign = campaigns.find(c => c.id === sandboxCampaignId) || campaigns[0];

  const mapCampaignToBrandPreset = (camp: Campaign): any => {
    const campaignPrizes = camp.prizes.map((p) => {
      const template = prizes.find(pr => pr.id === p.templateId);
      return {
        name: template?.name || 'Mystery Reward',
        icon: template?.category === 'voucher' ? '📱' : '🎁',
        isWin: true
      };
    });

    if (camp.winProbability < 100) {
      campaignPrizes.push({
        name: 'Better Luck Next Time',
        icon: '🌙',
        isWin: false
      });
    }

    // Determine premium theme hues
    let primaryColor = '#6366F1';
    let gradientFrom = '#8B5CF6';
    let gradientTo = '#6366F1';

    if (camp.name.toLowerCase().includes('djezzy')) {
      primaryColor = '#E30613';
      gradientFrom = '#FF1A24';
      gradientTo = '#A30009';
    } else if (camp.name.toLowerCase().includes('yassir')) {
      primaryColor = '#10B981';
      gradientFrom = '#34D399';
      gradientTo = '#059669';
    } else if (camp.name.toLowerCase().includes('hamoud')) {
      primaryColor = '#F59E0B';
      gradientFrom = '#FBBF24';
      gradientTo = '#D97706';
    } else if (camp.name.toLowerCase().includes('soummam')) {
      primaryColor = '#3B82F6';
      gradientFrom = '#60A5FA';
      gradientTo = '#2563EB';
    }

    return {
      name: camp.name,
      arabicName: camp.arabicName,
      primaryColor,
      gradientFrom,
      gradientTo,
      description: `Participate & Win premium voucher codes or physical merchandise.`,
      prizes: campaignPrizes
    };
  };

  const sandboxBrandPreset = mapCampaignToBrandPreset(activeSandboxCampaign);

  // Player simulator callback events
  const handleSandboxRegister = (data: any) => {
    setSandboxPlayerData(data);
    setSandboxScreen('game');
  };

  const handleSandboxGameComplete = (prize: any) => {
    setSandboxSelectedPrize(prize);
    setSandboxScreen('result');

    // Simulate appending a live lead entry in the B2B pipeline!
    const newLead: LeadEntry = {
      id: `lead_${Date.now()}`,
      campaignId: activeSandboxCampaign.id,
      campaignName: activeSandboxCampaign.name,
      playerName: sandboxPlayerData.name || 'Sandbox Guest',
      phoneNumber: sandboxPlayerData.phone || '0555001122',
      prizeWon: prize.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      consentGiven: true,
      couponCode: `MOCK-${prize.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: 'confirmed'
    };
    setLeads([newLead, ...leads]);

    // Increment participants counter
    setCampaigns(campaigns.map(c => {
      if (c.id === activeSandboxCampaign.id) {
        return {
          ...c,
          participantsCount: c.participantsCount + 1,
          rewardsClaimed: prize.isWin ? c.rewardsClaimed + 1 : c.rewardsClaimed
        };
      }
      return c;
    }));
  };

  const handleSandboxRestart = () => {
    setSandboxSelectedPrize(null);
    setSandboxScreen('landing');
  };

  const handleSidebarNavigate = (tab: TabType) => {
    setSelectedCampaignId(null);
    setActiveTab(tab);
  };

  const handleCampaignFocus = (id: string) => {
    setSelectedCampaignId(id);
    setActiveTab('analytics');
  };

  return (
    <div id="saas-app-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative font-sans overflow-x-hidden select-none">
      
      {/* BACKGROUND EFFECTS */}
      <div id="bg-spotlight-indigo" className="absolute top-0 left-0 w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 filter blur-[150px] pointer-events-none z-0" />
      <div id="bg-spotlight-violet" className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full bg-violet-500/5 filter blur-[180px] pointer-events-none z-0" />

      {/* TOP HEADER STATUS */}
      <header id="saas-header-nav" className="w-full bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between relative z-20 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900">DZENGAGE</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 font-mono font-bold">B2B SaaS</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Algerian Consumer Activation Desk</p>
          </div>
        </div>

        {/* Live Preview trigger button */}
        <button
          onClick={() => setShowSandbox(!showSandbox)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-11 shadow-sm hover:shadow"
        >
          <Smartphone className="w-4 h-4 text-white" />
          <span>Interactive Player Sandbox</span>
        </button>
      </header>

      {/* MAIN LAYOUT */}
      <div id="saas-main-layout" className="flex-1 flex max-w-7xl w-full mx-auto relative z-10 px-4 sm:px-6 py-6 gap-6 min-h-0">
        
        {/* SIDEBAR NAVIGATION */}
        <aside id="saas-sidebar" className="hidden lg:flex flex-col gap-1 w-64 bg-white border border-slate-200 rounded-3xl p-4 h-[calc(100vh-140px)] sticky top-[90px] overflow-y-auto shadow-sm">
          {[
            { id: 'home', label: 'Overview', icon: LayoutDashboard },
            { id: 'campaigns', label: 'Campaign Radios', icon: Sliders },
            { id: 'prizes', label: 'Reward Library', icon: Gift },
            { id: 'inventory', label: 'Stock Room', icon: Database },
            { id: 'analytics', label: 'Analytics Desk', icon: BarChart3 },
            { id: 'billing', label: 'Billing & Quotas', icon: CreditCard },
            { id: 'account', label: 'Organization Settings', icon: User }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSidebarNavigate(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-12 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                }`}
              >
                <item.icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* RESPONSIVE MOBILE NAVIGATION RAIL */}
        <div id="mobile-nav-bar" className="lg:hidden fixed bottom-4 left-4 right-4 bg-white border border-slate-200 rounded-2xl p-2 flex justify-between items-center z-50 shadow-lg">
          {[
            { id: 'home', label: 'Home', icon: LayoutDashboard },
            { id: 'campaigns', label: 'Portals', icon: Sliders },
            { id: 'prizes', label: 'Rewards', icon: Gift },
            { id: 'inventory', label: 'Stocks', icon: Database },
            { id: 'analytics', label: 'Stats', icon: BarChart3 }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSidebarNavigate(item.id as TabType)}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl text-[9px] font-bold transition-all ${
                  isActive ? 'text-indigo-600 bg-slate-100' : 'text-slate-500'
                }`}
              >
                <item.icon className="w-4 h-4 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* WORKSPACE AREA */}
        <main id="saas-workspace-content" className="flex-1 min-w-0 pb-16 lg:pb-0">
          
          <AnimatePresence mode="wait">
            
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DashboardHome
                  campaigns={campaigns}
                  prizes={prizes}
                  leads={leads}
                  onNavigate={handleSidebarNavigate}
                  onSelectCampaign={handleCampaignFocus}
                  onOpenWizard={() => handleSidebarNavigate('creator')}
                />
              </motion.div>
            )}

            {activeTab === 'campaigns' && (
              <motion.div key="campaigns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CampaignsList
                  campaigns={campaigns}
                  onSelectCampaign={handleCampaignFocus}
                  onRelaunch={handleRelaunchTrigger}
                  onToggleStatus={handleToggleCampaignStatus}
                  onArchive={handleArchiveCampaign}
                  onOpenWizard={() => handleSidebarNavigate('creator')}
                />
              </motion.div>
            )}

            {activeTab === 'creator' && (
              <motion.div key="creator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CampaignWizard
                  prizes={prizes}
                  onSave={handleSaveCampaign}
                  onCancel={() => handleSidebarNavigate('campaigns')}
                  relaunchDraft={relaunchDraftCampaign}
                />
              </motion.div>
            )}

            {activeTab === 'prizes' && (
              <motion.div key="prizes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PrizesManager
                  prizes={prizes}
                  onAddPrize={handleAddPrize}
                />
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <InventoryManager
                  prizes={prizes}
                  onUpdateStock={handleUpdateStock}
                  onBulkUpload={handleBulkRestock}
                />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyticsCenter
                  campaigns={campaigns}
                  leads={leads}
                />
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BillingUsage />
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AccountSettings />
              </motion.div>
            )}

          </AnimatePresence>

        </main>

      </div>

      {/* PORTAL SIMULATOR SLIDE-OUT OVERLAY DRAWER */}
      <AnimatePresence>
        {showSandbox && (
          <div id="sandbox-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-[540px] bg-slate-900 border-l border-slate-800 h-full flex flex-col p-6 overflow-y-auto relative shadow-2xl text-white"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-450" />
                    <span>Interactive Player Sandbox</span>
                  </h3>
                  <p className="text-xs text-slate-400">Preview live lucky wheels/quizzes on mobile viewports</p>
                </div>
                
                <button
                  onClick={() => setShowSandbox(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector */}
              <div className="space-y-1.5 mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Select Active Campaign to Simulate</label>
                <select
                  value={sandboxCampaignId}
                  onChange={(e) => {
                    setSandboxCampaignId(e.target.value);
                    handleSandboxRestart();
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none min-h-11 cursor-pointer"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-950">{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Sandbox Smartphone shell */}
              <div className="flex-1 flex items-center justify-center">
                <PhoneFrame>
                  <AnimatePresence mode="wait">
                    {sandboxScreen === 'landing' && (
                      <motion.div 
                        key="sandbox-landing" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col"
                      >
                        <PlayerLanding
                          activeBrand={sandboxBrandPreset}
                          onRegister={handleSandboxRegister}
                          savedData={sandboxPlayerData}
                        />
                      </motion.div>
                    )}

                    {sandboxScreen === 'game' && (
                      <motion.div 
                        key="sandbox-game" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col"
                      >
                        <PlayerGame
                          activeBrand={sandboxBrandPreset}
                          forcedOutcome="random"
                          onGameComplete={handleSandboxGameComplete}
                          playerName={sandboxPlayerData.name}
                        />
                      </motion.div>
                    )}

                    {sandboxScreen === 'result' && (
                      <motion.div 
                        key="sandbox-result" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col"
                      >
                        <PlayerResult
                          activeBrand={sandboxBrandPreset}
                          prize={sandboxSelectedPrize}
                          onRestart={handleSandboxRestart}
                          playerName={sandboxPlayerData.name}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </PhoneFrame>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer id="saas-footer-credits" className="w-full border-t border-slate-200 py-4 text-center text-[11px] text-slate-500 font-sans tracking-wide relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 DZENGAGE. Handcrafted with precision for Algerian Enterprise Brands.</p>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span>Powered by</span>
            <span className="text-indigo-600 font-bold">DZ Gamification Marketing Suite</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
