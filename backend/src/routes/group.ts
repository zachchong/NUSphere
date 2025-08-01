import {
  handleGetGroup,
  handleGetGroupList,
  handleGetGroupPostList,
} from "#controllers/forumController.js";
import { Router } from "express";

const router = Router();

router.get("/groups/:groupId", handleGetGroup);
router.get("/groups", handleGetGroupList);

router.get("/groups/posts", handleGetGroupPostList);

export default router;
