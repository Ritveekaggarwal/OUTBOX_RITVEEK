import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { Router } from 'express';

export const BULL_BOARD_PATH = '/admin/queues';

/** Live BullMQ dashboard: delayed, active, completed and failed jobs in real time. */
export function createBullBoardRouter(queues: Queue[]): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_PATH);
  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
    options: { uiConfig: { boardTitle: 'ReachInbox Queues' } },
  });
  return serverAdapter.getRouter() as Router;
}
