import { io } from 'socket.io-client';

// O proxy do Vite encaminha /socket.io para o backend (porta 3001)
export const socket = io({ autoConnect: true });
