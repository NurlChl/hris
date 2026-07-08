type JobHandler = (data: any) => Promise<void>;

class QueueManager {
  private handlers: Map<string, JobHandler> = new Map();
  private isRedis: boolean = false;
  private inMemoryJobs: Map<string, Array<{ id: string; data: any; runAt: number }>> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.isRedis = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
    if (!this.isRedis) {
      console.log("Redis not configured. QueueManager is running in In-Memory Local fallback mode.");
      this.startInMemoryScheduler();
    } else {
      console.log("Redis configured. (In a full scale deployment, BullMQ connects here)");
    }
  }

  /**
   * Register a job processing handler for a specific queue name
   */
  registerWorker(queueName: string, handler: JobHandler) {
    this.handlers.set(queueName, handler);
  }

  /**
   * Add a job to the queue
   */
  async addJob(queueName: string, jobName: string, data: any, delayMs: number = 0) {
    const jobId = `${queueName}:${jobName}:${Date.now()}:${Math.random().toString(36).substr(2, 5)}`;
    
    if (this.isRedis) {
      console.log(`[QueueManager (Redis)] Enqueued job ${jobId} to ${queueName} with delay ${delayMs}ms`);
      // Here you would connect to BullMQ:
      // const queue = new Queue(queueName, { connection });
      // await queue.add(jobName, data, { delay: delayMs });
    } else {
      console.log(`[QueueManager (Memory)] Enqueued job ${jobId} to ${queueName} with delay ${delayMs}ms`);
      const runAt = Date.now() + delayMs;
      
      if (!this.inMemoryJobs.has(queueName)) {
        this.inMemoryJobs.set(queueName, []);
      }
      this.inMemoryJobs.get(queueName)!.push({ id: jobId, data, runAt });
    }
  }

  private startInMemoryScheduler() {
    this.checkInterval = setInterval(async () => {
      const now = Date.now();
      
      for (const [queueName, jobs] of this.inMemoryJobs.entries()) {
        const handler = this.handlers.get(queueName);
        if (!handler) continue;

        const runnableJobs = jobs.filter((j) => j.runAt <= now);
        // Remove from list
        this.inMemoryJobs.set(
          queueName,
          jobs.filter((j) => j.runAt > now)
        );

        for (const job of runnableJobs) {
          try {
            console.log(`[QueueManager (Memory)] Processing job ${job.id}`);
            await handler(job.data);
            console.log(`[QueueManager (Memory)] Finished job ${job.id} successfully`);
          } catch (err: any) {
            console.error(`[QueueManager (Memory)] Error processing job ${job.id}:`, err.message);
          }
        }
      }
    }, 1000); // Check every second
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
export default queueManager;
