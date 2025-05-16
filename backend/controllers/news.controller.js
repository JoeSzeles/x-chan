import axios from "axios";

export const getNews = async (req, res) => {
    try {
        const { category = "all", search = "" } = req.query;
        
        // You can use any news API here. For this example, we'll use NewsAPI
        // You'll need to sign up for an API key at https://newsapi.org/
        const apiKey = process.env.NEWS_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: "News API key not configured" });
        }

        let url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
        
        if (category !== "all") {
            url += `&category=${category}`;
        }
        
        if (search) {
            url += `&q=${encodeURIComponent(search)}`;
        }

        const response = await axios.get(url);
        
        // Transform the response to match our frontend expectations
        const articles = response.data.articles.map(article => ({
            _id: article.url, // Using URL as a unique identifier
            title: article.title,
            description: article.description,
            url: article.url,
            imageUrl: article.urlToImage,
            publishedAt: article.publishedAt,
            source: article.source.name,
            author: article.author
        }));

        res.status(200).json({ articles });
    } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).json({ error: "Failed to fetch news" });
    }
}; 