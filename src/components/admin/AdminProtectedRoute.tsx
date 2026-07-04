import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function AdminProtectedRoute() {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentUser || !currentUser.is_admin) {
        // Redirect to main app if not logged in or not an admin
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
