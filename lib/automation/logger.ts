import { AutomationLog, type AutomationActionType, type AutomationRunStatus } from "@/lib/db/models/AutomationLog";
import type { Types } from "mongoose";

export async function logAutomationAction(params: {
  eventId: Types.ObjectId;
  actionType: AutomationActionType;
  recipientCount: number;
  status: AutomationRunStatus;
  errorDetail?: string;
}): Promise<void> {
  await AutomationLog.create({
    eventId: params.eventId,
    actionType: params.actionType,
    recipientCount: params.recipientCount,
    status: params.status,
    errorDetail: params.errorDetail,
    runAt: new Date(),
  });
}
