import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderListTab from './features/order-list/OrderListTab';
import DailyOrdersPage from './features/daily-orders/DailyOrdersPage';
import KarigarMappingTab from './features/karigar-mapping/KarigarMappingTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('order-list');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold">Shree I Jewellery Order Management System</h1>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
              <TabsTrigger value="order-list">Order List</TabsTrigger>
              <TabsTrigger value="daily-upload">Daily Order Upload</TabsTrigger>
              <TabsTrigger value="karigar-mapping">Karigar Mapping</TabsTrigger>
            </TabsList>

            <TabsContent value="order-list" className="mt-6">
              <OrderListTab />
            </TabsContent>

            <TabsContent value="daily-upload" className="mt-6">
              <DailyOrdersPage />
            </TabsContent>

            <TabsContent value="karigar-mapping" className="mt-6">
              <KarigarMappingTab />
            </TabsContent>
          </Tabs>
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
