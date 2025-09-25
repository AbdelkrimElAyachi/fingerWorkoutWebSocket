// Function to shuffle an array using Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function getWords(number, title, language = "eng") {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=${number}&exlimit=1&titles=${title}&explaintext=1&format=json&formatversion=2&origin=*`);
    const data = await res.json();
    const text = data.query.pages[0].extract;
    const words = text.match(/[A-Za-z0-9\u0600-\u06FF]+/g) || [];

    const shuffledWords = shuffleArray(words);
    const uniqueWords = [...new Set(shuffledWords)];

    return uniqueWords;
}

module.exports = getWords;

