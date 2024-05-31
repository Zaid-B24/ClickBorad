document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('save');
    var notesInput = document.getElementById('notes');
    var savedNotesContainer = document.getElementById('savenotes');
    var feedbackContainer = document.createElement('div');
    feedbackContainer.className = 'feedback-container';
    savedNotesContainer.appendChild(feedbackContainer);

    // Load saved notes
    chrome.storage.sync.get('notes', function(data) {
        if (data.notes) {
            displaySavedNotes(data.notes);
        }
    });

    // Function to save a note
    function saveNotes() {
        var note = notesInput.value.trim();
        if (note) {
            chrome.storage.sync.get('notes', function(data) {
                var notes = data.notes || [];
                notes.push(note);
                chrome.storage.sync.set({ 'notes': notes }, function() {
                    displaySavedNotes(notes); // Display saved notes immediately
                    feedbackContainer.textContent = 'Notes saved successfully!';
                    notesInput.value = ''; // Clear the input box
                });
            });
        }
    }

    // Save notes when Save button is clicked
    saveButton.addEventListener('click', function() {
        saveNotes();
    });

    // Save notes when Enter key is pressed
    notesInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default behavior (submitting the form)
            saveNotes();
        }
    });

    // Function to display saved notes as a list
    function displaySavedNotes(notes) {
        savedNotesContainer.innerHTML = ''; // Clear previous notes
        savedNotesContainer.appendChild(feedbackContainer); // Keep feedback container
        notes.forEach(function(note, index) {
            var noteItem = document.createElement('div');
            noteItem.className = 'note-item'; // Add the note-item class
            noteItem.textContent = note;

            // Create the copy icon
            var copyIcon = document.createElement('img');
            copyIcon.src = 'Images/copyIcon.svg'; // Replace 'copyIcon.svg' with the path to your SVG file
            copyIcon.alt = 'Copy';
            copyIcon.className = 'copy-icon';
            copyIcon.addEventListener('click', function() {
                copyToClipboard(note);
            });
            noteItem.appendChild(copyIcon);

            // Create the delete icon
            var deleteIcon = document.createElement('img');
            deleteIcon.src = 'Images/deleteIcon.svg'; // Replace 'deleteIcon.svg' with the path to your SVG file
            deleteIcon.alt = 'Delete';
            deleteIcon.className = 'delete-icon';
            deleteIcon.addEventListener('click', function() {
                deleteNote(index);
            });
            noteItem.appendChild(deleteIcon);

            savedNotesContainer.appendChild(noteItem);
        });
    }

    // Function to delete a note
    function deleteNote(index) {
        chrome.storage.sync.get('notes', function(data) {
            var notes = data.notes || [];
            notes.splice(index, 1); // Remove the note at the specified index
            chrome.storage.sync.set({ 'notes': notes }, function() {
                displaySavedNotes(notes); // Update the display after deletion
                feedbackContainer.textContent = 'Note deleted successfully!';
            });
        });
    }

    // Function to copy note text to clipboard
    function copyToClipboard(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        feedbackContainer.textContent = 'Copied successfully!';
    }
});
