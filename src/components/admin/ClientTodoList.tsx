'use client'

import React, { useState, useEffect } from 'react'
import { Check, X, Plus, Trash2, Edit2, Save, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ClientTodo } from '@/lib/types/database.types'

interface ClientTodoListProps {
  clientId: string
}

export function ClientTodoList({ clientId }: ClientTodoListProps) {
  const [todos, setTodos] = useState<ClientTodo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoDescription, setNewTodoDescription] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTodoDueDate, setNewTodoDueDate] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingPriority, setEditingPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editingDueDate, setEditingDueDate] = useState('')

  // Charger les todos
  const fetchTodos = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/todos`)
      const data = await response.json()

      if (response.ok && data.success) {
        setTodos(data.todos || [])
      } else {
        setError(data.error || 'Erreur lors du chargement des todos')
      }
    } catch (err) {
      console.error('Error fetching todos:', err)
      setError('Erreur réseau lors du chargement des todos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTodos()
  }, [clientId])

  // Créer un nouveau todo
  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) {
      setError('Le titre est requis')
      return
    }

    setIsAdding(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          description: newTodoDescription.trim() || null,
          priority: newTodoPriority,
          due_date: newTodoDueDate || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setNewTodoTitle('')
        setNewTodoDescription('')
        setNewTodoPriority('medium')
        setNewTodoDueDate('')
        await fetchTodos()
      } else {
        setError(data.error || 'Erreur lors de la création du todo')
      }
    } catch (err) {
      console.error('Error creating todo:', err)
      setError('Erreur réseau lors de la création du todo')
    } finally {
      setIsAdding(false)
    }
  }

  // Toggle complété
  const handleToggleComplete = async (todo: ClientTodo) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchTodos()
      } else {
        setError(data.error || 'Erreur lors de la mise à jour du todo')
      }
    } catch (err) {
      console.error('Error updating todo:', err)
      setError('Erreur réseau lors de la mise à jour du todo')
    }
  }

  // Démarrer l'édition
  const handleStartEdit = (todo: ClientTodo) => {
    setEditingId(todo.id)
    setEditingTitle(todo.title)
    setEditingDescription(todo.description || '')
    setEditingPriority(todo.priority || 'medium')
    setEditingDueDate(todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '')
  }

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
    setEditingDescription('')
    setEditingPriority('medium')
    setEditingDueDate('')
  }

  // Sauvegarder l'édition
  const handleSaveEdit = async (todoId: string) => {
    if (!editingTitle.trim()) {
      setError('Le titre est requis')
      return
    }

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingTitle.trim(),
          description: editingDescription.trim() || null,
          priority: editingPriority,
          due_date: editingDueDate || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setEditingId(null)
        setEditingTitle('')
        setEditingDescription('')
        setEditingPriority('medium')
        setEditingDueDate('')
        await fetchTodos()
      } else {
        setError(data.error || 'Erreur lors de la mise à jour du todo')
      }
    } catch (err) {
      console.error('Error updating todo:', err)
      setError('Erreur réseau lors de la mise à jour du todo')
    }
  }

  // Supprimer un todo
  const handleDelete = async (todoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce todo ?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/todos/${todoId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchTodos()
      } else {
        setError(data.error || 'Erreur lors de la suppression du todo')
      }
    } catch (err) {
      console.error('Error deleting todo:', err)
      setError('Erreur réseau lors de la suppression du todo')
    }
  }

  const completedCount = todos.filter(t => t.completed).length
  const totalCount = todos.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1D3B4E]">
          Liste de tâches
          {totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({completedCount}/{totalCount})
            </span>
          )}
        </h3>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Formulaire d'ajout */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Titre de la tâche *"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleAddTodo()
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
          />
          <textarea
            placeholder="Description (optionnel)"
            value={newTodoDescription}
            onChange={(e) => setNewTodoDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priorité</label>
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date d'échéance</label>
              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleAddTodo}
              disabled={isAdding || !newTodoTitle.trim()}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {isAdding ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des todos */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : todos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-gray-200 rounded-lg">
          Aucune tâche pour le moment
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`border rounded-lg p-4 transition-all ${
                todo.completed
                  ? 'bg-gray-50 border-gray-200 opacity-75'
                  : 'bg-white border-gray-200'
              }`}
            >
              {editingId === todo.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                  />
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent resize-none"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Priorité</label>
                      <select
                        value={editingPriority}
                        onChange={(e) => setEditingPriority(e.target.value as 'low' | 'medium' | 'high')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                      >
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date d'échéance</label>
                      <input
                        type="date"
                        value={editingDueDate}
                        onChange={(e) => setEditingDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => handleSaveEdit(todo.id)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Enregistrer
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(todo)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? 'bg-[#00C3D9] border-[#00C3D9]'
                        : 'border-gray-300 hover:border-[#00C3D9]'
                    }`}
                  >
                    {todo.completed && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium ${
                          todo.completed ? 'line-through text-gray-500' : 'text-[#1D3B4E]'
                        }`}
                      >
                        {todo.title}
                      </p>
                      {todo.priority && (
                        <Badge
                          color={
                            todo.priority === 'high'
                              ? 'red'
                              : todo.priority === 'medium'
                                ? 'yellow'
                                : 'gray'
                          }
                          variant="status"
                          className="text-xs"
                        >
                          {todo.priority === 'high' ? 'Haute' : todo.priority === 'medium' ? 'Moyenne' : 'Basse'}
                        </Badge>
                      )}
                      {todo.due_date && !todo.completed && (
                        (() => {
                          const dueDate = new Date(todo.due_date)
                          const now = new Date()
                          const isOverdue = dueDate < now
                          const isToday = dueDate.toDateString() === now.toDateString()
                          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          
                          return (
                            <div className={`flex items-center gap-1 text-xs ${
                              isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-600'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              {isOverdue
                                ? `Échue le ${dueDate.toLocaleDateString('fr-FR')}`
                                : isToday
                                  ? "Aujourd'hui"
                                  : daysUntilDue === 1
                                    ? 'Demain'
                                    : `Dans ${daysUntilDue} jours`}
                            </div>
                          )
                        })()
                      )}
                    </div>
                    {todo.description && (
                      <p
                        className={`text-xs mt-1 ${
                          todo.completed ? 'line-through text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Créé le {new Date(todo.created_at).toLocaleDateString('fr-FR')}</span>
                      {todo.completed_at && (
                        <span>• Complété le {new Date(todo.completed_at).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(todo)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

