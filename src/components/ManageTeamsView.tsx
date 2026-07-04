import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrgTeams, deleteTeam, getTeamMembers, removeTeamMember } from "@/services/teamService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Trash2, Edit2, Plus, ChevronDown, ChevronUp, UserMinus, Building2 } from "lucide-react";
import { toast } from "sonner";
import CreateTeamModal from "./CreateTeamModal";

export default function ManageTeamsView() {
  const { activeOrgId, myOrgs, currentUser } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});

  const activeOrg = myOrgs.find((o) => o.id === activeOrgId);
  const isGlobalAdmin = currentUser?.globalRole === "SUPER_ADMIN";
  const isOrgAdmin = activeOrg?.role === "ORG_ADMIN" || activeOrg?.role === "ORG_OWNER" || isGlobalAdmin;

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

  const handleExpandTeam = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      return;
    }
    setExpandedTeamId(teamId);
    
    if (!teamMembers[teamId]) {
      setLoadingMembers(prev => ({ ...prev, [teamId]: true }));
      const members = await getTeamMembers(teamId);
      setTeamMembers(prev => ({ ...prev, [teamId]: members }));
      setLoadingMembers(prev => ({ ...prev, [teamId]: false }));
    }
  };

  const handleDeleteTeam = async (e: React.MouseEvent, teamId: string, teamName: string) => {
    e.stopPropagation();
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

  const handleRemoveMember = async (teamId: string, userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this team?`)) {
      return;
    }
    const success = await removeTeamMember(teamId, userId);
    if (success) {
      toast.success(`Removed ${userName} from team`);
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: prev[teamId].filter(m => m.id !== userId)
      }));
    } else {
      toast.error("Failed to remove member");
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
        {isOrgAdmin && (
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:scale-105 transition-transform shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Create Team
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <Card 
              key={team.id} 
              className={`group relative overflow-hidden transition-all duration-300 border-l-4 cursor-pointer backdrop-blur-md ${expandedTeamId === team.id ? 'border-l-primary shadow-lg bg-card/80' : 'border-l-transparent hover:border-l-primary/50 hover:shadow-md bg-card/50'}`}
              onClick={() => handleExpandTeam(team.id)}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-primary font-bold shadow-inner">
                      {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate font-semibold">{team.name}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {isOrgAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500" 
                        onClick={(e) => handleDeleteTeam(e, team.id, team.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="text-muted-foreground ml-2">
                      {expandedTeamId === team.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2 ml-13">
                  {team.description || "No description provided."}
                </CardDescription>
              </CardHeader>

              {expandedTeamId === team.id && (
                <div className="px-6 pb-6 pt-2 border-t border-border/40 animate-in slide-in-from-top-2 fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> 
                      Team Members ({team.memberCount})
                    </h4>
                  </div>
                  
                  {loadingMembers[team.id] ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers[team.id]?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No members found.</p>
                      ) : (
                        teamMembers[team.id]?.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {member.avatar || member.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground leading-none">{member.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {member.role.replace("TEAM_", "")}
                              </span>
                              {isOrgAdmin && member.id !== currentUser?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 px-2 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleRemoveMember(team.id, member.id, member.name)}
                                >
                                  <UserMinus className="h-3.5 w-3.5 mr-1" />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
          {teams.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed rounded-xl bg-card/30 flex flex-col items-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No teams found</h3>
              <p className="text-sm max-w-sm mb-6">Your organization doesn't have any teams yet. Create your first team to start collaborating.</p>
              {isOrgAdmin && (
                <Button onClick={() => setCreateModalOpen(true)}>Create First Team</Button>
              )}
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

