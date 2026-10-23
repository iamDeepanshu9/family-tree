const WORDS = {
  en: { self: 'You', father: 'Your father', son: 'Your son', daughter: 'Your daughter', brother: 'Your brother', sister: 'Your sister', grandfather: 'Your grandfather', grandmother: 'Your grandmother', grandson: 'Your grandson', granddaughter: 'Your granddaughter', uncle: "Your father's brother", elderUncle: 'Your elder paternal uncle', youngerUncle: 'Your younger paternal uncle', bua: 'Your bua', cousinBrother: 'Your cousin brother', cousinSister: 'Your cousin sister', ancestor: 'Your ancestor', descendant: 'Your descendant', relative: 'Your family relative' },
  hi: { self: 'आप स्वयं', father: 'आपके पिता', son: 'आपके पुत्र', daughter: 'आपकी पुत्री', brother: 'आपके भाई', sister: 'आपकी बहन', grandfather: 'आपके दादा', grandmother: 'आपकी दादी', grandson: 'आपके पोते', granddaughter: 'आपकी पोती', uncle: 'आपके पिता के भाई', elderUncle: 'आपके ताऊ', youngerUncle: 'आपके चाचा', bua: 'आपकी बुआ', cousinBrother: 'आपके चचेरे भाई', cousinSister: 'आपकी चचेरी बहन', ancestor: 'आपके पूर्वज', descendant: 'आपके वंशज', relative: 'आपके पारिवारिक संबंधी' }
};

function ageOrder(a, b) {
  if (a.birthYear && b.birthYear && a.birthYear !== b.birthYear) return a.birthYear < b.birthYear ? 'older' : 'younger';
  if (a.order && b.order && a.order !== b.order) return a.order < b.order ? 'older' : 'younger';
  return null;
}

export function getRelation(viewerId, personId, tree, locale = 'en') {
  const t = WORDS[locale] || WORDS.en;
  const viewer = tree.byId.get(viewerId) || tree.root;
  const person = tree.byId.get(personId);
  if (!person) return t.relative;
  if (viewer.id === person.id) return t.self;
  if (viewer.parentId === person.id) return t.father;
  if (person.parentId === viewer.id) return person.gender === 'F' ? t.daughter : t.son;
  if (viewer.parentId && viewer.parentId === person.parentId) return person.gender === 'F' ? t.sister : t.brother;

  const viewerParent = tree.byId.get(viewer.parentId);
  const viewerGrandparent = tree.byId.get(viewerParent?.parentId);
  if (viewerGrandparent?.id === person.id) return t.grandfather;
  const personParent = tree.byId.get(person.parentId);
  const personGrandparent = tree.byId.get(personParent?.parentId);
  if (personGrandparent?.id === viewer.id) return person.gender === 'F' ? t.granddaughter : t.grandson;

  if (viewerParent && person.parentId === viewerParent.parentId) {
    if (person.gender === 'F') return t.bua;
    const order = ageOrder(person, viewerParent);
    return order === 'older' ? t.elderUncle : order === 'younger' ? t.youngerUncle : t.uncle;
  }
  if (viewerParent && personParent && viewerParent.parentId && viewerParent.parentId === personParent.parentId) return person.gender === 'F' ? t.cousinSister : t.cousinBrother;

  if (viewer.ancestors.includes(person.id)) return t.ancestor;
  if (person.ancestors.includes(viewer.id)) return t.descendant;
  return t.relative;
}
