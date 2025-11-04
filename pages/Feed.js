import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PostCard from "../components/feed/PostCard";
import { Loader2 } from "lucide-react";

export default function Feed() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch follows for current user
  const { data: follows } = useQuery({
    queryKey: ['follows', currentUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: allPosts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 50),
    initialData: [],
  });

  // Filter posts to show only from followed users + own posts
  const posts = allPosts.filter(post => {
    if (!currentUser) return true; // Show all if not logged in
    
    // Show own posts
    if (post.created_by === currentUser.email) return true;
    
    // Show posts from followed users
    const followingEmails = follows.map(f => f.following_email);
    return followingEmails.includes(post.created_by);
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">⛳</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No posts yet</h3>
            <p className="text-gray-600">Follow golfers to see their posts!</p>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}