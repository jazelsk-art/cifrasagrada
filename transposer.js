const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeChord(chord, steps) {
    // Basic regex to match the root note + accidental, and the rest (minor, 7, sus, etc)
    // Matches G, G#, Gb, Am, C#m7, etc.
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;

    let root = match[1];
    let modifier = match[2];

    // Convert flat to sharp for easier calculation
    const flatMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    if (flatMap[root]) {
        root = flatMap[root];
    }

    let index = NOTES.indexOf(root);
    if (index === -1) return chord; // Not a recognized note

    // Calculate new index wrapping around the array
    let newIndex = (index + steps) % NOTES.length;
    if (newIndex < 0) newIndex += NOTES.length;

    return NOTES[newIndex] + modifier;
}

// Function to transpose the content in the editor
function transposeContent(steps) {
    const textarea = document.getElementById('editor-content');
    if(!textarea) return;
    
    const content = textarea.value;
    
    // We look for chords inside brackets like [G], [Am7], [C#m]
    const regex = /\[([^\]]+)\]/g;
    
    const newContent = content.replace(regex, (match, chord) => {
        // Handle chords separated by slash (e.g. D/F#)
        if (chord.includes('/')) {
            const parts = chord.split('/');
            const transposedParts = parts.map(p => transposeChord(p, steps));
            return `[${transposedParts.join('/')}]`;
        }
        return `[${transposeChord(chord, steps)}]`;
    });
    
    textarea.value = newContent;
    
    // Update key input if it exists
    const keyInput = document.getElementById('editor-key');
    if(keyInput && keyInput.value) {
        if(keyInput.value.includes('/')) {
            const parts = keyInput.value.split('/');
            keyInput.value = parts.map(p => transposeChord(p, steps)).join('/');
        } else {
            keyInput.value = transposeChord(keyInput.value, steps);
        }
    }
}
