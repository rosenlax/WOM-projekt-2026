const config = window.VIRTUAL_BOARD_CONFIG;
const authView = document.querySelector('#auth-view');
const appView = document.querySelector('#app-view');
const loginForm = document.querySelector('#login-form');
const registerButton = document.querySelector('#register-button');
const authMessage = document.querySelector('#auth-message');
const userLabel = document.querySelector('#user-label');
const boardSelect = document.querySelector('#board-select');
const addNoteButton = document.querySelector('#add-note-button');
const logoutButton = document.querySelector('#logout-button');
const board = document.querySelector('#board');
const statusBar = document.querySelector('#status-bar');

let token = localStorage.getItem('virtualBoardToken');
let currentUser = JSON.parse(localStorage.getItem('virtualBoardUser') || 'null');
let currentBoardId = null;
let pollTimer = null;
let isDragging = false;
let isEditing = false;

function setStatus(message, isError = false) {
  statusBar.textContent = message;
  statusBar.classList.toggle('error', isError);
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function login(username, password) {
  const data = await request(`${config.AUTH_API_URL}/users/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  token = data.token;
  currentUser = data.user;
  localStorage.setItem('virtualBoardToken', token);
  localStorage.setItem('virtualBoardUser', JSON.stringify(currentUser));
  await openApp();
}

async function register(username, password) {
  await request(`${config.AUTH_API_URL}/users`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  await login(username, password);
}

function logout() {
  token = null;
  currentUser = null;
  currentBoardId = null;
  localStorage.removeItem('virtualBoardToken');
  localStorage.removeItem('virtualBoardUser');
  clearInterval(pollTimer);
  pollTimer = null;
  board.innerHTML = '';
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  setAuthMessage('');
}

async function openApp() {
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userLabel.textContent = currentUser ? `Signed in as ${currentUser.username}` : '';

  try {
    await loadBoards();
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!isDragging && !isEditing && currentBoardId) loadNotes(false);
    }, 3000);
  } catch (error) {
    if (error.status === 401) return logout();
    setStatus(error.message, true);
  }
}

async function loadBoards() {
  const boards = await request(`${config.BOARD_API_URL}/boards`);
  boardSelect.innerHTML = '';

  if (boards.length === 0) {
    currentBoardId = null;
    board.innerHTML = '<div class="empty-state">You do not have access to any boards.</div>';
    setStatus('No boards available');
    return;
  }

  for (const item of boards) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    boardSelect.append(option);
  }

  currentBoardId = Number(boardSelect.value);
  await loadNotes();
}

async function loadNotes(showStatus = true) {
  if (!currentBoardId) return;
  try {
    const notes = await request(`${config.BOARD_API_URL}/boards/${currentBoardId}/notes`);
    renderNotes(notes);
    if (showStatus) setStatus(`Loaded ${notes.length} note${notes.length === 1 ? '' : 's'}`);
  } catch (error) {
    if (error.status === 401) return logout();
    setStatus(error.message, true);
  }
}

function renderNotes(notes) {
  const focusedId = document.activeElement?.closest?.('.note')?.dataset.noteId;
  board.innerHTML = '';

  for (const note of notes) {
    board.append(createNoteElement(note));
  }

  if (focusedId) {
    const text = board.querySelector(`[data-note-id="${focusedId}"] .note-text`);
    if (text) text.focus();
  }
}

function createNoteElement(note) {
  const element = document.createElement('article');
  element.className = `note note-${note.color}`;
  element.dataset.noteId = note.id;
  element.style.left = `${note.x}px`;
  element.style.top = `${note.y}px`;

  const toolbar = document.createElement('div');
  toolbar.className = 'note-toolbar';

  const colors = document.createElement('div');
  colors.className = 'color-options';
  for (const color of ['yellow', 'blue', 'green', 'pink', 'purple']) {
    const colorButton = document.createElement('button');
    colorButton.type = 'button';
    colorButton.className = `color-dot color-${color}`;
    colorButton.title = `Change color to ${color}`;
    colorButton.addEventListener('pointerdown', (event) => event.stopPropagation());
    colorButton.addEventListener('click', async () => {
      await updateNote(note.id, { color });
      await loadNotes(false);
    });
    colors.append(colorButton);
  }

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-note';
  deleteButton.textContent = '×';
  deleteButton.title = 'Delete note';
  deleteButton.addEventListener('pointerdown', (event) => event.stopPropagation());
  deleteButton.addEventListener('click', async () => {
    if (!confirm('Delete this note?')) return;
    await deleteNote(note.id);
    await loadNotes(false);
  });

  toolbar.append(colors, deleteButton);

  const text = document.createElement('textarea');
  text.className = 'note-text';
  text.value = note.text;
  text.maxLength = 1000;
  text.setAttribute('aria-label', 'Note text');
  text.addEventListener('focus', () => { isEditing = true; });
  text.addEventListener('blur', async () => {
    isEditing = false;
    if (text.value !== note.text) {
      await updateNote(note.id, { text: text.value });
      setStatus('Note saved');
    }
  });
  text.addEventListener('pointerdown', (event) => event.stopPropagation());

  element.append(toolbar, text);
  makeDraggable(element, note);
  return element;
}

function makeDraggable(element, note) {
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button, textarea')) return;

    isDragging = true;
    element.classList.add('dragging');
    element.setPointerCapture(event.pointerId);

    const boardRect = board.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const offsetX = event.clientX - elementRect.left;
    const offsetY = event.clientY - elementRect.top;

    const move = (moveEvent) => {
      const maxX = Math.max(0, board.clientWidth - element.offsetWidth);
      const maxY = Math.max(0, board.clientHeight - element.offsetHeight);
      const x = Math.min(maxX, Math.max(0, moveEvent.clientX - boardRect.left - offsetX));
      const y = Math.min(maxY, Math.max(0, moveEvent.clientY - boardRect.top - offsetY));
      element.style.left = `${Math.round(x)}px`;
      element.style.top = `${Math.round(y)}px`;
    };

    const end = async () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', end);
      element.removeEventListener('pointercancel', end);
      element.classList.remove('dragging');
      isDragging = false;

      const x = parseInt(element.style.left, 10);
      const y = parseInt(element.style.top, 10);
      if (x !== note.x || y !== note.y) {
        try {
          await updateNote(note.id, { x, y });
          setStatus('Position saved');
        } catch (error) {
          setStatus(error.message, true);
          await loadNotes(false);
        }
      }
    };

    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
  });
}

async function createNote() {
  if (!currentBoardId) return;
  try {
    await request(`${config.BOARD_API_URL}/boards/${currentBoardId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text: 'New note', x: 60, y: 60, color: 'yellow' })
    });
    await loadNotes(false);
    setStatus('Note created');
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function updateNote(noteId, changes) {
  return request(`${config.BOARD_API_URL}/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes)
  });
}

async function deleteNote(noteId) {
  return request(`${config.BOARD_API_URL}/notes/${noteId}`, { method: 'DELETE' });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = document.querySelector('#username').value;
  const password = document.querySelector('#password').value;
  setAuthMessage('Signing in...');

  try {
    await login(username, password);
    setAuthMessage('');
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

registerButton.addEventListener('click', async () => {
  const username = document.querySelector('#username').value;
  const password = document.querySelector('#password').value;
  setAuthMessage('Creating account...');

  try {
    await register(username, password);
    setAuthMessage('');
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

boardSelect.addEventListener('change', async () => {
  currentBoardId = Number(boardSelect.value);
  await loadNotes();
});

addNoteButton.addEventListener('click', createNote);
logoutButton.addEventListener('click', logout);

if (token) {
  openApp();
}
