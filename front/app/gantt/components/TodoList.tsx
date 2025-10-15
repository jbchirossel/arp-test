'use client';

import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';

type TodoType = {
  id: number;
  text: string;
  done: boolean;
};

interface TodoListProps {
  taskId: number;
  todos: TodoType[];
  setTodos: React.Dispatch<React.SetStateAction<TodoType[]>>;
}

export default function TodoList({ taskId, todos, setTodos }: TodoListProps) {
  const [newTodo, setNewTodo] = useState('');

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          done: false,
          task_id: taskId,
        }),
      });

      if (res.ok) {
        const newTodoItem = await res.json();
        setTodos(prev => [...prev, newTodoItem]);
        setNewTodo('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la todo:', error);
    }
  };

  const toggleTodo = async (todoId: number, currentDone: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/checklist/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          done: !currentDone,
        }),
      });

      if (res.ok) {
        setTodos(prev =>
          prev.map(todo =>
            todo.id === todoId ? { ...todo, done: !currentDone } : todo
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la todo:', error);
    }
  };

  const deleteTodo = async (todoId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/checklist/${todoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setTodos(prev => prev.filter(todo => todo.id !== todoId));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la todo:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 p-3 bg-white/20 dark:bg-white/10 rounded-xl"
          >
            <button
              onClick={() => toggleTodo(todo.id, todo.done)}
              className="text-blue-500 dark:text-purple-400 hover:text-blue-600 dark:hover:text-purple-500 cursor-pointer active:scale-95 transition-transform"
              type="button"
            >
              {todo.done ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span
              className={`flex-1 ${
                todo.done
                  ? 'line-through text-gray-500 dark:text-gray-400'
                  : 'text-gray-800 dark:text-white'
              }`}
            >
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-red-500 hover:text-red-600 cursor-pointer active:scale-95 transition-transform"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {todos.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          Aucune tâche définie
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ajouter une tâche..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTodo();
            }
          }}
          className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 flex-1 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
        />
        <button
          onClick={addTodo}
          className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-3 py-2 text-white cursor-pointer active:scale-95 transition-transform"
          type="button"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 