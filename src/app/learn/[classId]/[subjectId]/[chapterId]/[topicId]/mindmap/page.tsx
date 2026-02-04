"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCurrentUser, getProfileByUserId } from "@/lib/auth";
import { SUBJECTS, CLASS_LABELS, CHAPTERS_DATA } from "@/lib/data";

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  color: string;
  children?: MindMapNode[];
}

export default function MindMapPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const chapter = CHAPTERS_DATA[classId]?.[subjectId]?.find(ch => ch.id === chapterId);
  const topic = chapter?.topics.find(t => t.id === topicId);

  // Mind map data structure
  const mindMapData: MindMapNode = {
    id: "center",
    label: "তুলনা করি",
    color: "#E07B4C",
    children: [
      {
        id: "less",
        label: "কম",
        description: "যখন সংখ্যা ছোট হয়",
        color: "#3B82F6",
        children: [
          { id: "less-1", label: "ছোট সংখ্যা", color: "#60A5FA" },
          { id: "less-2", label: "< চিহ্ন", color: "#60A5FA" },
          { id: "less-3", label: "উদাহরণ: ৩ < ৫", color: "#60A5FA" },
        ],
      },
      {
        id: "more",
        label: "বেশি",
        description: "যখন সংখ্যা বড় হয়",
        color: "#22C55E",
        children: [
          { id: "more-1", label: "বড় সংখ্যা", color: "#4ADE80" },
          { id: "more-2", label: "> চিহ্ন", color: "#4ADE80" },
          { id: "more-3", label: "উদাহরণ: ৭ > ২", color: "#4ADE80" },
        ],
      },
      {
        id: "equal",
        label: "সমান",
        description: "যখন দুটি সংখ্যা একই",
        color: "#A855F7",
        children: [
          { id: "equal-1", label: "একই সংখ্যা", color: "#C084FC" },
          { id: "equal-2", label: "= চিহ্ন", color: "#C084FC" },
          { id: "equal-3", label: "উদাহরণ: ৪ = ৪", color: "#C084FC" },
        ],
      },
      {
        id: "symbols",
        label: "চিহ্ন",
        description: "তুলনায় ব্যবহৃত চিহ্ন",
        color: "#F59E0B",
        children: [
          { id: "sym-1", label: "< (ছোট)", color: "#FBBF24" },
          { id: "sym-2", label: "> (বড়)", color: "#FBBF24" },
          { id: "sym-3", label: "= (সমান)", color: "#FBBF24" },
        ],
      },
    ],
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    const teacherProfile = getProfileByUserId(currentUser.id);
    if (!teacherProfile) {
      router.push("/onboarding");
      return;
    }
    setIsLoading(false);
  }, [router]);

  const handleBack = () => {
    router.push(`/learn/${classId}/${subjectId}/${chapterId}/${topicId}`);
  };

  if (isLoading || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#E07B4C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm px-4 py-3 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-bold">🧠 মাইন্ড ম্যাপ</h1>
              <p className="text-slate-400 text-sm">{topic.name}</p>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              className="p-1 hover:bg-white/10 rounded-full text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-white text-sm w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
              className="p-1 hover:bg-white/10 rounded-full text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mind Map Canvas */}
      <main className="flex-1 overflow-auto p-8">
        <div
          className="min-h-full flex items-center justify-center transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Mind Map Visualization */}
          <div className="relative">
            {/* Center Node */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => setSelectedNode(mindMapData)}
                className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-2xl transition-transform hover:scale-105"
                style={{ backgroundColor: mindMapData.color }}
              >
                {mindMapData.label}
              </button>

              {/* Branches */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {mindMapData.children?.map((branch, branchIndex) => {
                  const angles = [-135, -45, 45, 135];
                  const angle = angles[branchIndex] || 0;
                  const distance = 180;
                  const x = Math.cos((angle * Math.PI) / 180) * distance;
                  const y = Math.sin((angle * Math.PI) / 180) * distance;

                  return (
                    <div
                      key={branch.id}
                      className="absolute"
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {/* Connection Line */}
                      <svg
                        className="absolute"
                        style={{
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: `${distance * 2}px`,
                          height: `${distance * 2}px`,
                          pointerEvents: "none",
                        }}
                      >
                        <line
                          x1={distance}
                          y1={distance}
                          x2={distance - x}
                          y2={distance - y}
                          stroke={branch.color}
                          strokeWidth="3"
                          opacity="0.5"
                        />
                      </svg>

                      {/* Branch Node */}
                      <button
                        onClick={() => setSelectedNode(branch)}
                        className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold shadow-xl transition-transform hover:scale-105 relative z-10"
                        style={{ backgroundColor: branch.color }}
                      >
                        {branch.label}
                      </button>

                      {/* Child Nodes */}
                      {branch.children?.map((child, childIndex) => {
                        const childAngle = angle + (childIndex - 1) * 30;
                        const childDistance = 100;
                        const childX = Math.cos((childAngle * Math.PI) / 180) * childDistance;
                        const childY = Math.sin((childAngle * Math.PI) / 180) * childDistance;

                        return (
                          <button
                            key={child.id}
                            onClick={() => setSelectedNode(child)}
                            className="absolute w-16 h-16 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-lg transition-transform hover:scale-110"
                            style={{
                              backgroundColor: child.color,
                              left: `${childX}px`,
                              top: `${childY}px`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <span className="text-center px-1 leading-tight">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Selected Node Detail */}
      {selectedNode && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedNode.color }}
              >
                <span className="text-white text-lg">📍</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{selectedNode.label}</h3>
                {selectedNode.description && (
                  <p className="text-slate-300 mt-1">{selectedNode.description}</p>
                )}
                {selectedNode.children && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedNode.children.map((child) => (
                      <span
                        key={child.id}
                        className="px-3 py-1 rounded-full text-white text-sm"
                        style={{ backgroundColor: child.color }}
                      >
                        {child.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
        যেকোনো বৃত্তে ট্যাপ করো বিস্তারিত দেখতে
      </div>
    </div>
  );
}
