class Room {
    constructor(id, words) {
        this.id = id;
        this.words = words;
        this.progress = {}; 
        // Example:
        // progress[userId] = { index: 0, correct: 0, wrong: 0 }
    }
}
