import cron from 'node-cron';

export class Cron {
  /**
   * Constructs cron service
   */
  constructor() {
    this.tasks = [];
  }

  /**
   * Adds new scheduled task
   * @param {String} schedule cron string
   * @param {Function} fn call back function
   */
  add(schedule, fn) {
    this.tasks.push(cron.schedule(schedule, fn));
  }

  /**
   * Resets all scheduled tasks
   */
  reset() {
    this.tasks.forEach(task => task.destroy());
    this.tasks = [];
  }
}

export default new Cron();
