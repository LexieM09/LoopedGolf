import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Map, PlusSquare, Search, User, Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const isMapPage = location.pathname === createPageUrl("Map");
  const isSetupPage = location.pathname === createPageUrl("SetupProfile");

  useEffect(() => {
    const checkAuthAndSetup = async () => {
      try {
        const user = await base44.auth.me();
        
        // If user is first time user and not on setup page, redirect to setup
        if (user.first_time_user && !isSetupPage) {
          navigate(createPageUrl("SetupProfile"));
        }
        // Don't redirect away from setup page - allow editing
      } catch (error) {
        // User not authenticated - Base44 will handle redirect to login
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndSetup();
  }, [location.pathname, navigate, isSetupPage]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69062849b895e3e15345df90/5a3e29306_looped.png" 
            alt="Looped"
            className="h-16 mx-auto mb-4 animate-pulse"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show layout for setup page
  if (isSetupPage) {
    return children;
  }

  const navItems = [
    { name: "Clubhouse", path: createPageUrl("Feed"), icon: Home },
    { name: "Map", path: createPageUrl("Map"), icon: Map },
    { name: "Post", path: createPageUrl("CreatePost"), icon: PlusSquare },
    { name: "Search", path: createPageUrl("Search"), icon: Search },
    { name: "Locker", path: createPageUrl("Profile"), icon: User },
  ];

  // Determine active nav item - Profile should only be active when viewing own profile
  const getActiveNavItem = () => {
    const currentPath = location.pathname;
    
    // Special handling for Profile page
    if (currentPath === createPageUrl("Profile")) {
      // If viewing another user's profile (has state.userEmail), consider Clubhouse active
      if (location.state?.userEmail) {
        return createPageUrl("Feed");
      }
      // Otherwise, it's the user's own profile, so Locker is active
      return currentPath;
    }
    
    return currentPath;
  };

  const activeNavPath = getActiveNavItem();

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col" style={{ fontFamily: "'Karla', sans-serif" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Karla:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Karla', sans-serif;
        }
      `}} />
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Notification Button */}
          <Link to={createPageUrl("Notifications")}>
            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
              <Bell className="w-10 h-10 text-gray-800" />
            </Button>
          </Link>

          {/* Centered Logo */}
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69062849b895e3e15345df90/35e2d3c55_looped.png" 
            alt="Looped"
            className="h-10 mt-3"
          />

          {/* Direct Message Button */}
          <Link to={createPageUrl("Messages")}>
            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
              <MessageCircle className="w-10 h-10 text-gray-800" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMapPage ? '' : 'pb-20'}`}>
        {children}
      </main>

      {/* Bottom Navigation - Hidden on Map page */}
      {!isMapPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-around h-16">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNavPath === item.path;
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                      isActive ? "text-green-600" : "text-gray-600 hover:text-green-500"
                    }`}
                  >
                    <Icon 
                      className="w-6 h-6" 
                      strokeWidth={isActive ? 2.5 : 2}
                      fill={isActive ? "currentColor" : "none"}
                    />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
