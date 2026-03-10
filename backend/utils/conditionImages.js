const axios = require('axios');

const imageCache = {};

const HEADERS = {
    'User-Agent': 'DermSightApp/1.0 (https://dermsight.app; contact@dermsight.app)',
    'Accept': 'application/json'
};

/**
 * Clean condition names for better Wikipedia matching.
 * "Eczema (Atopic Dermatitis)" → "Eczema"
 * "Urticaria (Hives)" → "Urticaria"
 */
function cleanConditionName(name) {
    return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

/**
 * Fetch a clinical image for a skin condition using Wikipedia's pageimages API.
 * This returns the article's MAIN representative image (usually a clinical photo),
 * not a random search result.
 */
async function fetchConditionImage(conditionName, backendBase = '') {
    const key = conditionName.toLowerCase().trim();
    if (imageCache[key]) return imageCache[key];

    const cleanName = cleanConditionName(conditionName);
    const slug = cleanName.replace(/ /g, '_');

    // Strategy 1: Wikipedia pageimages API — returns article's primary image
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(slug)}&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=300&origin=*`;
        const res = await axios.get(url, { timeout: 3000, headers: HEADERS });
        const pages = Object.values(res.data?.query?.pages || {});
        const thumbnail = pages[0]?.thumbnail?.source;

        if (thumbnail) {
            const proxyUrl = `${backendBase}/api/proxy-image?url=${encodeURIComponent(thumbnail)}`;
            const result = { name: conditionName, imageUrl: proxyUrl, source: 'wikipedia-pageimage' };
            imageCache[key] = result;
            console.log(`[ConditionImages] ✅ Wikipedia pageimage for "${cleanName}"`);
            return result;
        }
    } catch (err) {
        console.warn(`[ConditionImages] Wikipedia pageimage failed for "${cleanName}": ${err.message}`);
    }

    // Strategy 2: Try with the full original name (some articles use the long form)
    if (cleanName !== conditionName) {
        try {
            const fullSlug = conditionName.replace(/ /g, '_');
            const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fullSlug)}&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=300&origin=*`;
            const res = await axios.get(url, { timeout: 3000, headers: HEADERS });
            const pages = Object.values(res.data?.query?.pages || {});
            const thumbnail = pages[0]?.thumbnail?.source;

            if (thumbnail) {
                const proxyUrl = `${backendBase}/api/proxy-image?url=${encodeURIComponent(thumbnail)}`;
                const result = { name: conditionName, imageUrl: proxyUrl, source: 'wikipedia-fullname' };
                imageCache[key] = result;
                console.log(`[ConditionImages] ✅ Wikipedia pageimage (full) for "${conditionName}"`);
                return result;
            }
        } catch (err) {
            // Silent — will fall through to placeholder
        }
    }

    // Strategy 3: Placeholder with condition name
    const placeholder = `https://placehold.co/300x300/1a1a2e/22d3ee?text=${encodeURIComponent(cleanName)}&font=roboto`;
    const result = { name: conditionName, imageUrl: placeholder, source: 'placeholder' };
    imageCache[key] = result;
    console.log(`[ConditionImages] ⚠️ Using placeholder for "${conditionName}"`);
    return result;
}

/**
 * Fetch images for multiple conditions in parallel (max 3)
 */
async function fetchConditionImages(conditions, backendBase = '') {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return [];
    const limited = conditions.slice(0, 3); // Limit to 3
    console.log(`[ConditionImages] Fetching images for: ${limited.join(', ')}`);
    const results = await Promise.all(limited.map(c => fetchConditionImage(c, backendBase)));
    console.log(`[ConditionImages] Got ${results.length} results`);
    return results;
}

module.exports = { fetchConditionImages, fetchConditionImage };
