import { useState } from 'react';
import { Menu, List, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import OrderListTab from './features/order-list/OrderListTab';
import DailyOrdersPage from './features/daily-orders/DailyOrdersPage';
import KarigarMappingTab from './features/karigar-mapping/KarigarMappingTab';

type TabValue = 'order-list' | 'daily-upload' | 'karigar-mapping';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabValue>('order-list');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { value: 'order-list' as TabValue, label: 'Order List', icon: List },
    { value: 'daily-upload' as TabValue, label: 'Daily Order Upload', icon: Upload },
    { value: 'karigar-mapping' as TabValue, label: 'Karigar Mapping', icon: FileSpreadsheet },
  ];

  const handleTabChange = (value: TabValue) => {
    setActiveTab(value);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center gap-4">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="mt-8 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => handleTabChange(tab.value)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === tab.value
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">Shree I Jewellery Order Management System</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-8">
          {activeTab === 'order-list' && <OrderListTab />}
          {activeTab === 'daily-upload' && <DailyOrdersPage />}
          {activeTab === 'karigar-mapping' && <KarigarMappingTab />}
        </div>
      </main>

      <footer className="border-t bg-card py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026. Built with{' '}
          <span className="inline-block text-red-500">❤</span> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
