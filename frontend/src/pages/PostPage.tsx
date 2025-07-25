import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { FaRegThumbsUp, FaRegComment, FaArrowLeft } from "react-icons/fa";
import { IoEyeOutline } from "react-icons/io5";
import { FiSend } from "react-icons/fi";
import CommentItem from "../components/CommentItem";
import { useLocation, useOutletContext, useParams } from "react-router-dom";
import type { User, Post } from "../types";
import {
  addCommentReplies,
  addCommentReply,
  fetchCommentByCommentId,
  fetchCommentByPostId,
  getPostTagList,
  likeAndUnlikeComment,
  likePost,
  likeReply,
  replyToComment,
  replyToPost,
  unlikePost,
  unlikeReply,
  useSummaryGeneration,
} from "../functions/forumApi";
import { getAuth } from "../contexts/authContext";

interface PostPageProps {
  currentUser: User;
}

export default function PostPage() {
  const postId = useParams().postId;
  const postProp = useLocation().state.post as Post | undefined;

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    generateSummary,
  } = useSummaryGeneration();

  if (!postId || !postProp) {
    return <div className="text-center text-red-500">Post not found</div>;
  }

  const [post, setPost] = useState<Post>(postProp);
  const [tags, setTags] = useState<string[]>(postProp.tags || []);
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const fetchedTags = await getPostTagList(postId);
        setTags(fetchedTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    if (tags.length === 0) {
      fetchTags();
    }
  }, [postId]);

  const [pageNumber, setPageNumber] = useState(1);
  const {
    commentList,
    loading,
    error,
    hasMore,
    addCommentToList,
    setCommentList,
  } = fetchCommentByPostId(postId, pageNumber);

  const [summaryGenerated, setSummaryGenerated] = useState(false);

  useEffect(() => {
    const generatePostSummary = async () => {
      if (!summaryGenerated && !summaryLoading) {
        try {
          await generateSummary("post", postId);
          setSummaryGenerated(true);
        } catch (error) {
          console.error("Auto summary generation failed:", error);
        }
      }
    };

    generatePostSummary();
  }, [
    post.title,
    post.details,
    summaryGenerated,
    summaryLoading,
    generateSummary,
  ]);
  const observerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const observerTarget = observerRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && hasMore) {
          setPageNumber((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );
    observer.observe(observerTarget);
    return () => {
      if (observerTarget) {
        observer.unobserve(observerTarget);
      }
      observer.disconnect();
    };
  }, [hasMore, loading]);

  const { userName } = getAuth();
  const { currentUser } = useOutletContext<PostPageProps>();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLikeClick = () => {
    if (post.isLiked) {
      setPost((prev) => ({
        ...prev,
        likes: prev.likes > 0 ? prev.likes - 1 : 0,
        isLiked: false,
      }));
      unlikePost(post.postId);
    } else {
      setPost((prev) => ({
        ...prev,
        likes: prev.likes + 1,
        isLiked: true,
      }));
      likePost(post.postId);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const newReply = await replyToPost(postId, newComment);
      addCommentToList(newReply);
      post.replies += 1; // Update replies count in the post
      setNewComment("");
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting comment:", error);
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = (commentId: string, like: boolean) => {
    if (like) {
      likeReply(commentId);
    } else {
      unlikeReply(commentId);
    }
    setCommentList((prev) => likeAndUnlikeComment(prev, commentId));
  };

  const handleReplyToComment = async (
    parentCommentId: string,
    replyText: string
  ) => {
    const newComment = await replyToComment(parentCommentId, replyText);
    setCommentList((prev) =>
      addCommentReply(prev, parentCommentId, newComment)
    );
  };

  const expandCommentComments = async (commentId: string) => {
    const comments = await fetchCommentByCommentId(commentId);
    setCommentList((prev) => addCommentReplies(prev, commentId, comments));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white rounded-lg p-4 shadow-sm">
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => {
              window.history.back();
            }}
            draggable={false}
          >
            <FaArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
            {post.groupName}
          </span>
        </div>

        {/* Scrollable Content: Post, Add Comment, Comments */}
        <div
          className="bg-white rounded-lg shadow-sm p-6 flex flex-col gap-6"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          {/* Auto-Generated Summary Section */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-blue-800">
              Post Summary
            </h2>
            {summaryLoading && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">Generating summary...</span>
              </div>
            )}
            {summaryError && (
              <div className="text-red-600 bg-red-50 p-3 rounded-md">
                <strong>Error:</strong> {summaryError}
              </div>
            )}
            {summary && !summaryLoading && (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{summary}</p>
              </div>
            )}
            {!summary && !summaryLoading && !summaryError && (
              <div className="text-gray-500 italic">
                Summary will appear here once generated...
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {post.username.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{post.username}</p>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 outline-none resize-none transition-colors">
                {tags.map((tag) => {
                  return (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 hover:bg-gray-200">
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {post.title}
              </h1>
              <p className="text-gray-700 leading-relaxed">{post.details}</p>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleLikeClick();
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                  post.isLiked ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <FaRegThumbsUp
                  className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`}
                />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>

              <div className="flex items-center gap-2 text-gray-500">
                <FaRegComment className="w-4 h-4" />
                <span className="text-sm">{post.replies} comments</span>
              </div>

              <div className="flex items-center gap-2 text-gray-500">
                <IoEyeOutline className="w-4 h-4" />
                <span className="text-sm">{post.views} views</span>
              </div>
            </div>
          </div>

          {/* Add Comment */}
          <div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-gray-600">
                  {(userName ?? currentUser.username).slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share something..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows={3}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiSend className="w-4 h-4" />
                    {isSubmitting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            {commentList.map((comment) => (
              <CommentItem
                key={comment.commentId}
                comment={comment}
                currentUser={currentUser}
                onLike={handleLikeComment}
                onReply={handleReplyToComment}
                depth={0}
                expandCommentComments={expandCommentComments}
              />
            ))}
            {hasMore && (
              <div
                ref={observerRef}
                className="col-span-2 text-center mt-4 h-12"
              >
                {loading ? (
                  <p>Loading more comments...</p>
                ) : (
                  <p>Scroll to load more</p>
                )}
              </div>
            )}
            <div>{error && "...Error loading comments..."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
