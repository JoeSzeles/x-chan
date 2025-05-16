import cron from "node-cron";
import NewsBot from "../models/NewsBot.js";
import newsBotService from "../services/newsBotService.js";

class BotUpdateScheduler {
    constructor() {
        this.jobs = new Map();
    }

    async start() {
        try {
            // Get all active bots
            const bots = await NewsBot.find({ status: "active" });
            
            // Schedule update for each bot
            for (const bot of bots) {
                this.scheduleBot(bot);
            }

            // Start the scheduler
            console.log("Bot update scheduler started");
        } catch (error) {
            console.error("Error starting bot update scheduler:", error);
        }
    }

    scheduleBot(bot) {
        try {
            // Cancel existing job if any
            if (this.jobs.has(bot._id)) {
                this.jobs.get(bot._id).stop();
            }

            // Create new cron job
            const job = cron.schedule(`*/${bot.updateInterval} * * * *`, async () => {
                try {
                    console.log(`Updating bot: ${bot.name}`);
                    const result = await newsBotService.updateBotArticles(bot._id);
                    console.log(`Bot ${bot.name} updated: ${result.newArticles.length} new articles, ${result.errors.length} errors`);
                } catch (error) {
                    console.error(`Error updating bot ${bot.name}:`, error);
                }
            });

            // Store the job
            this.jobs.set(bot._id, job);
            console.log(`Scheduled bot ${bot.name} to update every ${bot.updateInterval} minutes`);
        } catch (error) {
            console.error(`Error scheduling bot ${bot.name}:`, error);
        }
    }

    async updateBotSchedule(botId) {
        try {
            const bot = await NewsBot.findById(botId);
            if (bot && bot.status === "active") {
                this.scheduleBot(bot);
            } else if (this.jobs.has(botId)) {
                this.jobs.get(botId).stop();
                this.jobs.delete(botId);
            }
        } catch (error) {
            console.error(`Error updating bot schedule for ${botId}:`, error);
        }
    }

    stop() {
        // Stop all jobs
        for (const [botId, job] of this.jobs) {
            job.stop();
            console.log(`Stopped update schedule for bot ${botId}`);
        }
        this.jobs.clear();
    }
}

export default new BotUpdateScheduler(); 