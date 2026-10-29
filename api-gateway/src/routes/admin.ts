import { Router } from "express";
import { Request, Response } from "express";
import { requireApprovedIdentity, requireLibrarian } from "../auth";
import { changeMemberStatus, listMemberRequests } from "../identity";

export const adminRouter = Router();
adminRouter.use(requireApprovedIdentity, requireLibrarian);

adminRouter.get("/member-requests", async (_req, res) => {
  try {
    res.json(await listMemberRequests());
  } catch (error: unknown) {
    console.error("Member request listing failed", error);
    res.status(500).json({ error: "Member requests could not be loaded." });
  }
});

async function updateStatus(
  req: Request<{ memberId: string }>,
  res: Response,
  status: "approved" | "rejected",
): Promise<void> {
  const memberId = req.params.memberId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId)) {
    res.status(400).json({ error: "Invalid member ID." });
    return;
  }

  const identity = req.identity;
  if (identity?.memberId === memberId) {
    res.status(409).json({ error: "You cannot change your own account status." });
    return;
  }

  try {
    const result = await changeMemberStatus(memberId, status);
    if (result === "not-found") {
      res.status(404).json({ error: "Member request not found." });
      return;
    }
    if (result === "invalid-transition") {
      res.status(409).json({ error: "Only pending registrations can be updated." });
      return;
    }
    res.json({ memberId, status });
  } catch (error: unknown) {
    console.error("Member status update failed", error);
    res.status(500).json({ error: "Member request could not be updated." });
  }
}

adminRouter.patch("/member-requests/:memberId/approve", async (req, res) => updateStatus(req, res, "approved"));
adminRouter.patch("/member-requests/:memberId/reject", async (req, res) => updateStatus(req, res, "rejected"));
