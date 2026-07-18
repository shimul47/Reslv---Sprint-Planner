import React, { useState } from 'react';

const TRACK_COLORS = ['#FFA39E', '#FFD591', '#78D3F8', '#85E3B2', '#D3ADF7', '#FFADD2', '#B7EB8F'];

const getDepartmentIcon = (name = '') => {
  const norm = name.toLowerCase().trim();
  if (norm.includes('product') || norm.includes('pm') || norm.includes('management')) {
    return (
      <svg className="w-6 h-6 text-[var(--color-primary)] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (norm.includes('ux') || norm.includes('research') || norm.includes('user')) {
    return (
      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  if (norm.includes('design') || norm.includes('ui') || norm.includes('art') || norm.includes('creative')) {
    return (
      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    );
  }
  if (norm.includes('dev') || norm.includes('code') || norm.includes('engineering') || norm.includes('tech')) {
    return (
      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  if (norm.includes('sme') || norm.includes('adviser') || norm.includes('consultant') || norm.includes('qa')) {
    return (
      <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  );
};

const INITIAL_STATE = [
  {
    id: 'dept-1',
    name: 'Product',
    assets: 'Interview videos, Requirements Spec, Coordinations with...',
    color: '#FFA39E',
    todos: [{ id: 1, text: 'add a requirements document', completed: true }],
    assignees: [{ id: 'user-1', name: 'Rafiq', role: 'PM', link: '', notes: 'Product lead sync logs' }],
    notes: [{ id: 101, text: 'Review Product', assigneeId: 'user-1' }, null, null]
  },
  {
    id: 'dept-2',
    name: 'UX',
    assets: 'Usability tests videos / results, Mockups, Research...',
    color: '#FFD591',
    todos: [{ id: 2, text: 'Test UX', completed: true }],
    assignees: [{ id: 'user-2', name: 'Zafar', role: 'UXer', link: '', notes: '' }],
    notes: [{ id: 102, text: 'CSE471 Submit', assigneeId: 'user-2' }, null, null]
  },
  {
    id: 'dept-3',
    name: 'Design',
    assets: 'Design system assets, Dev ready design, Colors...',
    color: '#78D3F8',
    todos: [{ id: 3, text: 'design 471 in Figma', completed: true }],
    assignees: [{ id: 'user-3', name: 'Anis', role: 'Designer', link: '', notes: '' }],
    notes: [{ id: 103, text: 'CSE471 Frontend', assigneeId: 'user-3' }, null, null]
  },
  {
    id: 'dept-4',
    name: 'Dev',
    assets: 'Technical spec, T-shirt size estimation...',
    color: '#85E3B2',
    todos: [],
    assignees: [{ id: 'user-4', name: 'Mitu', role: 'Developer', link: '', notes: '' }],
    notes: [{ id: 104, text: 'Finalize Stack Drawbacks', assigneeId: 'user-4' }, null, null]
  },
  {
    id: 'dept-5',
    name: 'SME',
    assets: 'Knowledge expanding presentations, documents...',
    color: '#D3ADF7',
    todos: [],
    assignees: [{ id: 'user-5', name: 'Core', role: 'Adviser', link: '', notes: '' }],
    notes: [{ id: 105, text: 'Research Market', assigneeId: 'user-5' }, null, null]
  }
];

export default function SprintBoard() {
  const [departments, setDepartments] = useState(INITIAL_STATE);
  const [activeMiniModule, setActiveMiniModule] = useState(null); 
  const [activeMemberModule, setActiveMemberModule] = useState(null); 
  const [todoInputs, setTodoInputs] = useState({});
  
  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    text: '',
    deptId: null,
    index: null,
    noteId: null,
    assigneeId: ''
  });

  const [deptModal, setDeptModal] = useState({
    isOpen: false,
    mode: 'add',
    deptId: null,
    name: '',
    assets: ''
  });

  const [assigneeModal, setAssigneeModal] = useState({
    isOpen: false,
    deptId: null,
    name: '',
    role: ''
  });

  const openAddDepartmentModal = () => {
    setDeptModal({
      isOpen: true,
      mode: 'add',
      deptId: null,
      name: '',
      assets: 'Custom managed track assets and parameters...'
    });
  };

  const openEditDepartmentModal = (deptId, currentName, currentAssets) => {
    setDeptModal({
      isOpen: true,
      mode: 'edit',
      deptId,
      name: currentName,
      assets: currentAssets || ''
    });
  };

  const handleSaveDepartment = () => {
    if (!deptModal.name.trim()) return;

    if (deptModal.mode === 'add') {
      setDepartments(prev => [...prev, {
        id: `dept-${Date.now()}`,
        name: deptModal.name.trim(),
        assets: deptModal.assets.trim() || 'Custom managed track assets and parameters...',
        color: TRACK_COLORS[Math.floor(Math.random() * TRACK_COLORS.length)],
        todos: [],
        assignees: [],
        notes: [null, null, null]
      }]);
    } else {
      setDepartments(prev => prev.map(d => 
        d.id === deptModal.deptId 
          ? { ...d, name: deptModal.name.trim(), assets: deptModal.assets.trim() } 
          : d
      ));
    }
    setDeptModal({ isOpen: false, mode: 'add', deptId: null, name: '', assets: '' });
  };

  const handleDeleteDepartment = (deptId) => {
    if (confirm("Delete this entire department?")) {
      setDepartments(prev => prev.filter(d => d.id !== deptId));
    }
  };

  const openAddAssigneeModal = (deptId) => {
    setAssigneeModal({ isOpen: true, deptId, name: '', role: '' });
  };

  const handleSaveAssignee = () => {
    if (!assigneeModal.name.trim()) return;
    setDepartments(prev => prev.map(d => {
      if (d.id !== assigneeModal.deptId) return d;
      return {
        ...d,
        assignees: [...d.assignees, { id: `user-${Date.now()}`, name: assigneeModal.name.trim(), role: assigneeModal.role.trim() || 'Member', link: '', notes: '' }]
      };
    }));
    setAssigneeModal({ isOpen: false, deptId: null, name: '', role: '' });
  };

  const handleUpdateMemberField = (deptId, memberId, field, value) => {
    setDepartments(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      return {
        ...d,
        assignees: d.assignees.map(a => a.id === memberId ? { ...a, [field]: value } : a)
      };
    }));
    setActiveMemberModule(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleDeleteMember = (deptId, memberId) => {
    if (confirm("Remove this team member allocation?")) {
      setDepartments(prev => prev.map(d => {
        if (d.id !== deptId) return d;
        return {
          ...d,
          assignees: d.assignees.filter(a => a.id !== memberId),
          notes: d.notes.map(n => n && n.assigneeId === memberId ? null : n)
        };
      }));
      setActiveMemberModule(null);
    }
  };

  const handleAddTodo = (deptId) => {
    const text = todoInputs[deptId]?.trim();
    if (!text) return;
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, todos: [...d.todos, { id: Date.now(), text, completed: false }] } : d));
    setTodoInputs(prev => ({ ...prev, [deptId]: '' }));
  };

  const toggleTodo = (deptId, todoId) => {
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, todos: d.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t) } : d));
  };

  const handleSlotClick = (deptId, index, existingNote) => {
    const dept = departments.find(d => d.id === deptId);
    setNoteModal({
      isOpen: true,
      text: existingNote ? existingNote.text : '',
      deptId,
      index,
      noteId: existingNote ? existingNote.id : null,
      assigneeId: existingNote ? (existingNote.assigneeId || '') : (dept.assignees[0]?.id || '')
    });
  };

  const handleSaveNote = () => {
    if (!noteModal.text.trim()) return;
    setDepartments(prev => prev.map(d => {
      if (d.id !== noteModal.deptId) return d;
      const updatedNotes = [...d.notes];
      updatedNotes[noteModal.index] = {
        id: noteModal.noteId || Date.now(),
        text: noteModal.text.trim(),
        assigneeId: noteModal.assigneeId
      };
      return { ...d, notes: updatedNotes };
    }));
    setNoteModal({ isOpen: false, text: '', deptId: null, index: null, noteId: null, assigneeId: '' });
  };

  const handleDeleteNote = () => {
    setDepartments(prev => prev.map(d => {
      if (d.id !== noteModal.deptId) return d;
      const updatedNotes = [...d.notes];
      updatedNotes[noteModal.index] = null;
      return { ...d, notes: updatedNotes };
    }));
    setNoteModal({ isOpen: false, text: '', deptId: null, index: null, noteId: null, assigneeId: '' });
  };

  const handleDragStart = (e, sourceDeptId, sourceIndex) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ sourceDeptId, sourceIndex }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, targetDeptId, targetIndex) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { sourceDeptId, sourceIndex } = JSON.parse(rawData);

      setDepartments(prev => {
        const sourceDept = prev.find(d => d.id === sourceDeptId);
        const targetDept = prev.find(d => d.id === targetDeptId);
        if (!sourceDept || !targetDept) return prev;

        const movingNote = sourceDept.notes[sourceIndex];
        if (!movingNote) return prev;

        return prev.map(d => {
          const updatedNotes = [...d.notes];
          if (d.id === sourceDeptId) {
            updatedNotes[sourceIndex] = (sourceDeptId === targetDeptId) ? sourceDept.notes[targetIndex] : targetDept.notes[targetIndex];
          }
          if (d.id === targetDeptId) {
            updatedNotes[targetIndex] = movingNote;
          }
          return { ...d, notes: updatedNotes };
        });
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full text-left p-6 overflow-x-auto select-none flex flex-col gap-6">
      
      {/* Upper Control Strip */}
      <div>
        <button
          onClick={openAddDepartmentModal}
          className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold px-4 py-2 rounded-[var(--radius-sm)] shadow-[var(--shadow)] cursor-pointer hover:opacity-90"
        >
          ➕ Add Department Track
        </button>
      </div>

      {/* SEGMENT 1: Headers & Dynamic Todo List Container Strip */}
      <div className="flex gap-6 items-start min-w-[1200px] border-b border-[var(--color-border)] pb-6">
        {departments.map((dept) => (
          <div key={dept.id} className="flex-1 flex flex-col gap-3 min-w-[220px]">
            {/* Header Track Panel View */}
            <div className="w-full group">
              <div className="flex justify-between items-start">
                <button 
                  onClick={() => setActiveMiniModule(dept)}
                  className="text-left cursor-pointer focus:outline-hidden flex-1"
                >
                  <div className="mb-2.5 mt-1 transition-transform group-hover:scale-105 duration-200">
                    {getDepartmentIcon(dept.name)}
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-[var(--text-h)] hover:text-[var(--color-primary)] transition-colors">
                    {dept.name}
                  </h3>
                </button>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 pt-7">
                  <button onClick={() => openEditDepartmentModal(dept.id, dept.name, dept.assets)} className="text-[10px] text-[var(--text)] hover:underline cursor-pointer">Edit</button>
                  <button onClick={() => handleDeleteDepartment(dept.id)} className="text-[10px] text-red-500 hover:underline cursor-pointer">Del</button>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text)] leading-tight h-7 mt-1 overflow-hidden line-clamp-2 opacity-80">
                {dept.assets}
              </p>
            </div>

            {/* Todo Block Card Component */}
            <div className="bg-[var(--color-card)] rounded-[var(--radius-md)] p-4 border border-[var(--color-border)] shadow-[var(--shadow)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text)] mb-2 block">Todo</span>
              <div className="space-y-2 mb-3 h-32 overflow-y-auto pr-1">
                {dept.todos.map((todo) => (
                  <label key={todo.id} className="flex items-start gap-2 text-xs text-[var(--color-foreground)] cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={todo.completed} 
                      onChange={() => toggleTodo(dept.id, todo.id)}
                      className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] text-[10px]"
                    />
                    <span className={todo.completed ? 'line-through text-[var(--text)] opacity-50' : ''}>
                      {todo.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  placeholder="Add task..."
                  value={todoInputs[dept.id] || ''}
                  onChange={(e) => setTodoInputs({...todoInputs, [dept.id]: e.target.value})}
                  className="flex-1 text-xs bg-[var(--color-input-background)] text-[var(--color-foreground)] rounded px-2 py-1 focus:outline-hidden border border-transparent focus:border-[var(--color-border)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo(dept.id)}
                />
                <button onClick={() => handleAddTodo(dept.id)} className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[10px] font-medium px-2 py-1 rounded hover:bg-[var(--color-secondary)] cursor-pointer">Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEGMENT 2: Aligned Board Canvas (Roles & Sticky Card Rows) */}
      <div className="flex gap-6 items-start min-w-[1200px]">
        {departments.map((dept) => (
          <div key={dept.id} className="flex-1 flex flex-col gap-4 min-w-[220px]">
            
            {/* Dynamic Multi-Member Allocation Grid Stack */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1.5 items-center">
                {dept.assignees.map((user) => (
                  <button 
                    key={user.id}
                    onClick={() => setActiveMemberModule({ ...user, deptId: dept.id })}
                    className="flex items-center gap-1.5 text-[11px] text-[var(--text)] hover:text-[var(--text-h)] bg-[var(--color-card)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-muted)] cursor-pointer transition-colors max-w-[130px]"
                  >
                    <div className="w-4 h-4 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[8px] font-bold text-[var(--text-h)]">👤</div>
                    <span className="truncate font-semibold">{user.name}</span>
                  </button>
                ))}
                <button 
                  onClick={() => openAddAssigneeModal(dept.id)}
                  className="w-6 h-6 rounded-full border border-dashed border-[var(--color-border)] text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--color-muted)] flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  title="Assign additional role/member"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5 mt-1">
              {dept.notes.map((note, index) => {
                const noteOwner = dept.assignees.find(a => a.id === note?.assigneeId);
                return (
                  <div 
                    key={index} 
                    onClick={() => handleSlotClick(dept.id, index, note)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, dept.id, index)}
                    style={{ backgroundColor: note ? dept.color : 'transparent' }}
                    draggable={!!note}
                    onDragStart={(e) => handleDragStart(e, dept.id, index)}
                    className={`relative w-full h-24 rounded-tl-sm rounded-tr-sm transition-all flex flex-col items-center justify-center p-3 text-center select-none
                      ${note 
                        ? 'text-neutral-900 font-semibold text-xs cursor-grab active:cursor-grabbing border-b-0 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_6px_10px_rgba(0,0,0,0.04)] before:content-[""] before:absolute before:left-0 before:right-0 before:bottom-0 before:h-2 before:bg-inherit before:rounded-bl-[40%_12px] before:rounded-br-[40%_12px] before:shadow-[0_4px_5px_rgba(0,0,0,0.15)] before:transform before:translate-y-[2px] hover:scale-[1.01] duration-150' 
                        : 'border border-dashed border-[var(--color-ring)] opacity-30 hover:opacity-95 hover:bg-[var(--color-muted)] cursor-pointer rounded-sm'
                      }
                    `}
                  >
                    {note ? (
                      <>
                        <span className="break-words line-clamp-3 leading-tight relative z-10 px-1">{note.text}</span>
                        {noteOwner && (
                          <span className="absolute bottom-1.5 left-2 text-[8px] tracking-tight bg-black/15 text-neutral-800 px-1 rounded-xs uppercase max-w-[80%] truncate z-10">
                            {noteOwner.name}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--text)] text-[11px] font-medium">+ Open Slot</span>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

      {noteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-in">
            <h4 className="text-sm font-bold text-[var(--text-h)]">
              {noteModal.noteId ? '✏️ Modify Sticky Note' : '➕ Add Sticky Card'}
            </h4>
            <textarea
              autoFocus
              rows={3}
              value={noteModal.text}
              onChange={(e) => setNoteModal(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Enter note context elements..."
              className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2.5 focus:outline-hidden focus:border-[var(--color-ring)] resize-none"
            />
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Assign to Member</label>
              <select
                value={noteModal.assigneeId}
                onChange={(e) => setNoteModal(prev => ({ ...prev, assigneeId: e.target.value }))}
                className="w-full text-xs bg-[var(--color-input-background)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
              >
                <option value="">Unassigned</option>
                {departments.find(d => d.id === noteModal.deptId)?.assignees.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-between items-center mt-2">
              {noteModal.noteId ? (
                <button type="button" onClick={handleDeleteNote} className="text-[11px] font-medium text-red-500 hover:underline cursor-pointer">
                  Delete Note
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setNoteModal({ isOpen: false, text: '', deptId: null, index: null, noteId: null, assigneeId: '' })} className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveNote} className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Create/Edit Custom Mini Box Modal */}
      {deptModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-in">
            <h4 className="text-sm font-bold text-[var(--text-h)]">
              {deptModal.mode === 'add' ? '➕ Add Department Track' : '✏️ Edit Department Details'}
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Department Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Frontend Development"
                value={deptModal.name}
                onChange={(e) => setDeptModal(prev => ({ ...prev, name: e.target.value }))}
                className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden focus:border-[var(--color-ring)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Assets Description Summary</label>
              <textarea
                rows={2}
                placeholder="e.g. Design files, mockups, documentation specs..."
                value={deptModal.assets}
                onChange={(e) => setDeptModal(prev => ({ ...prev, assets: e.target.value }))}
                className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden focus:border-[var(--color-ring)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setDeptModal({ isOpen: false, mode: 'add', deptId: null, name: '', assets: '' })} className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveDepartment} className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignee/Role Creation Custom Mini Box Modal */}
      {assigneeModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-in">
            <h4 className="text-sm font-bold text-[var(--text-h)]">👤 Assign New Role/Member</h4>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Assignee Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. John Doe"
                value={assigneeModal.name}
                onChange={(e) => setAssigneeModal(prev => ({ ...prev, name: e.target.value }))}
                className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden focus:border-[var(--color-ring)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Role Designation Title</label>
              <input
                type="text"
                placeholder="e.g. Lead Designer"
                value={assigneeModal.role}
                onChange={(e) => setAssigneeModal(prev => ({ ...prev, role: e.target.value }))}
                className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden focus:border-[var(--color-ring)]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setAssigneeModal({ isOpen: false, deptId: null, name: '', role: '' })} className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSaveAssignee} className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Management Mini Module */}
      {activeMemberModule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 text-left">
          <div className="w-full max-w-sm bg-[var(--color-background)] h-full shadow-2xl p-6 overflow-y-auto flex flex-col border-l border-[var(--color-border)] animate-slide-in">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-h)]">👤 Member Allocation</h2>
                <span className="text-[10px] uppercase text-[var(--text)] tracking-wider">Dynamic Workspace Input</span>
              </div>
              <button onClick={() => setActiveMemberModule(null)} className="text-xs text-[var(--text)] hover:text-[var(--text-h)] px-2 py-1 bg-[var(--color-muted)] rounded-sm cursor-pointer">Close</button>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={activeMemberModule.name} 
                  onChange={(e) => handleUpdateMemberField(activeMemberModule.deptId, activeMemberModule.id, 'name', e.target.value)}
                  className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-card)] border border-[var(--color-border)] p-2 rounded focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Functional Role Designation</label>
                <input 
                  type="text" 
                  value={activeMemberModule.role} 
                  onChange={(e) => handleUpdateMemberField(activeMemberModule.deptId, activeMemberModule.id, 'role', e.target.value)}
                  className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-card)] border border-[var(--color-border)] p-2 rounded focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Personal Portfolio Reference URL</label>
                <input 
                  type="text" 
                  placeholder="https://github.com/profile"
                  value={activeMemberModule.link || ''} 
                  onChange={(e) => handleUpdateMemberField(activeMemberModule.deptId, activeMemberModule.id, 'link', e.target.value)}
                  className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-card)] border border-[var(--color-border)] p-2 rounded focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Task Deliverable Log / Context</label>
                <textarea 
                  rows={4} 
                  placeholder="Describe metrics..."
                  value={activeMemberModule.notes || ''} 
                  onChange={(e) => handleUpdateMemberField(activeMemberModule.deptId, activeMemberModule.id, 'notes', e.target.value)}
                  className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-card)] border border-[var(--color-border)] p-2 rounded focus:outline-hidden resize-none"
                />
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--color-border)]">
              <button 
                onClick={() => handleDeleteMember(activeMemberModule.deptId, activeMemberModule.id)}
                className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded text-xs font-bold cursor-pointer"
              >
                🚨 Delete Assignee Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Department/Track Specs Side Drawer */}
      {activeMiniModule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 text-left">
          <div className="w-full max-w-md bg-[var(--color-background)] h-full shadow-2xl p-6 overflow-y-auto flex flex-col border-l border-[var(--color-border)] animate-slide-in">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 mb-6">
              <h2 className="text-xl font-bold text-[var(--text-h)]">{activeMiniModule.name} Department Specs</h2>
              <button onClick={() => setActiveMiniModule(null)} className="text-xs font-medium text-[var(--text)] hover:text-[var(--text-h)] px-2.5 py-1.5 rounded-sm bg-[var(--color-muted)] cursor-pointer">Close</button>
            </div>
            <div className="flex flex-col gap-5">
              <div className="bg-[var(--color-card)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-2">Figma Layout Link</label>
                <input type="text" readOnly value={`https://www.figma.com/design/h8dPNp8ryOR8sjM4LWBPUO/CSE471_22201411?track=${activeMiniModule.id}`} className="w-full bg-[var(--color-input-background)] border border-[var(--color-border)] text-xs text-[var(--color-foreground)] rounded p-2 font-mono outline-hidden select-all" />
              </div>
              <div className="bg-[var(--color-card)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-2">Track Asset Context</label>
                <textarea readOnly rows={2} value={activeMiniModule.assets} className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 outline-hidden resize-none opacity-80" />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}