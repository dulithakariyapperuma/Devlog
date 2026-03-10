import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

export default function EditProfileModal({ open, onOpenChange }: Props) {
    const { currentUser, updateCurrentUser } = useAuth();
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState<"online" | "away" | "offline">("online");

    useEffect(() => {
        if (open && currentUser) {
            setName(currentUser.name);
            setRole(currentUser.role);
            setStatus(currentUser.status);
        }
    }, [open, currentUser]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        updateCurrentUser({ name: name.trim(), role: role.trim(), status });
        onOpenChange(false);
    };

    if (!currentUser) return null;
    const avatarColor = AVATAR_COLORS[parseInt(currentUser.id) % AVATAR_COLORS.length];
    // Generate initials from potentially edited name
    const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-border sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    {/* Live avatar preview */}
                    <div className="flex justify-center mb-2">
                        <div
                            className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-lg font-bold text-white shadow-lg`}
                        >
                            {initials || "??"}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Role / Title</Label>
                        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Engineer" />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">🟢 Online</SelectItem>
                                <SelectItem value="away">🟡 Away</SelectItem>
                                <SelectItem value="offline">⚫ Offline</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 pt-1 text-[11px] text-muted-foreground">
                        <p>Email: <span className="text-foreground font-mono">{currentUser.email}</span></p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!name.trim()}>Save Changes</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
