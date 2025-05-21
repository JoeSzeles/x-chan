import newsBotService from "../services/newsBotService.js";
import NewsBot from "../models/NewsBot.js";
import NewsArticle from "../models/NewsArticle.js";
import Post from "../models/post.model.js";

export const createBot = async (req, res) => {
    try {
        console.log('Received bot creation request:', {
            userId: req.user._id,
            body: req.body
        });

        // Validate required fields
        if (!req.body.name) {
            return res.status(400).json({
                success: false,
                error: "Bot name is required"
            });
        }

        if (!req.body.websites || !Array.isArray(req.body.websites) || req.body.websites.length === 0) {
            return res.status(400).json({
                success: false,
                error: "At least one website is required"
            });
        }

        // Validate each website
        for (const website of req.body.websites) {
            if (!website.url || !website.selector) {
                return res.status(400).json({
                    success: false,
                    error: "Each website must have a URL and selector"
                });
            }
        }

        const bot = await newsBotService.createBot(req.user._id, req.body);
        console.log('Bot created successfully:', bot);

        res.status(201).json({
            success: true,
            data: bot
        });
    } catch (error) {
        console.error('Error creating bot:', error);
        res.status(400).json({
            success: false,
            error: error.message || "Failed to create bot"
        });
    }
};

export const getBots = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = { owner: req.user._id };

        // Add search filter if provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'websites.url': { $regex: search, $options: 'i' } }
            ];
        }

        // Add category filter if provided
        if (category && category !== 'all') {
            query['websites.type'] = category;
        }

        const bots = await NewsBot.find(query).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: bots
        });
    } catch (error) {
        console.error("Error in getBots:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getBotById = async (req, res) => {
    try {
        const bot = await NewsBot.findOne({
            _id: req.params.botId,
            owner: req.user._id
        });

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: "Bot not found"
            });
        }

        res.status(200).json({
            success: true,
            data: bot
        });
    } catch (error) {
        console.error("Error in getBotById:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const updateBot = async (req, res) => {
    try {
        const bot = await newsBotService.updateBot(req.params.botId, req.user._id, req.body);
        res.status(200).json({ success: true, data: bot });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const deleteBot = async (req, res) => {
    try {
        await newsBotService.deleteBot(req.params.botId, req.user._id);
        res.status(200).json({ success: true, message: "Bot deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const getUserBots = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = { owner: req.user._id };

        // Add search filter if provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'websites.url': { $regex: search, $options: 'i' } }
            ];
        }

        // Add category filter if provided
        if (category && category !== 'all') {
            query['websites.type'] = category;
        }

        const bots = await NewsBot.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bots });
    } catch (error) {
        console.error("Error in getUserBots:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getBotArticles = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const articles = await newsBotService.getBotArticles(
            req.params.botId,
            parseInt(page),
            parseInt(limit)
        );
        res.status(200).json({ success: true, data: articles });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const updateBotArticles = async (req, res) => {
    try {
        const { force, debug } = req.query;
        const botId = req.params.botId;

        console.log('[NewsBotController] Starting update:', {
            botId,
            force: !!force,
            debug: !!debug,
            userId: req.user._id,
            timestamp: new Date().toISOString()
        });

        // First verify the bot exists and user has access
        const bot = await NewsBot.findOne({ _id: botId, owner: req.user._id });
        if (!bot) {
            console.error('[NewsBotController] Bot not found or unauthorized:', {
                botId,
                userId: req.user._id
            });
            return res.status(404).json({
                success: false,
                error: "Bot not found or unauthorized"
            });
        }

        console.log('[NewsBotController] Bot found:', {
            name: bot.name,
            websiteCount: bot.websites.length,
            lastUpdate: bot.lastUpdate,
            websites: bot.websites.map(w => ({
                url: w.url,
                type: w.type,
                searchTerms: w.searchTerms,
                active: w.active
            }))
        });

        // Set force update flag if requested (we'll pass it directly now)
        const forceUpdate = force === 'true' || force === '1';

        try {
            // Pass the force flag directly to the service
            const result = await newsBotService.updateBotArticles(req.params.botId, forceUpdate);

            // Check if the result has expected properties
            if (!result || !result.success) {
                console.error('[NewsBotController] Update failed with error:', result?.error);
                return res.status(400).json({ 
                    success: false, 
                    error: result?.error || "Update failed" 
                });
            }

            // Ensure data structure is valid
            const data = result.data || {};

            // Ensure all properties exist and have default values to prevent "cannot read property of undefined" errors
            const safeData = {
                newArticles: Array.isArray(data.newArticles) ? data.newArticles : [],
                totalArticles: data.totalArticles || 0,
                errorCount: data.errorCount || 0,
                articles: Array.isArray(data.articles) ? data.articles : [],
                skipped: data.skipped || false
            };

            // Log the successful result with safe property access
            console.log('[NewsBotController] Update result:', {
                skipped: safeData.skipped,
                newArticles: safeData.newArticles.length,
                errorCount: safeData.errorCount,
                totalArticles: safeData.totalArticles
            });

            // Return success response with safe data
            return res.status(200).json({ 
                success: true, 
                message: safeData.skipped ? "Update skipped due to interval" : "Articles updated successfully", 
                data: safeData
            });
        } catch (serviceError) {
            console.error('[NewsBotController] Service error updating articles:', serviceError);
            return res.status(400).json({ 
                success: false, 
                error: serviceError.message || "Error in update service" 
            });
        }
    } catch (error) {
        console.error('[NewsBotController] Error updating articles:', error);
        return res.status(400).json({ success: false, error: error.message });
    }
};

export const getBotPosts = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all bots for the user
        const bots = await NewsBot.find({ owner: userId });

        // Get all posts from these bots
        const posts = await Post.find({
            $or: [
                { user: userId },
                { bot: { $in: bots.map(bot => bot._id) } }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('user', 'username profileImg')
        .populate('bot', 'name')
        .populate('article', 'title description url imageUrl')
        .limit(50);

        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in getBotPosts:", error);
        res.status(500).json({ error: error.message });
    }
};

export const postToFeed = async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = req.user.userId;

        // Get the bot and verify ownership
        const bot = await NewsBot.findOne({ _id: botId, owner: userId });
        if (!bot) {
            return res.status(404).json({
                success: false,
                error: "Bot not found or unauthorized"
            });
        }

        // Get the latest articles from the bot
        const articles = await NewsArticle.find({ bot: botId })
            .sort({ publishedAt: -1 })
            .limit(5);

        if (articles.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No articles found to post"
            });
        }

        // Create posts for each article
        const posts = await Promise.all(articles.map(async (article) => {
            const post = new Post({
                user: userId,
                bot: botId,
                article: article._id,
                text: `Reposted from ${bot.name}\n\n${article.title}\n\n${article.description}\n\n${article.url}`,
                img: article.imageUrl,
                postNumber: await newsBotService.getNextPostNumber(),
                threadId: await newsBotService.getNextThreadId()
            });

            await post.save();
            return post;
        }));

        // Update bot stats
        bot.stats.postedArticles = (bot.stats.postedArticles || 0) + posts.length;
        await bot.save();

        res.json({
            success: true,
            data: {
                posts: posts.length,
                message: `Posted ${posts.length} articles to feed`
            }
        });
    } catch (error) {
        console.error('[NewsBotController] Error posting to feed:', error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to post to feed"
        });
    }
};

export const postArticle = async (req, res) => {
    try {
        const { botId } = req.params;
        const { articleId } = req.body;
        const userId = req.user._id;

        console.log('[NewsBotController] Received post article request:', {
            botId,
            articleId,
            userId,
            body: req.body,
            headers: req.headers
        });

        if (!articleId) {
            console.log('[NewsBotController] Missing articleId in request');
            return res.status(400).json({
                success: false,
                error: "Article ID is required"
            });
        }

        // Verify bot exists and user has access
        const bot = await NewsBot.findOne({ _id: botId, owner: userId });
        if (!bot) {
            console.log('[NewsBotController] Bot not found or unauthorized:', botId);
            return res.status(404).json({
                success: false,
                error: "Bot not found or unauthorized"
            });
        }

        // Verify article exists
        const article = await NewsArticle.findOne({ _id: articleId, bot: botId });
        if (!article) {
            console.log('[NewsBotController] Article not found:', articleId);
            return res.status(404).json({
                success: false,
                error: "Article not found"
            });
        }

        console.log('[NewsBotController] Creating post from article:', {
            botId,
            articleId,
            articleTitle: article.title
        });

        // Check if it's a YouTube video
        const isYouTubeUrl = article.url.includes('youtube.com') || article.url.includes('youtu.be');

        // Create post from article
        const post = new Post({
            user: userId,
            bot: botId,
            article: article._id,
            text: `Reposted from bot\n\n${article.title}\n\n${article.description}\n\n${isYouTubeUrl ? 'Watch here: ' : 'Read more: '}${article.url}`,
            img: article.imageUrl,
            videoUrl: isYouTubeUrl ? article.url : undefined,
            postNumber: await newsBotService.getNextPostNumber(),
            threadId: await newsBotService.getNextThreadId()
        });

        await post.save();
        console.log('[NewsBotController] Post created successfully:', post._id);

        // Mark article as posted
        article.posted = true;
        await article.save();

        // Update bot stats
        bot.stats.postedArticles = (bot.stats.postedArticles || 0) + 1;
        await bot.save();

        res.json({
            success: true,
            data: {
                post,
                message: "Article posted successfully"
            }
        });
    } catch (error) {
        console.error('[NewsBotController] Error posting article:', error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to post article"
        });
    }
};

export const toggleBotStatus = async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = req.user._id;

        console.log('[NewsBotController] Toggling bot status:', { botId, userId });

        // Find the bot and verify ownership
        const bot = await NewsBot.findOne({ _id: botId, owner: userId });
        if (!bot) {
            return res.status(404).json({
                success: false,
                error: "Bot not found or unauthorized"
            });
        }

        // Toggle status between active and paused
        bot.status = bot.status === 'active' ? 'paused' : 'active';
        await bot.save();

        console.log('[NewsBotController] Bot status updated:', {
            botId,
            newStatus: bot.status
        });

        res.status(200).json({
            success: true,
            data: bot
        });
    } catch (error) {
        console.error('[NewsBotController] Error toggling bot status:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export const clearBotArticles = async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = req.user._id;

        // Verify bot ownership
        const bot = await NewsBot.findOne({ _id: botId, owner: userId });
        if (!bot) {
            return res.status(404).json({
                success: false,
                error: "Bot not found or unauthorized"
            });
        }

        // Clear all articles for this bot
        await NewsArticle.deleteMany({ bot: botId });

        // Reset bot stats
        bot.stats = {
            totalArticles: 0,
            errorCount: 0,
            newArticles: 0,
            postedArticles: 0
        };
        await bot.save();

        res.status(200).json({
            success: true,
            message: "Bot feed cleared successfully"
        });
    } catch (error) {
        console.error("Error clearing bot articles:", error);
        res.status(500).json({
            success: false,
            error: "Failed to clear bot feed"
        });
    }
}; 