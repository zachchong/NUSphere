import Comment from "#db/models/Comment.js";
import ForumGroup from "#db/models/ForumGroup.js";
import Post from "#db/models/Post.js";
import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";

// Read
export const handleGetGroupList = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  console.log("getting group list");
  const params = req.query;
  try {
    if (typeof params.q == "string" && typeof params.page == "string") {
      const { groups } = await searchGroup(params.q, parseInt(params.page), 10);
      res.json(groups);
    } else {
      const { groups } = await searchGroup(
        "",
        parseInt(typeof params.page === "string" ? params.page : "1"),
        10,
      );
      groups.forEach((group) => {
        console.log(group.toJSON());
      });
      res.json(groups);
    }
  } catch (error) {
    next(error);
  }
  return;
};

const searchGroup = async (searchValue: string, page = 1, pageSize = 10) => {
  const offset = (page - 1) * pageSize;
  const { count, rows } = await ForumGroup.findAndCountAll({
    attributes: ["groupId", "groupName", "description", "postCount", "ownerId"],
    limit: pageSize,
    offset: offset,
    order: [["groupName", "ASC"]],
    where: {
      groupName: { [Op.iLike]: `%${searchValue}%` },
    },
  });
  return {
    currentPage: page,
    groups: rows,
    totalCount: count,
    totalPages: Math.ceil(count / pageSize),
  };
};

export const handleGetGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const params = req.params;
  const groupId = params.groupId || "No param";
  try {
    const group = await ForumGroup.findByPk(groupId);
    if (!group) throw new Error(`Cant find group of id ${groupId}`);
    res.json(group);
  } catch (error) {
    next(error);
  }
  return;
};

export const handleGetGroupPostList = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const params = req.query;
  const groupId = req.params.groupId;
  try {
    if (typeof params.q == "string" && typeof params.page === "string") {
      const page = parseInt(params.page);
      const group: ForumGroup | null = await ForumGroup.findByPk(groupId);
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const { posts } = await searchGroupPosts(groupId, params.q, page, 10);
      res.json({
        groupName: group.groupName,
        posts: posts,
      });
    } else {
      throw new Error("No such group id. Make sure group id is a string");
    }
  } catch (error) {
    next(error);
  }
  return;
};

const searchGroupPosts = async (
  groupId: string,
  query: string,
  page = 1,
  pageSize = 10,
) => {
  const offset = (page - 1) * pageSize;
  const { count, rows } = await Post.findAndCountAll({
    attributes: [
      "postId",
      "title",
      "details",
      "groupId",
      "uid",
      "likes",
      "createdAt",
      "views",
      "replies",
    ],
    limit: pageSize,
    offset: offset,
    order: [["createdAt", "DESC"]],
    where: {
      [Op.and]: {
        groupId: groupId,
        title: {
          [Op.iLike]: `%${query}%`,
        },
      },
    },
  });
  return {
    currentPage: page,
    posts: rows,
    totalCount: count,
    totalPages: Math.ceil(count / pageSize),
  };
};

export const handleGetAllPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const params = req.query;
  try {
    if (typeof params.q == "string" && typeof params.page === "string") {
      const page = parseInt(params.page);
      const { posts } = await searchAllPosts(params.q, page, 10);
      const formattedPosts = await Promise.all(
        posts.map(async (post) => {
          await post.getGroupName();
          return {
            createdAt: post.createdAt,
            details: post.details,
            groupId: post.groupId,
            groupName: post.groupName,
            likes: post.likes,
            postId: post.postId,
            replies: post.replies,
            title: post.title,
            uid: post.uid,
            views: post.views,
          };
        }),
      );
      res.json(formattedPosts);
    } else {
      const { posts } = await searchAllPosts(
        "",
        parseInt(typeof params.page === "string" ? params.page : "1"),
        10,
      );
      const formattedPosts = await Promise.all(
        posts.map((post) => post.getGroupName()),
      );
      res.json(formattedPosts);
    }
  } catch (error) {
    next(error);
  }
  return;
};

const searchAllPosts = async (query: string, page = 1, pageSize = 10) => {
  const offset = (page - 1) * pageSize;
  const whereClause: {
    title?: {
      [Op.iLike]: string;
    };
  } = {};
  if (query.trim()) {
    whereClause.title = {
      [Op.iLike]: `%${query}%`,
    };
  }
  const { count, rows } = await Post.findAndCountAll({
    attributes: [
      "postId",
      "title",
      "details",
      "groupId",
      "uid",
      "likes",
      "createdAt",
      "views",
      "replies",
    ],
    limit: pageSize,
    offset: offset,
    order: [["createdAt", "DESC"]],
    where: whereClause,
  });
  return {
    currentPage: page,
    posts: rows,
    totalCount: count,
    totalPages: Math.ceil(count / pageSize),
  };
};

// Create
export const handleCreateGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const data = req.body as { description: string; name: string };
  try {
    const group = await req.user?.createOwnedGroup({
      description: data.description,
      groupName: data.name,
      ownerId: req.user.uid,
      ownerType: "User",
    });
    res.json(group);
  } catch (error) {
    next(error);
  }
};

export const handleCreateNewPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const data = req.body as { details: string; title: string };
  const groupId = req.params.groupId;
  try {
    const group = await ForumGroup.findByPk(groupId);
    if (!group) throw new Error("Forum group not found");
    const post = await group.createPost({
      details: data.details,
      title: data.title,
      uid: req.user?.uid,
    });
    await group.increment("postCount");
    res.json(post);
  } catch (error) {
    next(error);
  }
  return;
};

// Update
export const handleUpdateGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const groupId = req.params.groupId;
  const data = req.body as { description: string; name: string };
  try {
    const groups = await req.user?.getOwnedGroups({
      where: {
        groupId: groupId,
      },
    });
    if (!groups || groups.length === 0)
      throw new Error(
        `User ${req.user?.uid ?? ""} does not own this group ${groupId}, cannot update group`,
      );
    const group = groups[0];
    const updated = await group.update({
      description: data.description,
      groupName: data.name,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const handleUpdatePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const postId = req.params.postId;
  const data = req.body as { details: string; title: string };
  try {
    const posts = await req.user?.getPosts({
      where: {
        postId: postId,
      },
    });
    if (!posts || posts.length === 0)
      throw new Error(
        `User ${req.user?.uid ?? ""} does not own this post ${postId}, cannot update post`,
      );
    const post = posts[0];
    const updated = await post.update({
      details: data.details,
      title: data.title,
    });

    console.log(updated.toJSON());
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete
export const handleDeleteGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const groupId = req.params.groupId;
  try {
    const groups = await req.user?.getOwnedGroups({
      where: {
        groupId: groupId,
      },
    });
    if (!groups || groups.length === 0)
      throw new Error(
        `User ${req.user?.uid ?? ""} does not own this group ${groupId}, cannot update group`,
      );
    const group = groups[0];
    await group.destroy();
    res.status(200);
  } catch (error) {
    next(error);
  }
};

export const handleDeletePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const postId = req.params.postId;
  try {
    const posts = await req.user?.getPosts({
      where: {
        postId: postId,
      },
    });
    if (!posts || posts.length === 0)
      throw new Error(
        `User ${req.user?.uid ?? ""} does not own this post ${postId}, cannot update post`,
      );
    const post = posts[0];
    const group = await post.getForumGroup();
    await post.destroy();
    await group.decrement("postCount");
    res.status(200);
  } catch (error) {
    next(error);
  }
};

// Comments
export const handleGetPostComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const postId = req.params.postId;
  const params = req.query;
  try {
    if (typeof params.page == "string") {
      const post = await Post.findByPk(postId);
      if (!post) {
        res.status(404).send("Post Not Found");
        return;
      }
      const comments = await searchPostComments(
        post,
        parseInt(params.page),
        10,
      );

      res.json(
        comments.map((comment) => ({ ...comment.toJSON(), Replies: [] })),
      );
    }
  } catch (error) {
    next(error);
  }
  return;
};

const searchPostComments = async (post: Post, page = 1, pageSize = 10) => {
  const offset = (page - 1) * pageSize;
  const comments = await post.getReplies({
    attributes: [
      "commentId",
      "comment",
      "parentId",
      "parentType",
      "uid",
      "createdAt",
      "replies",
    ],
    limit: pageSize,
    offset: offset,
    order: [["createdAt", "DESC"]],
  });
  return comments;
};

export const handleGetCommentComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const commentId = req.params.commentId;
  try {
    const parentComment = await Comment.findByPk(commentId);
    if (!parentComment) {
      res.status(404).send("Comment Not Found");
      return;
    }
    const comments = await parentComment.getReplies();
    res.json(comments.map((comment) => ({ ...comment.toJSON(), Replies: [] })));
  } catch (error) {
    next(error);
  }
  return;
};

export const handleReplyToComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const commentId = req.params.commentId;
  const data = req.body as { content: string };
  try {
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      res.status(404).send("Comment Not Found");
      return;
    }
    if (!req.user) {
      res.status(401).send("User Not Found");
      return;
    }
    const childComment = await comment.createReply({
      comment: data.content,
      parentId: comment.commentId,
      parentType: "ParentComment",
      uid: req.user.uid,
    });
    await comment.increment("replies");
    res.json({ ...childComment.toJSON(), Replies: [] });
  } catch (error) {
    next(error);
  }
};

export const handleReplyToPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const postId = req.params.postId;
  const data = req.body as { content: string };
  try {
    const post = await Post.findByPk(postId);
    if (!post) {
      res.status(404).send("Post Not Found");
      return;
    }
    if (!req.user) {
      res.status(401).send("User Not Found");
      return;
    }
    const comment = await post.createReply({
      comment: data.content,
      parentId: post.postId,
      parentType: "ParentPost",
      uid: req.user.uid,
    });
    await post.increment("replies");
    res.json({ ...comment.toJSON(), Replies: [] });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteReply = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const commentId = req.params.commentId;
  try {
    const comments = await req.user?.getComments({
      where: {
        commentId: commentId,
      },
    });
    if (!comments || comments.length === 0) {
      res.status(404).send("Comment not found");
      return;
    }
    const comment = comments[0];
    await comment.destroy();
    res.status(200);
  } catch (error) {
    next(error);
  }
};

export const handleUpdateReply = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const commentId = req.params.commentId;
  const data = req.body as { content: string };
  try {
    const comments = await req.user?.getComments({
      where: {
        commentId: commentId,
      },
    });
    if (!comments || comments.length === 0) {
      res.status(404).send("Comment not found");
      return;
    }
    const comment = comments[0];
    const updated = await comment.update({
      comment: data.content,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// My posts and groups
export const handleGetMyGroupList = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).send("No User Found");
    return;
  }
  const params = req.query;
  try {
    if (typeof params.q == "string" && typeof params.page == "string") {
      const { groups } = await searchMyGroups(
        req.user.uid,
        params.q,
        parseInt(params.page),
        10,
      );
      res.json(groups);
    } else {
      const { groups } = await searchMyGroups(
        req.user.uid,
        "",
        parseInt(typeof params.page === "string" ? params.page : "1"),
        10,
      );
      groups.forEach((group) => {
        console.log(group.toJSON());
      });
      res.json(groups);
    }
  } catch (error) {
    next(error);
  }
  return;
};

const searchMyGroups = async (
  uid: string,
  searchValue: string,
  page = 1,
  pageSize = 10,
) => {
  const offset = (page - 1) * pageSize;
  const { count, rows } = await ForumGroup.findAndCountAll({
    attributes: ["groupId", "groupName", "description", "postCount", "ownerId"],
    limit: pageSize,
    offset: offset,
    order: [["groupName", "ASC"]],
    where: {
      groupName: { [Op.iLike]: `%${searchValue}%` },
      ownerId: uid,
      ownerType: "User",
    },
  });
  return {
    currentPage: page,
    groups: rows,
    totalCount: count,
    totalPages: Math.ceil(count / pageSize),
  };
};

export const handleGetMyPostList = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).send("No User Found");
    return;
  }
  const params = req.query;
  try {
    if (typeof params.q == "string" && typeof params.page === "string") {
      const page = parseInt(params.page);
      const { posts } = await searchMyPost(req.user.uid, params.q, page, 10);
      const formattedPosts = await Promise.all(
        posts.map(async (post) => {
          await post.getGroupName();
          return {
            createdAt: post.createdAt,
            details: post.details,
            groupId: post.groupId,
            groupName: post.groupName,
            likes: post.likes,
            postId: post.postId,
            replies: post.replies,
            title: post.title,
            uid: post.uid,
            views: post.views,
          };
        }),
      );
      res.json(formattedPosts);
    } else {
      const { posts } = await searchMyPost(
        req.user.uid,
        "",
        parseInt(typeof params.page === "string" ? params.page : "1"),
        10,
      );
      const formattedPosts = await Promise.all(
        posts.map((post) => post.getGroupName()),
      );
      res.json(formattedPosts);
    }
  } catch (error) {
    next(error);
  }
  return;
};

const searchMyPost = async (
  uid: string,
  query: string,
  page = 1,
  pageSize = 10,
) => {
  const offset = (page - 1) * pageSize;
  const { count, rows } = await Post.findAndCountAll({
    attributes: [
      "postId",
      "title",
      "details",
      "groupId",
      "uid",
      "likes",
      "createdAt",
      "views",
      "replies",
    ],
    limit: pageSize,
    offset: offset,
    order: [["createdAt", "DESC"]],
    where: {
      title: { [Op.iLike]: `%${query}%` },
      uid: uid,
    },
  });
  return {
    currentPage: page,
    posts: rows,
    totalCount: count,
    totalPages: Math.ceil(count / pageSize),
  };
};
