import axios from "axios";
import type { Post, Group, Reply, ResourceClusterType } from "../types";
import { useEffect, useState } from "react";
import axiosApi from "./axiosApi";
import qs from "qs";

/** ------------------------ POSTS ------------------------ **/

export function fetchAllPosts(query: string = "", pageNumber: number = 1) {
  const [postList, setPostList] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);

  useEffect(() => {
    setPostList([]);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const signal = controller.signal;

    axiosApi({
      method: "GET",
      url: "/forum/posts",
      params: {
        q: query,
        page: pageNumber,
      },
      signal: signal,
    })
      .then((res) => {
        if (!res || !res.data) return;
        const postList = res.data as Post[];
        setPostList((prev) => [...new Set([...prev, ...res.data])]);
        setHasMore(postList.length > 0);
        setLoading(false);
      })
      .catch((e) => {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: " + e.message);
        }
        console.error(e);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [pageNumber, query]);

  function deletePostFromList(postId: string) {
    setPostList((prev) => prev.filter((post) => post.postId !== postId));
  }

  return { postList, loading, error, hasMore, deletePostFromList };
}

export function fetchPostsByGroupId(
  groupId: string,
  query: string = "",
  pageNumber: number = 1,
  selectedTags: string[] = []
) {
  const [postList, setPostList] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>("");

  useEffect(() => {
    setPostList([]);
  }, [query, selectedTags]);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const signal = controller.signal;

    axiosApi({
      method: "GET",
      url: `/forum/group/${groupId}`,
      params: {
        page: pageNumber,
        q: query,
        tags: selectedTags,
      },
      paramsSerializer: (params) =>
        qs.stringify(params, { arrayFormat: "repeat" }),
      signal: signal,
    })
      .then((res) => {
        if (!res || !res.data) return;
        const postList = res.data.posts?.map(
          (post: {
            postId: string;
            title: string;
            details: string;
            createdAt: Date;
            groupId: string;
            likes: number;
            uid: string;
            views: number;
            isLiked: boolean;
            replies: number;
          }) => ({
            ...post,
            groupName: res.data.groupName,
          })
        );
        setPostList((prev) => [...new Set([...prev, ...postList])]);
        setHasMore(postList.length > 0);
        setLoading(false);
        setGroupName(res.data.groupName);
      })
      .catch((e) => {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: " + e.message);
        }
        console.error(e);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [pageNumber, query, selectedTags]);

  function deletePostFromList(postId: string) {
    setPostList((prev) => prev.filter((post) => post.postId !== postId));
  }

  return { postList, loading, error, hasMore, groupName, deletePostFromList };
}

export async function createPost(
  title: string,
  details: string,
  groupId: string,
  tags: string[]
): Promise<number> {
  const res = await axiosApi({
    method: "POST",
    url: `/forum/group/${groupId}`,
    data: {
      title: title,
      details: details,
      tags: tags,
    },
  });
  return res.status;
}

export async function updatePost(
  postId: string,
  updates: Partial<Pick<Post, "title" | "details" | "tags">>
): Promise<Post> {
  const res = await axiosApi({
    method: "PUT",
    url: `/forum/post/${postId}`,
    data: {
      title: updates.title,
      details: updates.details,
      tags: updates.tags,
    },
  });
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await axiosApi({
    method: "DELETE",
    url: `/forum/post/${postId}`,
  });
}

export async function likePost(postId: string): Promise<void> {
  await axiosApi({
    method: "POST",
    url: `/forum/likePost/${postId}`,
  });
}

export async function unlikePost(postId: string): Promise<void> {
  await axiosApi({
    method: "DELETE",
    url: `/forum/likePost/${postId}`,
  });
}

/** ------------------------ GROUPS ------------------------ **/

export function fetchAllGroups(query: string = "", pageNumber: number = 1) {
  const [groupList, setGroupList] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  useEffect(() => {
    setGroupList([]);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const signal = controller.signal;

    axiosApi({
      method: "GET",
      url: "/forum/groups",
      params: {
        q: query,
        page: pageNumber,
      },
      signal: signal,
    })
      .then((res) => {
        if (!res) return;
        setGroupList((prev) => [...new Set([...prev, ...res.data])]);
        setHasMore(res.data.length > 0);
        setLoading(false);
      })
      .catch((e) => {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: " + e.message);
        }
        console.error(e);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, pageNumber]);

  const deleteGroupFromList = (groupId: string) => {
    setGroupList((prev) => prev.filter((g) => g.groupId !== groupId));
  };

  return { groupList, loading, error, hasMore, deleteGroupFromList };
}

export async function createGroup(
  groupName: string,
  description: string,
  tags: string[]
): Promise<Group> {
  const res = await axiosApi({
    method: "POST",
    url: "/forum/groups",
    data: {
      name: groupName,
      description: description,
      tags: tags,
    },
  });
  return res.data;
}

export async function updateGroup(
  groupId: string,
  updates: Partial<Pick<Group, "groupName" | "description" | "tags">>
): Promise<Group> {
  const res = await axiosApi({
    method: "PUT",
    url: `/forum/group/${groupId}`,
    data: {
      name: updates.groupName,
      description: updates.description,
      tags: updates.tags,
    },
  });
  return res.data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await axiosApi({
    method: "DELETE",
    url: `/forum/group/${groupId}`,
  });
}

/** ------------------------ REPLIES ------------------------ **/

export function fetchCommentByPostId(postId: string, page: number = 1) {
  const [commentList, setCommentList] = useState<Reply[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const signal = controller.signal;

    axiosApi({
      method: "GET",
      url: `/forum/post/${postId}`,
      params: {
        page: page,
      },
      signal: signal,
    })
      .then((res) => {
        if (!res || !res.data) return;
        setCommentList((prev) => [...new Set([...prev, ...res.data])]);
        setHasMore(res.data.length > 0);
        setLoading(false);
      })
      .catch((e) => {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: " + e.message);
        }
        console.error(e);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [page]);

  function deleteCommentFromList(replyId: string) {
    setCommentList((prev) => prev.filter((post) => post.commentId !== replyId));
  }

  function addCommentToList(newReply: Reply) {
    setCommentList((prev) => [...new Set([newReply, ...prev])]);
  }

  return {
    commentList,
    loading,
    error,
    hasMore,
    deleteCommentFromList,
    addCommentToList,
    setCommentList,
  };
}

export async function fetchCommentByCommentId(
  commentId: string
): Promise<Reply[]> {
  const res = await axiosApi({
    method: "GET",
    url: `/forum/comment/${commentId}`,
  });
  return res.data;
}

export async function replyToPost(
  postId: string,
  content: string
): Promise<Reply> {
  const res = await axiosApi({
    method: "POST",
    url: `/forum/post/${postId}`,
    data: {
      content: content,
    },
  });
  return res.data;
}

export async function replyToComment(commentId: string, content: string) {
  const res = await axiosApi({
    method: "POST",
    url: `/forum/comment/${commentId}`,
    data: {
      content: content,
    },
  });
  return res.data;
}

export async function updateReply(commentId: string, content: string) {
  const res = await axiosApi({
    method: "PUT",
    url: `/forum/comment/${commentId}`,
    data: {
      content: content,
    },
  });
  return res.data;
}

export async function deleteReply(commentId: string): Promise<void> {
  await axiosApi({
    method: "DELETE",
    url: `/forum/comment/${commentId}`,
  });
}

export async function likeReply(commentId: string): Promise<void> {
  await axiosApi({
    method: "POST",
    url: `/forum/likeComment/${commentId}`,
  });
}

export async function unlikeReply(commentId: string): Promise<void> {
  await axiosApi({
    method: "DELETE",
    url: `/forum/likeComment/${commentId}`,
  });
}

/** ------------------------ MY POSTS / GROUPS ------------------------ **/

export function fetchMyPosts(query: string = "", pageNumber: number = 1) {
  const [myPostList, setMyPostList] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);

  useEffect(() => {
    setMyPostList([]);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const signal = controller.signal;

    axiosApi({
      method: "GET",
      url: "/forum/myPosts",
      params: {
        q: query,
        page: pageNumber,
      },
      signal: signal,
    })
      .then((res) => {
        if (!res || !res.data) return;
        const postList = res.data as Post[];
        setMyPostList((prev) => [...new Set([...prev, ...res.data])]);
        setHasMore(postList.length > 0);
        setLoading(false);
      })
      .catch((e) => {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: " + e.message);
        }
        console.error(e);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [pageNumber, query]);

  function deletePostFromList(postId: string) {
    setMyPostList((prev) => prev.filter((post) => post.postId !== postId));
  }

  return { myPostList, loading, error, hasMore, deletePostFromList };
}

export function fetchMyGroups(query: string = "", pageNumber: number = 1) {
  const [myGroupList, setMyGroupList] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  useEffect(() => {
    setMyGroupList([]);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    const signal = controller.signal;

    axiosApi({
      method: "GET",
      url: "/forum/myGroups",
      params: {
        q: query,
        page: pageNumber,
      },
      signal: signal,
    })
      .then((res) => {
        if (!res || !res.data) return;
        setMyGroupList((prev) => [...new Set([...prev, ...res.data])]);
        setHasMore(res.data.length > 0);
        setLoading(false);
      })
      .catch((e) => {
        if (axios.isCancel(e)) {
          console.log("Request cancelled: " + e.message);
        }
        console.error(e);
        setError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [query, pageNumber]);

  const deleteGroupFromList = (groupId: string) => {
    setMyGroupList((prev) => prev.filter((g) => g.groupId !== groupId));
  };

  return {
    myGroupList,
    loading,
    error,
    hasMore,
    deleteGroupFromList,
  };
}

/** ------------------------ TAGS ------------------------ **/

export async function getGroupTagList(groupId: string) {
  const data = await axiosApi({
    method: "GET",
    url: `/forum/tag/${groupId}`,
  });
  const tags = data.data as string[];
  return tags;
}

export async function getPostTagList(postId: string) {
  const data = await axiosApi({
    method: "GET",
    url: `/forum/postTags/${postId}`,
  });
  const tags = data.data as string[];
  return tags;
}

/** ------------------------ RESOURCES ------------------------ **/

export async function getGroupResourceList(groupId: string) {
  const data = await axiosApi({
    method: "GET",
    url: `/forum/resources/${groupId}`,
  });
  const groupResources = data.data as {
    groupId: string;
    groupName: string;
    ownerId: string;
    ResourceClusters: ResourceClusterType[];
  };
  return groupResources;
}

export function createGroupResourceCluster(
  groupId: string,
  name: string,
  description: string = ""
) {
  return axiosApi({
    method: "POST",
    url: `/forum/resources/${groupId}`,
    data: {
      name: name,
      description: description,
    },
  });
}

export async function editGroupResourceCluster(
  groupId: string,
  clusterId: string,
  name: string,
  description: string = ""
) {
  const data = await axiosApi({
    method: "PUT",
    url: `/forum/resources/${groupId}/${clusterId}`,
    data: {
      name: name,
      description: description,
    },
  });
  return data;
}

export async function deleteGroupResourceCluster(
  groupId: string,
  clusterId: string
) {
  await axiosApi({
    method: "DELETE",
    url: `/forum/resources/${groupId}/${clusterId}`,
  });
}

export function createGroupResource(
  clusterId: string,
  title: string,
  link: string = "",
  description: string = ""
) {
  return axiosApi({
    method: "POST",
    url: `/forum/resource/${clusterId}`,
    data: {
      title: title,
      link: link,
      description: description,
    },
  });
}

export async function editClusterResource(
  clusterId: string,
  resourceId: string,
  name: string,
  link: string,
  description: string = ""
) {
  const data = await axiosApi({
    method: "PUT",
    url: `/forum/resource/${clusterId}/${resourceId}`,
    data: {
      name: name,
      link: link,
      description: description,
    },
  });
  return data;
}

export async function deleteClusterResource(
  clusterId: string,
  resourceId: string
) {
  await axiosApi({
    method: "DELETE",
    url: `/forum/resource/${clusterId}/${resourceId}`,
  });
}

/** ------------------------ FRONTEND COMMENT FORMATTING ------------------------ **/
export function addCommentReply(
  comments: Reply[],
  targetId: string,
  newReply: Reply
): Reply[] {
  return updateNestedComments(comments, targetId, (comment) => {
    return {
      ...comment,
      Replies: [...comment.Replies, newReply],
    };
  });
}

export function addCommentReplies(
  comments: Reply[],
  targetId: string,
  newReplies: Reply[]
): Reply[] {
  return updateNestedComments(comments, targetId, (comment) => {
    return {
      ...comment,
      Replies: [...comment.Replies, ...newReplies],
    };
  });
}

export function editComment(
  comments: Reply[],
  targetId: string,
  content: string
): Reply[] {
  return updateNestedComments(comments, targetId, (comment) => {
    return {
      ...comment,
      comment: content,
    };
  });
}

export function likeAndUnlikeComment(
  comments: Reply[],
  targetId: string
): Reply[] {
  return updateNestedComments(comments, targetId, (comment) => {
    return comment.isLiked
      ? {
          ...comment,
          isLiked: false,
          likes: comment.likes > 0 ? comment.likes - 1 : 0,
        }
      : {
          ...comment,
          isLiked: true,
          likes: comment.likes + 1,
        };
  });
}

export function deleteCommentReply(
  comments: Reply[],
  parentId: string,
  targetId: string
): Reply[] {
  return updateNestedComments(comments, parentId, (comment) => {
    return {
      ...comment,
      Replies: comment.Replies.filter((reply) => reply.commentId !== targetId),
    };
  });
}

export function updateNestedComments(
  commentList: Reply[],
  targetId: string,
  updateFn: (comment: Reply) => Reply
): Reply[] {
  return commentList.map((comment) => {
    if (comment.commentId === targetId) {
      return updateFn(comment);
    } else if (comment.Replies.length > 0) {
      return {
        ...comment,
        Replies: updateNestedComments(comment.Replies, targetId, updateFn),
      };
    } else {
      return comment;
    }
  });
}

/** ------------------------ SUMMARY ------------------------ **/

export async function runSummaryFlow(input: string): Promise<string> {
  try {
    const res = await axiosApi({
      method: "POST",
      url: "/summary/runSummary",
      data: {
        input: input,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary");
  }
}

// Hook for summary generation with loading state
export function useSummaryGeneration() {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async (type: "post" | "group", id: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`Generating summary for ${type} with ${type}Id ${id}`);
      const result = await (type === "post"
        ? getPostSummary(id)
        : getGroupSummary(id));
      setSummary(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate summary";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { summary, loading, error, generateSummary };
}

export async function getGroupSummary(groupId: string) {
  const res = await axiosApi({
    method: "GET",
    url: `/summary/group/${groupId}`,
  });
  return res.data;
}

export async function getPostSummary(postId: string) {
  const res = await axiosApi({
    method: "GET",
    url: `/summary/post/${postId}`,
  });
  return res.data;
}
