import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createTeam } from "@/services/teamService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export default function CreateTeamModal({ open, onOpenChange, organizationId }: Props) {
  const { switchTeam, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const { team, error: apiError } = await createTeam(name.trim(), organizationId, description.trim());
    setLoading(false);

    if (apiError || !team) {
      setError(apiError || "Failed to create team");
      return;
    }

    toast.success("Team created successfully!");
    
    // We want to update the currentUser's teams array in context.
    // However, the easiest way to reflect this is to force a full reload 
    // or trigger a session refetch. Since we don't have a `refetchSession` function, 
    // we can either add it or do a hard reload.
    // Let's do a hard reload for now since team creation is rare.
    window.location.href = "/";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new isolated team workspace within your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Team Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. UI/UX Designers"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Team
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
