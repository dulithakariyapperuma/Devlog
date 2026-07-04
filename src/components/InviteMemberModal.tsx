import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Mail } from "lucide-react";
import { generateInvite } from "@/services/inviteService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InviteMemberModal({ open, onOpenChange }: Props) {
  const { activeTeamId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [role, setRole] = useState<"TEAM_MEMBER" | "TEAM_ADMIN">("TEAM_MEMBER");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!activeTeamId) return;
    setLoading(true);
    setInviteLink(null);
    setCopied(false);

    const { token, error } = await generateInvite(activeTeamId, role);
    setLoading(false);

    if (error || !token) {
      toast.error(error || "Failed to generate invite link");
      return;
    }

    // Create the full join URL
    const baseUrl = window.location.origin;
    setInviteLink(`${baseUrl}/join/${token}`);
    toast.success("Invite link generated successfully!");
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Generate a secure, single-use invite link to add someone to this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "TEAM_MEMBER" | "TEAM_ADMIN")}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TEAM_MEMBER">Member (Can post entries and bugs)</option>
              <option value="TEAM_ADMIN">Admin (Can manage projects and members)</option>
            </select>
          </div>

          {!inviteLink ? (
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
              onClick={handleGenerate}
              disabled={loading || !activeTeamId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Invite Link
            </Button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Invite Link (Single-use)</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm font-mono text-muted-foreground outline-none"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This link will expire in 7 days and can only be used once.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <Button 
                  className="w-full gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-[1.02] transition-transform text-white shadow-lg shadow-blue-500/20"
                  onClick={() => {
                    const subject = encodeURIComponent("Join our team on DevLog");
                    const body = encodeURIComponent(`You've been invited to join our team on DevLog!\n\nClick the link below to create your account and join the workspace:\n${inviteLink}\n\nNote: This is a single-use link and will expire in 7 days.`);
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Send via Email
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setInviteLink(null)}
                >
                  Generate another link
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
