import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Scorecard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  useEffect(() => {
    if (location.state?.post) {
      setPost(location.state.post);
    }
  }, [location.state]);

  // Fetch the post creator's user data
  const { data: postCreator } = useQuery({
    queryKey: ['user', post?.created_by],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: post.created_by });
      return users[0] || null;
    },
    enabled: !!post?.created_by,
    initialData: null
  });

  if (!post) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading...</p>
      </div>);

  }

  const displayName = postCreator?.full_name || post.created_by?.split('@')[0] || "Golfer";
  const scoreValue = parseInt(post.score) || 0;
  const par = 72; // Default par, could be made dynamic based on course data
  const isPositive = scoreValue > par;
  const scoreDiff = scoreValue - par;
  const scoreDiffDisplay = scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? "E" : `${scoreDiff}`;

  // Get images - use image_urls if available, otherwise fall back to image_url
  const images = post.image_urls && post.image_urls.length > 0 ? post.image_urls : [post.image_url];
  const mainImage = images[0];
  const hasScorecard = post.scorecard && post.scorecard.some((s) => s > 0);

  // Calculate scorecard totals if available
  const frontNine = hasScorecard ? post.scorecard.slice(0, 9).reduce((sum, s) => sum + (s || 0), 0) : 0;
  const backNine = hasScorecard ? post.scorecard.slice(9, 18).reduce((sum, s) => sum + (s || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <Button
            onClick={() => navigate(createPageUrl("Feed"))}
            variant="ghost"
            size="icon">

            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">Scorecard</h1>
          <div className="w-10" />
        </div>

        {/* Profile Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
              {postCreator?.profile_image ?
              <img src={postCreator.profile_image} alt={displayName} className="w-full h-full object-cover" /> :

              displayName[0]?.toUpperCase() || "U"
              }
            </div>
            <div>
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-gray-600">{post.course_name || "Golf Course"}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{post.score || "0"}</span>
              {scoreValue > 0 &&
              <span className={`text-lg font-semibold ${isPositive ? 'text-red-600' : scoreDiff === 0 ? 'text-gray-600' : 'text-green-600'}`}>
                  {scoreDiffDisplay}
                </span>
              }
            </div>
          </div>
        </div>

        {/* Main Image */}
        <div className="px-6 mb-6">
          <div className="rounded-2xl overflow-hidden">
            <img
              src={mainImage}
              alt="Round"
              className="w-full aspect-[3/2] object-cover" />

          </div>
        </div>

        {/* Caption */}
        {(post.caption || post.description) &&
        <div className="px-6 mb-6">
            {post.caption &&
          <h3 className="text-2xl font-bold mb-2">{post.caption}</h3>
          }
            {post.description &&
          <p className="text-gray-700">{post.description}</p>
          }
          </div>
        }

        {/* Scorecard Details - Only show if scorecard data exists */}
        {hasScorecard &&
        <div className="mb-6 pr-6 pb-4 pl-6">
            <h3 className="text-xl font-bold mb-4">Round Breakdown</h3>
            <div className="bg-gray-50 pt-4 pr-4 pb-4 pl-4 rounded-xl space-y-4">
              {/* Front 9 */}
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Front 9</div>
                <div className="grid grid-cols-10 gap-1 text-center">
                  {post.scorecard.slice(0, 9).map((score, i) =>
                <div key={i}>
                      <div className="text-xs text-gray-500">{i + 1}</div>
                      <div className="text-sm font-bold">{score || "-"}</div>
                    </div>
                )}
                  <div className="bg-green-100 rounded px-1">
                    <div className="text-xs text-gray-500">Out</div>
                    <div className="text-sm font-bold text-green-700">{frontNine}</div>
                  </div>
                </div>
              </div>

              {/* Back 9 */}
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Back 9</div>
                <div className="grid grid-cols-10 gap-1 text-center">
                  {post.scorecard.slice(9, 18).map((score, i) =>
                <div key={i}>
                      <div className="text-xs text-gray-500">{i + 10}</div>
                      <div className="text-sm font-bold">{score || "-"}</div>
                    </div>
                )}
                  <div className="bg-green-100 rounded px-1">
                    <div className="text-xs text-gray-500">In</div>
                    <div className="text-sm font-bold text-green-700">{backNine}</div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="font-semibold">Total Score</span>
                <span className="text-2xl font-bold text-green-700">{frontNine + backNine}</span>
              </div>
            </div>
          </div>
        }

        {/* Tagged Users */}
        {post.tagged_users && post.tagged_users.length > 0 &&
        <div className="px-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Playing with</h3>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {post.tagged_users.slice(0, 3).map((email, i) =>
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-white">
                    {email[0]?.toUpperCase()}
                  </div>
              )}
              </div>
              <span className="text-sm text-gray-600">
                {post.tagged_users.length} {post.tagged_users.length === 1 ? 'golfer' : 'golfers'}
              </span>
            </div>
          </div>
        }

        {/* Additional Images Gallery */}
        {images.length > 1 &&
        <div className="px-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">More from this round</h3>
            <div className="grid grid-cols-2 gap-3">
              {images.slice(1).map((img, i) =>
            <div key={i} className="rounded-lg overflow-hidden aspect-square">
                  <img
                src={img}
                alt={`Round photo ${i + 2}`}
                className="w-full h-full object-cover" />

                </div>
            )}
            </div>
          </div>
        }

        {/* Course Info */}
        {post.course_location &&
        <div className="px-6 mb-6">
            <h3 className="text-lg font-semibold mb-2">Course</h3>
            <p className="text-gray-600">{post.course_location}</p>
          </div>
        }
      </div>
    </div>);

}