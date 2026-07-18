export const INITIAL_DEPARTMENTS = {
  Product: {
    id: 'Product',
    roleLabel: '+ Assign PM',
    defaultRole: 'PM',
    color: '#FFA39E', 
    assets: 'Interview videos, Requirements Spec, Coordinations with...',
    todos: [{ id: 1, text: 'add a requirements document', completed: true }],
    notes: [
      { id: 101, text: 'Review Product', deptId: 'Product' },
      null,
      null
    ]
  },
  UX: {
    id: 'UX',
    roleLabel: '+ Assign UXer',
    defaultRole: 'UXer',
    color: '#FFD591', 
    assets: 'Usability tests videos / results, Mockups, Research...',
    todos: [{ id: 2, text: 'Test UX', completed: true }],
    notes: [
      { id: 102, text: 'CSE471 Submit', deptId: 'UX' },
      null,
      null
    ]
  },
  Design: {
    id: 'Design',
    roleLabel: '+ Assign Designer',
    defaultRole: 'Designer',
    color: '#78D3F8', 
    assets: 'Design system assets, Dev ready design, Colors...',
    todos: [{ id: 3, text: 'design 471 in Figma', completed: true }],
    notes: [
      { id: 103, text: 'CSE471 Frontend', deptId: 'Design' },
      null,
      null
    ]
  },
  Dev: {
    id: 'Dev',
    roleLabel: '+ Assign Developer',
    defaultRole: 'Developer',
    color: '#85E3B2', 
    assets: 'Technical spec, T-shirt size estimation...',
    todos: [],
    notes: [
      { id: 104, text: 'Finalize Stack Drawbacks', deptId: 'Dev' },
      null,
      null
    ]
  },
  SME: {
    id: 'SME',
    roleLabel: '+ Assign Adviser',
    defaultRole: 'Adviser',
    color: '#D3ADF7', 
    assets: 'Knowledge expanding presentations, documents...',
    todos: [],
    notes: [
      { id: 105, text: 'Research Market', deptId: 'SME' },
      null,
      null
    ]
  }
};