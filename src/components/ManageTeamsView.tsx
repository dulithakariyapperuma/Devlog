import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrgTeams, deleteTeam } from "@/services/teamService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Trash2, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";
import CreateTeamModal from "./CreateTeamModal";

export default function ManageTeamsView() {
  const { activeOrgId, myOrgs } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const activeOrg = myOrgs.find((o) => o.id === activeOrgId);

  useEffect(() => {
    if (activeOrgId) {
      loadTeams();
    }
  }, [activeOrgId]);

  const loadTeams = async () => {
    setLoading(true);
    const data = await getOrgTeams(activeOrgId!);
    setTeams(data);
    setLoading(false);
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      return;
    }
    const success = await deleteTeam(teamId);
    if (success) {
      toast.success("Team deleted successfully");
      loadTeams();
    } else {
      toast.error("Failed to delete team. You might not have permission or there was an error.");
    }
  };

  if (!activeOrgId) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Teams</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage teams for your organization: <span className="font-semibold text-foreground">{activeOrg?.name}</span>
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Team
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="truncate">{team.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleDelete(team.id, team.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {team.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{team.memberCount} Members</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {teams.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg">
              No teams found in this organization.
            </div>
          )}
        </div>
      )}

      <CreateTeamModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) loadTeams(); // Reload teams when modal closes
        }}
        organizationId={activeOrgId}
      />
    </div>
  );
}
