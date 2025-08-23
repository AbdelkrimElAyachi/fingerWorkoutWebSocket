module.exports = async function getPhrases(qunatity, title, language = "eng") {

    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=${qunatity}&exlimit=1&titles=${title}&explaintext=1&format=json&formatversion=2&origin=*`)
    const data = await res.json();
    const text = data.query.pages[0].extract;
    const words = text.match(/[A-Za-z0-9\u0600-\u06FF]+/g);

    const shuffledWords = shuffleArray(words);

    return shuffledWords;
}