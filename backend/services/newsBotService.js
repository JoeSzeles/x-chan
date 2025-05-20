import NewsBot from "../models/NewsBot.js";
import NewsArticle from "../models/NewsArticle.js";
import scraperService from "./scraperService.js";
import Post from "../models/post.model.js";

class NewsBotService {
    constructor() {
        this.scraperService = scraperService;
    }

    async createBot(userId, botData) {
        try {
            const bot = new NewsBot({
                ...botData,
                owner: userId,
                status: "active",
                stats: {
                    totalArticles: 0,
                    errorCount: 0
                }
            });

            await bot.save();
            return bot;
        } catch (error) {
            throw new Error(`Failed to create bot: ${error.message}`);
        }
    }

    async updateBot(botId, userId, updateData) {
        try {
            console.log('[NewsBotService] Updating bot:', { botId, updateData });
            const bot = await NewsBot.findOne({ _id: botId, owner: userId });
            if (!bot) {
                throw new Error("Bot not found or unauthorized");
            }

            // Ensure websites array is properly updated with all fields
            if (updateData.websites) {
                updateData.websites = updateData.websites.map(website => ({
                    ...website,
                    searchTerms: website.searchTerms || '',
                    type: website.type || 'news'
                }));
            }

            Object.assign(bot, updateData);
            await bot.save();

            console.log('[NewsBotService] Bot updated successfully:', {
                id: bot._id,
                name: bot.name,
                websites: bot.websites
            });

            return bot;
        } catch (error) {
            console.error('[NewsBotService] Error updating bot:', error);
            throw new Error(`Failed to update bot: ${error.message}`);
        }
    }

    async deleteBot(botId, userId) {
        try {
            const bot = await NewsBot.findOne({ _id: botId, owner: userId });
            if (!bot) {
                throw new Error("Bot not found or unauthorized");
            }

            // Delete all articles associated with the bot
            await NewsArticle.deleteMany({ bot: botId });
            await bot.deleteOne();
        } catch (error) {
            throw new Error(`Failed to delete bot: ${error.message}`);
        }
    }

    async getBotsByUser(userId, query = {}) {
        try {
            // Ensure the query includes the user ID
            const finalQuery = { ...query, owner: userId };
            return await NewsBot.find(finalQuery);
        } catch (error) {
            throw new Error(`Failed to fetch bots: ${error.message}`);
        }
    }

    async createPostFromArticle(article, bot) {
        try {
            console.log('[NewsBotService] Creating post from article:', {
                articleTitle: article.title,
                botId: bot._id,
                botOwner: bot.owner
            });

            // Create a post from the article
            const post = new Post({
                user: bot.owner, // Use bot owner's ID as the user
                bot: bot._id, // Reference to the bot
                article: article._id, // Reference to the article
                text: `${article.title}\n\n${article.description}\n\nRead more: ${article.url}`,
                img: article.imageUrl,
                postNumber: await this.getNextPostNumber(),
                threadId: await this.getNextThreadId()
            });

            await post.save();
            console.log('[NewsBotService] Post created successfully:', {
                postId: post._id,
                userId: post.user,
                botId: post.bot
            });
            return post;
        } catch (error) {
            console.error('[NewsBotService] Error creating post:', {
                error: error.message,
                stack: error.stack,
                articleId: article._id,
                botId: bot._id
            });
            throw error;
        }
    }

    async getNextPostNumber() {
        const highestPost = await Post.findOne({}, {}, { sort: { 'postNumber': -1 } });
        return highestPost ? highestPost.postNumber + 1 : 1;
    }

    async getNextThreadId() {
        const highestPost = await Post.findOne({}, {}, { sort: { 'threadId': -1 } });
        return highestPost ? highestPost.threadId + 1 : 1;
    }

    async updateBotArticles(botId) {
        try {
            console.log('[NewsBotService] Starting updateBotArticles:', {
                botId,
                timestamp: new Date().toISOString()
            });

            // Check if enough time has passed since last update based on updateInterval
            const bot = await NewsBot.findById(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }

            const now = new Date();
            const lastUpdate = bot.lastUpdate || new Date(0);
            const minutesSinceLastUpdate = (now - lastUpdate) / (1000 * 60);

            if (minutesSinceLastUpdate < bot.updateInterval && !bot.forceUpdate) {
                console.log(`[NewsBotService] Skipping update - ${minutesSinceLastUpdate} minutes since last update`);
                return {
                    success: true,
                    data: {
                        skipped: true,
                        nextUpdate: new Date(lastUpdate.getTime() + (bot.updateInterval * 60 * 1000)),
                        message: `Next update in ${Math.round(bot.updateInterval - minutesSinceLastUpdate)} minutes`
                    }
                };
            }

            console.log('[NewsBotService] Bot details:', {
                id: bot._id,
                name: bot.name,
                websites: bot.websites,
                searchTerms: bot.websites.map(w => w.searchTerms)
            });

            let totalArticles = 0;
            let errorCount = 0;
            let newArticles = 0;
            let articles = [];

            if (!bot.websites || !Array.isArray(bot.websites)) {
                console.error('[NewsBotService] No valid websites found');
                return {
                    success: false,
                    error: 'No valid websites configured'
                };
            }

            for (const website of bot.websites) {
                if (!website || !website.url) {
                    console.error('[NewsBotService] Invalid website config:', website);
                    errorCount++;
                    continue;
                }

                console.log('[NewsBotService] Processing website:', {
                    url: website.url,
                    type: website.type,
                    searchTerms: website.searchTerms
                });

                try {
                    console.log('[NewsBotService] Processing website:', {
                        url: website.url,
                        type: website.type,
                        searchTerms: website.searchTerms,
                        selector: website.selector
                    });

                    // Ensure search terms are properly added to YouTube URL
                    if (website.type === 'video' && website.url.includes('youtube.com')) {
                        const searchTerms = website.searchTerms.split(',').map(t => t.trim()).join('+');
                        website.url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}`;
                    }
                    const scrapedArticles = await this.scraperService.scrapeWebsite(website);
                    console.log('[NewsBotService] Found', scrapedArticles.length, 'articles for website:', website.url);

                    // Save articles to database and count new ones
                    for (const article of scrapedArticles) {
                        const existingArticle = await NewsArticle.findOne({ url: article.url });
                        if (!existingArticle) {
                            newArticles++;
                        }
                        await NewsArticle.findOneAndUpdate(
                            { url: article.url },
                            { ...article, bot: botId },
                            { upsert: true, new: true }
                        );
                    }

                    totalArticles += scrapedArticles.length;
                    articles = articles.concat(scrapedArticles);
                } catch (error) {
                    console.error('[NewsBotService] Error processing website:', website.url, error);
                    errorCount++;
                }
            }

            // Update bot stats and lastUpdate
            const updateData = {
                $set: {
                    lastUpdate: new Date(),
                    'stats.totalArticles': totalArticles,
                    'stats.errorCount': errorCount,
                    'stats.newArticles': newArticles
                }
            };

            const updatedBot = await NewsBot.findByIdAndUpdate(
                botId,
                updateData,
                { new: true }
            );

            console.log('[NewsBotService] Update complete:', {
                botId,
                totalArticles,
                errorCount,
                newArticles,
                lastUpdate: updatedBot.lastUpdate
            });

            return {
                success: true,
                data: {
                    totalArticles,
                    errorCount,
                    newArticles,
                    lastUpdate: updatedBot.lastUpdate,
                    articles: articles || [],
                    notification: newArticles > 0 ? {
                        type: 'success',
                        message: `Found ${newArticles} new articles!`,
                        botName: bot.name
                    } : {
                        type: 'info',
                        message: 'No new articles found.',
                        botName: bot.name
                    }
                }
            };
        } catch (error) {
            console.error('[NewsBotService] Error updating bot articles:', error);
            throw error;
        }
    }

    async getBotArticles(botId, page = 1, limit = 10) {
        try {
            console.log('[NewsBotService] Fetching articles for bot:', botId);
            
            // First verify bot exists
            const bot = await NewsBot.findById(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }

            // Force update if no articles
            const count = await NewsArticle.countDocuments({ bot: botId });
            if (count === 0) {
                await this.updateBotArticles(botId);
            }

            const skip = (page - 1) * limit;
            const articles = await NewsArticle.find({ bot: botId })
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit);

            console.log('Found articles:', articles.length);
            if (articles.length === 0) {
                console.log('No articles found for bot:', botId);
                // Check if the bot exists
                const bot = await NewsBot.findById(botId);
                console.log('Bot exists:', !!bot);
                if (bot) {
                    console.log('Bot details:', {
                        name: bot.name,
                        websites: bot.websites,
                        stats: bot.stats
                    });
                }
            }

            const total = await NewsArticle.countDocuments({ bot: botId });
            console.log('Total articles for bot:', total);

            const totalPages = Math.ceil(total / limit);
            console.log('Total pages:', totalPages);

            return {
                articles,
                total,
                totalPages,
                currentPage: page
            };
        } catch (error) {
            console.error('Error in getBotArticles:', error);
            throw new Error(`Failed to fetch bot articles: ${error.message}`);
        }
    }

    async postToFeed(botId) {
        try {
            console.log('[NewsBotService] Starting postToFeed for bot:', botId);
            const bot = await NewsBot.findById(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }

            // Get the most recent articles that haven't been posted yet
            const articles = await NewsArticle.find({
                bot: botId,
                posted: { $ne: true }
            }).sort({ publishedAt: -1 }).limit(10);

            console.log('[NewsBotService] Found', articles.length, 'articles to post');

            if (articles.length === 0) {
                return {
                    success: true,
                    data: {
                        postedCount: 0,
                        notification: {
                            type: 'info',
                            message: 'No new articles to post.',
                            botName: bot.name
                        }
                    }
                };
            }

            let postedCount = 0;
            let errors = [];

            for (const article of articles) {
                try {
                    // Create post from article
                    const post = await this.createPostFromArticle(article, bot);
                    console.log('[NewsBotService] Created post:', post._id);

                    // Mark article as posted
                    article.posted = true;
                    await article.save();
                    postedCount++;

                    // Update bot stats
                    bot.stats.postedArticles = (bot.stats.postedArticles || 0) + 1;
                } catch (error) {
                    console.error('[NewsBotService] Error posting article:', error);
                    errors.push(error.message);
                }
            }

            // Save updated bot stats
            await bot.save();

            console.log('[NewsBotService] Posted', postedCount, 'articles to feed');

            if (errors.length > 0) {
                console.error('[NewsBotService] Errors during posting:', errors);
            }

            return {
                success: true,
                data: {
                    postedCount,
                    errors: errors.length > 0 ? errors : undefined,
                    notification: postedCount > 0 ? {
                        type: 'success',
                        message: `Posted ${postedCount} articles to feed!`,
                        botName: bot.name
                    } : {
                        type: 'error',
                        message: 'Failed to post any articles.',
                        botName: bot.name
                    }
                }
            };
        } catch (error) {
            console.error('[NewsBotService] Error in postToFeed:', error);
            throw error;
        }
    }

    async postArticle(botId, articleId) {
        try {
            console.log('[NewsBotService] Posting article:', { botId, articleId });

            const bot = await NewsBot.findById(botId);
            if (!bot) {
                throw new Error("Bot not found");
            }

            // Find the article
            const article = await NewsArticle.findOne({ _id: articleId, bot: botId });
            if (!article) {
                throw new Error("Article not found");
            }

            // Create post from article
            const post = await this.createPostFromArticle(article, bot);
            console.log('[NewsBotService] Created post:', post._id);

            // Mark article as posted
            article.posted = true;
            await article.save();

            // Update bot stats
            bot.stats.postedArticles = (bot.stats.postedArticles || 0) + 1;
            await bot.save();

            return {
                post,
                message: "Article posted to feed successfully"
            };
        } catch (error) {
            console.error('[NewsBotService] Error posting article:', error);
            throw error;
        }
    }
}

export default new NewsBotService();