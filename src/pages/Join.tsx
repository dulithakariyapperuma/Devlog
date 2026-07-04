import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { validateInvite, acceptInvite } from "@/services/inviteService";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Terminal, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Join() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!token) return;
      const { data, error } = await validateInvite(token);
      if (error) {
        setError(error);
      } else {
        setInviteData(data);
      }
      setLoading(false);
    }
    loadInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const { success, error } = await acceptInvite(token);
    setAccepting(false);

    if (success) {
      toast.success("Successfully joined the team!");
      // Reload the page to reset context and load new teams
      window.location.href = "/";
    } else {
      toast.error(error || "Failed to accept invite");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative z-10 shadow-2xl border border-border/50">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Terminal className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DevLog Workspace</h1>
        </div>

        {error ? (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-2">
              <span className="text-xl">!</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Invalid Invite</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button className="w-full mt-4" onClick={() => navigate("/")}>
              Return Home
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                You've been invited!
              </h2>
              <p className="text-sm text-muted-foreground">
                Join <span className="font-bold text-foreground">{inviteData?.organization?.name}</span>
                {inviteData?.team && (
                  <span> • {inviteData.team.name}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Role: {inviteData?.role.replace("TEAM_", "")}
              </p>
            </div>

            {currentUser ? (
              <Button
                className="w-full h-12 text-base shadow-lg shadow-primary/20"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <>
                    Accept Invite <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  You need to be logged in to accept this invite.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/login")}
                  >
                    Log In
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => navigate("/register")}
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
