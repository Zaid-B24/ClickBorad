document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  const elements = {
    saveButton: document.getElementById("save"),
    notesInput: document.getElementById("notes"),
    savedNotesContainer: document.getElementById("savenotes"),
    feedbackContainer: document.createElement("div"),
  };

  // Initialize feedback container
  elements.feedbackContainer.className = "feedback-container";
  elements.savedNotesContainer.appendChild(elements.feedbackContainer);

  // Create a debounced feedback message handler
  const showFeedback = (() => {
    let timeoutId;
    return (message) => {
      clearTimeout(timeoutId);
      elements.feedbackContainer.textContent = message;
      timeoutId = setTimeout(() => {
        elements.feedbackContainer.textContent = "";
      }, 2000);
    };
  })();

  // Create document fragment for better performance
  const createNoteElements = (note, index) => {
    const fragment = document.createDocumentFragment();
    const noteItem = document.createElement("div");
    noteItem.className = "note-item";
    noteItem.draggable = true;

    // Use template literals for better readability and performance
    noteItem.innerHTML = `
          <div class="note-text">${note}</div>
          <img src="Images/copyIcon.svg" alt="Copy" class="copy-icon" title="Copy">
          <img src="Images/deleteIcon.svg" alt="Delete" class="delete-icon" title="Delete">
          <img src="Images/editIcon.svg" alt="Edit" class="edit-icon" title="Edit">
      `;

    // Use event delegation for better performance
    noteItem.dataset.index = index;
    fragment.appendChild(noteItem);
    return fragment;
  };

  // Optimize storage operations
  const storage = {
    async get() {
      return new Promise((resolve) => {
        chrome.storage.sync.get("notes", (data) => resolve(data.notes || []));
      });
    },
    async set(notes) {
      return new Promise((resolve) => {
        chrome.storage.sync.set({ notes }, resolve);
      });
    },
  };

  // Optimize note display
  const displaySavedNotes = async (notes) => {
    elements.savedNotesContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    notes.forEach((note, index) => {
      fragment.appendChild(createNoteElements(note, index));
    });

    elements.savedNotesContainer.appendChild(fragment);
  };

  // Optimize save operation
  const saveNotes = async () => {
    const note = elements.notesInput.value.trim();
    if (!note) return;

    try {
      const notes = await storage.get();
      notes.push(note);
      await storage.set(notes);
      await displaySavedNotes(notes);
      elements.notesInput.value = "";
      showFeedback("Notes saved successfully!");
    } catch (error) {
      showFeedback("Error saving note. Please try again.");
    }
  };

  // Optimize edit operation
  const editNote = async (index, noteElement) => {
    const noteText = noteElement.querySelector(".note-text");
    const currentText = noteText.textContent;

    const editTemplate = `
          <textarea class="edit-textarea">${currentText}</textarea>
          <button class="save-edit-button">Save</button>
      `;

    noteText.innerHTML = editTemplate;
    const textarea = noteText.querySelector(".edit-textarea");
    textarea.focus();
  };

  // Optimize copy operation
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback("Copied successfully!");
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      showFeedback("Copied successfully!");
    }
  };

  // Drag and Drop functionality
  let draggedItem = null;
  let draggedIndex = null;

  const handleDragStart = (e) => {
    const noteItem = e.target.closest(".note-item");
    if (!noteItem) return;

    draggedItem = noteItem;
    draggedIndex = parseInt(noteItem.dataset.index);
    noteItem.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e) => {
    const noteItem = e.target.closest(".note-item");
    if (!noteItem) return;

    noteItem.classList.remove("dragging");
    draggedItem = null;
    draggedIndex = null;

    // Remove all drag-over classes
    document.querySelectorAll(".note-item").forEach((item) => {
      item.classList.remove("drag-over");
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const noteItem = e.target.closest(".note-item");
    if (!noteItem || noteItem === draggedItem) return;

    // Remove drag-over class from all items
    document.querySelectorAll(".note-item").forEach((item) => {
      item.classList.remove("drag-over");
    });

    noteItem.classList.add("drag-over");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const noteItem = e.target.closest(".note-item");
    if (!noteItem || !draggedItem) return;

    const dropIndex = parseInt(noteItem.dataset.index);
    if (draggedIndex === dropIndex) return;

    try {
      const notes = await storage.get();
      const [draggedNote] = notes.splice(draggedIndex, 1);
      notes.splice(dropIndex, 0, draggedNote);
      await storage.set(notes);
      await displaySavedNotes(notes);
      showFeedback("Note order updated!");
    } catch (error) {
      showFeedback("Error updating note order. Please try again.");
    }
  };

  // Event Delegation for better performance
  elements.savedNotesContainer.addEventListener("click", async (e) => {
    const noteItem = e.target.closest(".note-item");
    if (!noteItem) return;

    const index = parseInt(noteItem.dataset.index);
    const notes = await storage.get();

    if (e.target.classList.contains("copy-icon")) {
      await copyToClipboard(notes[index]);
    } else if (e.target.classList.contains("delete-icon")) {
      notes.splice(index, 1);
      await storage.set(notes);
      await displaySavedNotes(notes);
      showFeedback("Note deleted successfully!");
    } else if (e.target.classList.contains("edit-icon")) {
      await editNote(index, noteItem);
    }
  });

  // Save edited note
  elements.savedNotesContainer.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("save-edit-button")) return;

    const noteItem = e.target.closest(".note-item");
    const index = parseInt(noteItem.dataset.index);
    const textarea = noteItem.querySelector(".edit-textarea");
    const editedNote = textarea.value.trim();

    if (editedNote) {
      const notes = await storage.get();
      notes[index] = editedNote;
      await storage.set(notes);
      await displaySavedNotes(notes);
      showFeedback("Note edited successfully!");
    }
  });

  // Drag and Drop Event Listeners
  elements.savedNotesContainer.addEventListener("dragstart", handleDragStart);
  elements.savedNotesContainer.addEventListener("dragend", handleDragEnd);
  elements.savedNotesContainer.addEventListener("dragover", handleDragOver);
  elements.savedNotesContainer.addEventListener("drop", handleDrop);

  // Event Listeners
  elements.saveButton.addEventListener("click", saveNotes);
  elements.notesInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveNotes();
    }
  });

  // Initial load
  storage.get().then(displaySavedNotes);
});
