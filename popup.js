document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  const elements = {
    saveButton: document.getElementById("save"),
    clearButton: document.getElementById("clear"),
    notesInput: document.getElementById("notes"),
    savedNotesContainer: document.getElementById("savedNotes"),
    feedbackContainer: document.createElement("div"),
  };

  // Initialize feedback container
  elements.feedbackContainer.className = "feedback-container";
  document.body.appendChild(elements.feedbackContainer);

  const showFeedback = (() => {
    let timeoutId;
    return (message, isError = false) => {
      clearTimeout(timeoutId);
      elements.feedbackContainer.textContent = message;
      elements.feedbackContainer.className = "feedback-container show";

      if (isError) {
        elements.feedbackContainer.classList.add("error");
      } else {
        elements.feedbackContainer.classList.add("success");
      }

      timeoutId = setTimeout(() => {
        elements.feedbackContainer.classList.remove("show");
      }, 2500);
    };
  })();

  // Using inline SVGs for guaranteed rendering in extension popup
  const icons = {
    copy: `<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="Copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    edit: `<svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="Edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    delete: `<svg class="delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="Delete"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  };

  const createNoteElements = (note, index) => {
    const fragment = document.createDocumentFragment();
    const noteItem = document.createElement("div");
    noteItem.className = "note-item";
    noteItem.draggable = true;
    noteItem.dataset.index = index;

    const textDiv = document.createElement("div");
    textDiv.className = "note-text";
    textDiv.textContent = note;

    const controlsDiv = document.createElement("div");
    controlsDiv.className = "controls";
    const parser = new DOMParser();
    const svgNodes = parser.parseFromString(
      `${icons.copy} ${icons.edit} ${icons.delete}`,
      "text/html",
    );
    controlsDiv.append(...svgNodes.body.childNodes);

    noteItem.appendChild(textDiv);
    noteItem.appendChild(controlsDiv);
    fragment.appendChild(noteItem);
    return fragment;
  };

  const storage = {
    async get() {
      return new Promise((resolve) => {
        chrome.storage.local.get("notes", (data) => resolve(data.notes || []));
      });
    },
    async set(notes) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ notes }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    },
  };

  const displaySavedNotes = async (notes) => {
    elements.savedNotesContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();
    notes.forEach((note, index) =>
      fragment.appendChild(createNoteElements(note, index)),
    );
    elements.savedNotesContainer.appendChild(fragment);
  };

  const saveNotes = async () => {
    const note = elements.notesInput.value.trim();
    if (!note) return;

    try {
      const notes = await storage.get();
      notes.unshift(note);
      await storage.set(notes);
      await displaySavedNotes(notes);
      elements.notesInput.value = "";
      showFeedback("Note saved!");
    } catch (error) {
      console.error(error);
      showFeedback(
        error.message?.includes("QUOTA")
          ? "Storage full!"
          : "Error saving note",
        true,
      );
    }
  };

  // Replaced window.confirm with a two-step button for safety in MV3
  const clearAllNotes = async (e) => {
    const btn = e.target;
    if (btn.dataset.confirming === "true") {
      await storage.set([]);
      await displaySavedNotes([]);
      showFeedback("All notes cleared");
      btn.textContent = "Clear";
      btn.dataset.confirming = "false";
      btn.style.backgroundColor = ""; // reset to css default
      btn.style.color = "";
    } else {
      btn.textContent = "Sure?";
      btn.dataset.confirming = "true";
      btn.style.backgroundColor = "var(--danger)";
      btn.style.color = "white";

      // Reset if they don't click again within 3 seconds
      setTimeout(() => {
        if (btn.dataset.confirming === "true") {
          btn.textContent = "Clear";
          btn.dataset.confirming = "false";
          btn.style.backgroundColor = "";
          btn.style.color = "";
        }
      }, 3000);
    }
  };

  const editNote = async (index, noteElement) => {
    const noteText = noteElement.querySelector(".note-text");
    const currentText = noteText.textContent;
    noteText.innerHTML = "";

    const textarea = document.createElement("textarea");
    textarea.className = "edit-textarea";
    textarea.value = currentText;

    const saveBtn = document.createElement("button");
    saveBtn.className = "save-edit-button";
    saveBtn.textContent = "Save";

    noteText.appendChild(textarea);
    noteText.appendChild(saveBtn);
    textarea.focus();
  };

  // Event Listeners
  elements.savedNotesContainer.addEventListener("click", async (e) => {
    const noteItem = e.target.closest(".note-item");
    if (!noteItem) return;

    const index = parseInt(noteItem.dataset.index);
    const notes = await storage.get();

    // Use closest() to handle clicks on the SVG paths internally
    if (e.target.closest(".copy-icon")) {
      await navigator.clipboard.writeText(notes[index]);
      showFeedback("Copied to clipboard!");
    } else if (e.target.closest(".delete-icon")) {
      notes.splice(index, 1);
      await storage.set(notes);
      await displaySavedNotes(notes);
      showFeedback("Note deleted", true);
    } else if (e.target.closest(".edit-icon")) {
      await editNote(index, noteItem);
    } else if (e.target.classList.contains("save-edit-button")) {
      const textarea = noteItem.querySelector(".edit-textarea");
      const editedNote = textarea.value.trim();
      if (editedNote) {
        notes[index] = editedNote;
        await storage.set(notes);
        await displaySavedNotes(notes);
        showFeedback("Note updated!");
      }
    }
  });

  elements.saveButton.addEventListener("click", saveNotes);
  if (elements.clearButton) {
    elements.clearButton.addEventListener("click", clearAllNotes);
  }

  elements.notesInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveNotes();
    }
  });

  // Drag and Drop
  let draggedItem = null;
  elements.savedNotesContainer.addEventListener("dragstart", (e) => {
    draggedItem = e.target.closest(".note-item");
    e.dataTransfer.setData("text/plain", draggedItem.dataset.index);
    draggedItem.classList.add("dragging");
  });

  elements.savedNotesContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    const item = e.target.closest(".note-item");
    if (item && item !== draggedItem) item.classList.add("drag-over");
  });

  elements.savedNotesContainer.addEventListener("dragleave", (e) => {
    const item = e.target.closest(".note-item");
    if (item) item.classList.remove("drag-over");
  });

  elements.savedNotesContainer.addEventListener("drop", async (e) => {
    e.preventDefault();
    const dropTarget = e.target.closest(".note-item");
    if (draggedItem) draggedItem.classList.remove("dragging");
    document
      .querySelectorAll(".note-item")
      .forEach((i) => i.classList.remove("drag-over"));

    if (!draggedItem || !dropTarget || draggedItem === dropTarget) return;

    const from = parseInt(draggedItem.dataset.index);
    const to = parseInt(dropTarget.dataset.index);
    const notes = await storage.get();
    const [moved] = notes.splice(from, 1);
    notes.splice(to, 0, moved);

    await storage.set(notes);
    await displaySavedNotes(notes);
  });

  storage.get().then(displaySavedNotes);
});
