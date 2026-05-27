import { API_URL, SOCKET_URL } from '../../../config/api';
import { io } from 'socket.io-client';

class QuizService {
  constructor() {
    this.socket = null;
    this.baseURL = `${API_URL}/quiz`;
  }

  getHeaders() {
    const token = localStorage.getItem('domino_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async _fetch(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers }
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      // Token expirou ou é inválido, limpa sessão
      localStorage.removeItem('domino_token');
      localStorage.removeItem('domino_user');
      window.location.reload();
      throw new Error('Sessão expirada. Redirecionando...');
    }

    if (!response.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  }

  // --- HTTP Methods ---

  async listQuizzes(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const endpoint = params ? `?${params}` : '';
    return this._fetch(endpoint);
  }

  async getQuiz(id) {
    return this._fetch(`/${id}`);
  }

  async createQuiz(data) {
    return this._fetch('', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteQuiz(id) {
    return this._fetch(`/${id}`, { method: 'DELETE' });
  }

  async startQuiz(id, mode = 'LIVE') {
    return this._fetch(`/${id}/start`, { method: 'POST', body: JSON.stringify({ mode }) });
  }

  async finishQuiz(id) {
    return this._fetch(`/${id}/finish`, { method: 'POST' });
  }

  async getQuizReport(id) {
    return this._fetch(`/${id}/report`);
  }

  // --- Player Methods ---

  async getQuizByRoomCode(code) {
    return this._fetch(`/room/${code}`);
  }

  async createSession(quizId, guestName) {
    return this._fetch(`/${quizId}/session`, { method: 'POST', body: JSON.stringify({ guestName }) });
  }

  async submitAnswer(sessionId, questionId, answerId, timeTakenSecs) {
    return this._fetch(`/session/${sessionId}/answer`, { 
      method: 'POST', 
      body: JSON.stringify({ questionId, answerId, timeTakenSecs }) 
    });
  }

  async finalizeSession(sessionId) {
    return this._fetch(`/session/${sessionId}/finish`, { method: 'POST' });
  }

  // --- Socket.IO Methods (Live Mode) ---

  connectSocket() {
    if (!this.socket) {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      this.socket = io(`${url}/quiz`, {
        transports: ['websocket'],
        autoConnect: true
      });
    }
    return this.socket;
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Host Methods
  hostJoin(roomCode) {
    this.connectSocket().emit('quiz:hostJoin', { roomCode });
  }

  hostStart(roomCode) {
    this.connectSocket().emit('quiz:start', { roomCode });
  }

  hostNextQuestion(roomCode, questionIndex, durationSecs) {
    this.connectSocket().emit('quiz:nextQuestion', { roomCode, questionIndex, durationSecs });
  }

  hostEndQuestion(roomCode, correctAnswerId, leaderboard) {
    this.connectSocket().emit('quiz:questionEnd', { roomCode, correctAnswerId, leaderboard });
  }

  hostFinish(roomCode, finalLeaderboard) {
    this.connectSocket().emit('quiz:finish', { roomCode, finalLeaderboard });
  }

  // Player Methods
  playerJoin(roomCode, playerName) {
    this.connectSocket().emit('quiz:playerJoin', { roomCode, playerName });
  }

  playerSubmitAnswer(roomCode, isCorrect, pointsEarned) {
    this.connectSocket().emit('quiz:submitAnswer', { roomCode, isCorrect, pointsEarned });
  }

  // Event Listeners
  on(event, callback) {
    this.connectSocket().on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new QuizService();
