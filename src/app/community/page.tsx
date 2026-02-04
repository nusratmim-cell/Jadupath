"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  getCurrentUser,
  getProfileByUserId,
  type SessionUser,
  type TeacherProfile,
} from "@/lib/auth";
import { toBengaliNumber } from "@/lib/data";
import { BottomNav, ShikhoHeader, NoticeBar } from "@/components";

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorSchool: string;
  content: string;
  images?: string[];
  createdAt: string;
  likes: string[]; // User IDs who liked
  comments: Comment[];
  shares: number;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: string[];
}

export default function CommunityPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = () => {
    const savedPosts = localStorage.getItem("shikho_community_posts");
    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
    } else {
      // Sample posts
      const samplePosts: Post[] = [
        {
          id: "1",
          authorId: "sample1",
          authorName: "রহিমা খাতুন",
          authorSchool: "সরকারি প্রাথমিক বিদ্যালয়",
          content: "আজ আমার ক্লাসে একটি নতুন পদ্ধতিতে গণিত শেখাচ্ছিলাম। শিক্ষার্থীরা খুবই উৎসাহিত!",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likes: ["sample2"],
          comments: [],
          shares: 3,
        },
        {
          id: "2",
          authorId: "sample2",
          authorName: "করিম উদ্দিন",
          authorSchool: "মডেল প্রাথমিক বিদ্যালয়",
          content: "ডিজিটাল ক্লাসরুম পরিচালনা প্রশিক্ষণ থেকে অনেক কিছু শিখেছি। বিশেষ করে AI টুলস ব্যবহার করে কুইজ তৈরি করা খুবই সহজ হয়েছে!",
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          likes: ["sample1", "sample3"],
          comments: [
            {
              id: "c1",
              authorId: "sample3",
              authorName: "ফাতেমা বেগম",
              content: "আমিও এই প্রশিক্ষণ নিয়েছি, খুবই ভালো!",
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              likes: [],
            },
          ],
          shares: 5,
        },
      ];
      setPosts(samplePosts);
      localStorage.setItem("shikho_community_posts", JSON.stringify(samplePosts));
    }
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    const teacherProfile = getProfileByUserId(currentUser.id);

    // Load posts from localStorage
    loadPosts();

    // Batch state updates together at the end
    setUser(currentUser);
    setProfile(teacherProfile);
    setIsLoading(false);
  }, [router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageUrls: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            imageUrls.push(event.target.result as string);
            if (imageUrls.length === files.length) {
              setSelectedImages((prev) => [...prev, ...imageUrls]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleCreatePost = () => {
    if (!user || !profile || !postContent.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      authorId: user.id,
      authorName: profile.name,
      authorAvatar: profile.profilePicture,
      authorSchool: profile.schoolName,
      content: postContent,
      images: selectedImages,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      shares: 0,
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    localStorage.setItem("shikho_community_posts", JSON.stringify(updatedPosts));
    
    setPostContent("");
    setSelectedImages([]);
    setShowCreatePost(false);
  };

  const handleLike = (postId: string) => {
    if (!user) return;
    
    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        const isLiked = post.likes.includes(user.id);
        return {
          ...post,
          likes: isLiked
            ? post.likes.filter((id) => id !== user.id)
            : [...post.likes, user.id],
        };
      }
      return post;
    });
    
    setPosts(updatedPosts);
    localStorage.setItem("shikho_community_posts", JSON.stringify(updatedPosts));
  };

  const handleComment = (postId: string) => {
    if (!user || !profile) return;
    
    const commentText = commentTexts.get(postId);
    if (!commentText?.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      authorId: user.id,
      authorName: profile.name,
      authorAvatar: profile.profilePicture,
      content: commentText,
      createdAt: new Date().toISOString(),
      likes: [],
    };

    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment],
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    localStorage.setItem("shikho_community_posts", JSON.stringify(updatedPosts));
    setCommentTexts((prev) => {
      const newMap = new Map(prev);
      newMap.set(postId, "");
      return newMap;
    });
    setExpandedComments((prev) => new Set(prev).add(postId));
  };

  const handleShare = (postId: string) => {
    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        return {
          ...post,
          shares: post.shares + 1,
        };
      }
      return post;
    });
    
    setPosts(updatedPosts);
    localStorage.setItem("shikho_community_posts", JSON.stringify(updatedPosts));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "এখনই";
    if (diffInSeconds < 3600) return `${toBengaliNumber(Math.floor(diffInSeconds / 60))} মিনিট আগে`;
    if (diffInSeconds < 86400) return `${toBengaliNumber(Math.floor(diffInSeconds / 3600))} ঘণ্টা আগে`;
    if (diffInSeconds < 604800) return `${toBengaliNumber(Math.floor(diffInSeconds / 86400))} দিন আগে`;
    return date.toLocaleDateString("bn-BD");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#cf278d] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={() => router.push("/dashboard")}
        rightContent={
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">কমিউনিটি</h1>
            <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden hover:bg-gray-200 transition-all"
            >
              {profile?.profilePicture ? (
                <Image src={profile.profilePicture} alt="" width={40} height={40} className="object-cover" />
              ) : (
                <span className="text-sm font-bold text-gray-700">{profile?.name?.charAt(0) || "T"}</span>
              )}
            </button>
          </div>
        }
      />

      {/* Notice Ticker Bar */}
      <NoticeBar />

      <main className="px-6 py-6">
        {/* Create Post Button - Tablet Optimized */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <button
            onClick={() => setShowCreatePost(true)}
            className="w-full flex items-center gap-4 text-left p-5 bg-gray-50 rounded-xl active:scale-[0.98] transition-transform"
          >
            {profile?.profilePicture ? (
              <Image src={profile.profilePicture} alt="" width={56} height={56} className="rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#cf278d] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">{profile?.name?.charAt(0) || "T"}</span>
              </div>
            )}
            <span className="text-gray-500 flex-1 text-lg">আপনার কিছু শেয়ার করুন...</span>
            <svg className="w-7 h-7 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Posts Feed - Tablet Optimized */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Post Header - Larger */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {post.authorAvatar ? (
                    <Image src={post.authorAvatar} alt="" width={56} height={56} className="rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#cf278d] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xl">{post.authorName.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-xl mb-1">{post.authorName}</h3>
                    <p className="text-base text-gray-500 mb-1">{post.authorSchool}</p>
                    <p className="text-sm text-gray-400">{formatTimeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Post Content - Larger Text */}
                <p className="mt-4 text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">{post.content}</p>

                {/* Post Images - Larger */}
                {post.images && post.images.length > 0 && (
                  <div className={`mt-4 grid gap-3 ${
                    post.images.length === 1 ? "grid-cols-1" :
                    post.images.length === 2 ? "grid-cols-2" :
                    "grid-cols-2"
                  }`}>
                    {post.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <Image src={img} alt="" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Actions - Larger Touch Targets */}
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-around">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all active:scale-95 ${
                      user && post.likes.includes(user.id)
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 bg-gray-50"
                    }`}
                  >
                    <svg className="w-7 h-7" fill={user && post.likes.includes(user.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-base font-semibold">
                      {post.likes.length > 0 ? toBengaliNumber(post.likes.length) : ""} পছন্দ
                    </span>
                  </button>

                  <button
                    onClick={() => setExpandedComments((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(post.id)) {
                        newSet.delete(post.id);
                      } else {
                        newSet.add(post.id);
                      }
                      return newSet;
                    })}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl text-gray-600 bg-gray-50 transition-all active:scale-95"
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-base font-semibold">
                      {post.comments.length > 0 ? toBengaliNumber(post.comments.length) : ""} মন্তব্য
                    </span>
                  </button>

                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl text-gray-600 bg-gray-50 transition-all active:scale-95"
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="text-base font-semibold">
                      {post.shares > 0 ? toBengaliNumber(post.shares) : ""} শেয়ার
                    </span>
                  </button>
                </div>
              </div>

              {/* Comments Section - Tablet Optimized */}
              {expandedComments.has(post.id) && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  {/* Existing Comments - Larger */}
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="mb-4 last:mb-0">
                      <div className="flex items-start gap-3">
                        {comment.authorAvatar ? (
                          <Image src={comment.authorAvatar} alt="" width={48} height={48} className="rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#cf278d] flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-base">{comment.authorName.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 bg-white rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-base text-gray-900">{comment.authorName}</span>
                            <span className="text-sm text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-base text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Comment Input - Larger */}
                  <div className="flex items-center gap-3 mt-4">
                    {profile?.profilePicture ? (
                      <Image src={profile.profilePicture} alt="" width={48} height={48} className="rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#cf278d] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-base">{profile?.name?.charAt(0) || "T"}</span>
                      </div>
                    )}
                    <input
                      type="text"
                      value={commentTexts.get(post.id) || ""}
                      onChange={(e) => setCommentTexts((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(post.id, e.target.value);
                        return newMap;
                      })}
                      onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                      placeholder="মন্তব্য লিখুন..."
                      className="flex-1 px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#cf278d] focus:border-transparent"
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={!commentTexts.get(post.id)?.trim()}
                      className="px-6 py-4 bg-[#cf278d] text-white rounded-xl text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    >
                      পাঠান
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Create Post Modal - Tablet Optimized */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header - Larger */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">নতুন পোস্ট</h2>
              <button
                onClick={() => {
                  setShowCreatePost(false);
                  setPostContent("");
                  setSelectedImages([]);
                }}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl active:scale-95 transition-transform"
              >
                <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Larger */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-start gap-4 mb-6">
                {profile?.profilePicture ? (
                  <Image src={profile.profilePicture} alt="" width={56} height={56} className="rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#cf278d] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">{profile?.name?.charAt(0) || "T"}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{profile?.name}</p>
                  <p className="text-base text-gray-500">{profile?.schoolName}</p>
                </div>
              </div>

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="আপনার কিছু শেয়ার করুন..."
                className="w-full min-h-[300px] p-5 border-2 border-gray-200 rounded-xl resize-none text-lg focus:outline-none focus:ring-2 focus:ring-[#cf278d] focus:border-transparent"
              />

              {/* Selected Images - Larger */}
              {selectedImages.length > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                      <Image src={img} alt="" fill className="object-cover" />
                      <button
                        onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer - Larger */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 px-6 py-4 text-gray-600 bg-gray-100 rounded-xl text-lg font-semibold active:scale-95 transition-transform"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>ছবি</span>
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleCreatePost}
                  disabled={!postContent.trim()}
                  className="px-8 py-4 bg-[#cf278d] text-white rounded-xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  পোস্ট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="community" />
    </div>
  );
}
