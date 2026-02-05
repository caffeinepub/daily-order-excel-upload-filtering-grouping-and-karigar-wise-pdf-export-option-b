import { useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssignKarigar } from '@/hooks/useQueries';

interface AssignmentPanelProps {
  selectedDate: string;
  selectedOrderIds: string[];
  onAssignmentComplete: () => void;
}

export default function AssignmentPanel({
  selectedDate,
  selectedOrderIds,
  onAssignmentComplete,
}: AssignmentPanelProps) {
  const [open, setOpen] = useState(false);
  const [karigar, setKarigar] = useState('');
  const [factory, setFactory] = useState('');
  const assignKarigar = useAssignKarigar();

  const handleAssign = async () => {
    if (!karigar.trim() || selectedOrderIds.length === 0) return;

    await assignKarigar.mutateAsync({
      date: selectedDate,
      orderIds: selectedOrderIds,
      karigar: karigar.trim(),
      factory: factory.trim() || null,
    });

    setKarigar('');
    setFactory('');
    setOpen(false);
    onAssignmentComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={selectedOrderIds.length === 0}>
          <Users className="mr-2 h-4 w-4" />
          Assign Karigar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Karigar</DialogTitle>
          <DialogDescription>
            Assign {selectedOrderIds.length} selected order{selectedOrderIds.length !== 1 ? 's' : ''} to a karigar
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="karigar">Karigar Name *</Label>
            <Input
              id="karigar"
              value={karigar}
              onChange={(e) => setKarigar(e.target.value)}
              placeholder="Enter karigar name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="factory">Factory (Optional)</Label>
            <Input
              id="factory"
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
              placeholder="Enter factory name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!karigar.trim() || assignKarigar.isPending}>
            {assignKarigar.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
