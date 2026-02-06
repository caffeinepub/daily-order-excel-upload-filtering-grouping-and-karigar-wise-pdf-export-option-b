import { useState } from 'react';
import { Menu, X, Package, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import LoginButton from '@/components/LoginButton';
import OrderListTab from '@/features/order-list/OrderListTab';
import DailyOrdersPage from '@/features/daily-orders/DailyOrdersPage';
import KarigarMappingTab from '@/features/karigar-mapping/KarigarMappingTab';
import { getBuildId } from '@/utils/buildInfo';

type Tab = 'order-list' | 'daily-orders' | 'karigar-mapping';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('order-list');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const buildId = getBuildId();

  const tabs = [
    { id: 'order-list' as Tab, label: 'Order List', icon: Package },
    { id: 'daily-orders' as Tab, label: 'Daily Order Upload', icon: Upload },
    { id: 'karigar-mapping' as Tab, label: 'Karigar Mapping', icon: Users },
  ];

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        className="justify-start"
                        onClick={() => handleTabChange(tab.id)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-semibold md:text-xl">Shree I Jewellery Order Management System</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Build: {buildId}
            </span>
            <LoginButton />
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden border-t md:block">
          <div className="container px-4">
            <nav className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                    data-active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {activeTab === 'order-list' && <OrderListTab />}
        {activeTab === 'daily-orders' && <DailyOrdersPage />}
        {activeTab === 'karigar-mapping' && <KarigarMappingTab />}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © 2026. Built with love using{' '}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Build: {buildId}
          </p>
        </div>
      </footer>
    </div>
  );
}
