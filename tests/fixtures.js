export const phaseOne = {
  family: { title: 'Test family', titleHindi: 'परिवार', rootId: 'p1' },
  members: [
    { id: 'p1', name: 'Root', parentId: null, birthYear: 1938, order: 1 },
    { id: 'p2', name: 'Elder son', parentId: 'p1', birthYear: 1960, order: 1 },
    { id: 'p3', name: 'Younger son', parentId: 'p1', birthYear: 1965, order: 2 },
    { id: 'p4', name: 'Grandson', parentId: 'p2', birthYear: 1985, order: 1 },
    { id: 'p5', name: 'Cousin', parentId: 'p3', birthYear: 1988, order: 1 }
  ]
};
