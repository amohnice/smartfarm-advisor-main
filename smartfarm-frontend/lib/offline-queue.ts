const offlineQueueManager = `
interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body: any;
  timestamp: number;
}

class OfflineQueueManager {
  private queueKey = 'smartfarm-offline-queue';

  // Add request to queue
  async enqueue(endpoint: string, method: string, body: any) {
    const queue = this.getQueue();
    
    const request: QueuedRequest = {
      id: Date.now().toString(),
      endpoint,
      method,
      body,
      timestamp: Date.now(),
    };
    
    queue.push(request);
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
    
    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-offline-queue');
    }
    
    return request.id;
  }

  // Get all queued requests
  getQueue(): QueuedRequest[] {
    const stored = localStorage.getItem(this.queueKey);
    return stored ? JSON.parse(stored) : [];
  }

  // Process queue when online
  async processQueue() {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    const results = await Promise.allSettled(
      queue.map(async (request) => {
        try {
          const response = await fetch(request.endpoint, {
            method: request.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
          });
          
          if (!response.ok) throw new Error('Request failed');
          
          return { success: true, id: request.id };
        } catch (error) {
          return { success: false, id: request.id, error };
        }
      })
    );

    // Remove successful requests
    const successfulIds = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => (r as any).value.id);

    if (successfulIds.length > 0) {
      const remaining = queue.filter(r => !successfulIds.includes(r.id));
      localStorage.setItem(this.queueKey, JSON.stringify(remaining));
    }

    return results;
  }

  // Clear queue
  clearQueue() {
    localStorage.removeItem(this.queueKey);
  }

  // Get queue size
  getQueueSize() {
    return this.getQueue().length;
  }
}

export const offlineQueue = new OfflineQueueManager();

// Auto-process queue when online
window.addEventListener('online', () => {
  console.log('[Offline Queue] Back online, processing queue...');
  offlineQueue.processQueue();
});
`;
