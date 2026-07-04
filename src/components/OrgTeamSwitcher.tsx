import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Users, ChevronDown, Check, Plus } from "lucide-react";
import { useState } from "react";
import CreateTeamModal from "./CreateTeamModal";

export default function OrgTeamSwitcher() {
  const { myOrgs, myTeams, activeOrgId, activeTeamId, switchOrg, switchTeam } = useAuth();
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  const activeOrg = myOrgs.find((o) => o.id === activeOrgId) || myOrgs[0];
  const activeTeam = myTeams.find((t) => t.id === activeTeamId) || myTeams[0];

  if (!activeOrg || !activeTeam) return null;

  const isOrgAdmin = activeOrg.role === "ORG_ADMIN" || activeOrg.role === "ORG_OWNER";

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full px-3 py-2 text-left bg-muted/30 hover:bg-muted/60 transition-colors rounded-lg border border-border/50 outline-none focus:ring-2 focus:ring-primary/20">
        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground leading-tight">
            {activeOrg.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {activeTeam.name}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
        {myOrgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrg(org.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{org.name}</span>
            {org.id === activeOrgId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">Teams in {activeOrg.name}</DropdownMenuLabel>
        {myTeams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => switchTeam(team.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{team.name}</span>
            </div>
            {team.id === activeTeamId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}

        {isOrgAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCreateTeamOpen(true)}
              className="flex items-center gap-2 text-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Team</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <CreateTeamModal 
      open={createTeamOpen} 
      onOpenChange={setCreateTeamOpen} 
      organizationId={activeOrg.id} 
    />
    </>
  );
}
