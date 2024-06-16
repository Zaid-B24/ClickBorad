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
        savedNotesContainer.innerHTML = '';
        notes.forEach(function(note, index) {
            var noteItem = document.createElement('div');
            noteItem.className = 'note-item';

            var noteText = document.createElement('div');
            noteText.className = 'note-text';
            noteText.textContent = note;

            var copyIcon = document.createElement('img');
            copyIcon.src = 'Images/copyIcon.svg';
            copyIcon.alt = 'Copy';
            copyIcon.className = 'copy-icon';
            copyIcon.addEventListener('click', function() {
                copyToClipboard(note);
            });

            var editIcon = document.createElement('img');
            editIcon.src = 'Images/editIcon.svg';
            editIcon.alt = 'Edit';
            editIcon.className = 'edit-icon';
            editIcon.addEventListener('click', function() {
                editNote(index, note);
            });

            var deleteIcon = document.createElement('img');
            deleteIcon.src = 'Images/deleteIcon.svg';
            deleteIcon.alt = 'Delete';
            deleteIcon.className = 'delete-icon';
            deleteIcon.addEventListener('click', function() {
                deleteNote(index);
            });

            noteItem.appendChild(noteText);
            noteItem.appendChild(copyIcon);
            noteItem.appendChild(deleteIcon);
            noteItem.appendChild(editIcon);

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

    function editNote(index, note) {
        // Select the note item element based on its index
        var noteItem = document.querySelectorAll('.note-item')[index];
        
        // Select the text element inside the note item
        var noteText = noteItem.querySelector('.note-text');
        noteText.innerHTML = ''; // Clear the existing note text
    
        // Create a textarea for editing
        var editTextarea = document.createElement('textarea');
        editTextarea.className = 'edit-textarea';
        editTextarea.value = note; // Set the textarea value to the current note text
        noteText.appendChild(editTextarea); // Append the textarea to the note text element
    
        // Create a Save button for confirming the edit
        var saveEditButton = document.createElement('button');
        saveEditButton.className = 'save-edit-button';
        saveEditButton.textContent = 'Save';
        noteText.appendChild(saveEditButton);
    
        // Add an event listener to the Save button
        saveEditButton.addEventListener('click', function() {
            var editedNote = editTextarea.value.trim(); // Get the edited text and trim any whitespace
            if (editedNote) { // Check if the edited note is not empty
                chrome.storage.sync.get('notes', function(data) {
                    var notes = data.notes || []; // Retrieve notes from storage
                    notes[index] = editedNote; // Update the note at the specified index
                    chrome.storage.sync.set({ 'notes': notes }, function() {
                        displaySavedNotes(notes); // Refresh the notes display
                        feedbackContainer.textContent = 'Note edited successfully!'; // Show a success message
                    });
                });
            }
        });
    }    
});
