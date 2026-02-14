const axios = require('axios');

// In-memory cache to avoid repeat API calls
const imageCache = {};

/**
 * Fetch a representative dermatology image for a given skin condition
 * Uses DuckDuckGo instant answer API + Wikimedia Commons as fallback
 */
async function fetchConditionImage(conditionName) {
    // Check cache first
    if (imageCache[conditionName.toLowerCase()]) {
        return imageCache[conditionName.toLowerCase()];
    }

    try {
        // Strategy 1: Wikimedia Commons API (free, no key needed)
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=dermatology+${encodeURIComponent(conditionName)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=300&format=json&origin=*`;

        const res = await axios.get(wikiUrl, { timeout: 5000 });
        const pages = res.data?.query?.pages;

        if (pages) {
            const pageList = Object.values(pages);
            // Find the first page with a valid image URL (prefer thumbnail)
            for (const page of pageList) {
                const info = page.imageinfo?.[0];
                if (info?.thumburl) {
                    const result = {
                        name: conditionName,
                        imageUrl: info.thumburl,
                        source: 'Wikimedia Commons'
                    };
                    imageCache[conditionName.toLowerCase()] = result;
                    return result;
                }
            }
        }
    } catch (err) {
        console.error(`[ConditionImages] Wikimedia failed for "${conditionName}":`, err.message);
    }

    try {
        // Strategy 2: Wikipedia API for article thumbnail
        const wikiArticle = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(conditionName)}`;
        const res2 = await axios.get(wikiArticle, { timeout: 5000 });

        if (res2.data?.thumbnail?.source) {
            const result = {
                name: conditionName,
                imageUrl: res2.data.thumbnail.source,
                source: 'Wikipedia'
            };
            imageCache[conditionName.toLowerCase()] = result;
            return result;
        }
    } catch (err) {
        console.error(`[ConditionImages] Wikipedia fallback failed for "${conditionName}":`, err.message);
    }

    // Strategy 3: Return a placeholder with the name
    return {
        name: conditionName,
        imageUrl: `https://placehold.co/300x300/1e293b/white?text=${encodeURIComponent(conditionName)}`,
        source: 'placeholder'
    };
}

/**
 * Fetch images for multiple conditions in parallel
 * @param {string[]} conditions - Array of condition names
 * @returns {Promise<{name: string, imageUrl: string}[]>}
 */
async function fetchConditionImages(conditions) {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
        return [];
    }

    // Limit to 4 conditions max
    const limited = conditions.slice(0, 4);
    console.log(`[ConditionImages] Fetching images for: ${limited.join(', ')}`);

    const results = await Promise.all(
        limited.map(c => fetchConditionImage(c))
    );

    console.log(`[ConditionImages] Got ${results.length} results`);
    return results;
}

module.exports = { fetchConditionImages, fetchConditionImage };
