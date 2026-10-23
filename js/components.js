import { alternateName, displayName, isDeceased, years } from './i18n.js';

export function initials(person, locale) {
  return displayName(person, locale).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase();
}

export function photoMarkup(person, locale, className = 'avatar', eager = false) {
  const fallback = `<span aria-hidden="true">${initials(person, locale)}</span>`;
  if (!person.photo) return `<span class="${className}" aria-label="No photo available">${fallback}</span>`;
  return `<span class="${className} has-photo"><img src="${person.photo}" alt="" width="320" height="320" loading="${eager ? 'eager' : 'lazy'}" decoding="async" onerror="this.remove();this.parentElement.classList.remove('has-photo');this.parentElement.classList.add('avatar-fallback')">${fallback}</span>`;
}

export function personCard(person, locale, options = {}) {
  const alt = alternateName(person, locale);
  const date = years(person);
  return `<button class="person-card" type="button" data-person-id="${person.id}">
    ${photoMarkup(person, locale, 'person-card__photo')}
    <span><span class="person-card__name">${displayName(person, locale)}</span>${alt ? `<span class="person-card__alt" lang="hi">${alt}</span>` : ''}${date ? `<span class="person-card__years">${date}</span>` : ''}${person.branch && options.showBranch && locale !== 'hi' ? `<span class="person-card__branch">${person.branch.replace(/ Branch$/, '')}</span>` : ''}${isDeceased(person) ? `<span class="memory-label">${options.memoryLabel || ''}</span>` : ''}</span>
  </button>`;
}

export function bindPersonLinks(container, callback) {
  container.querySelectorAll('[data-person-id]').forEach(element => element.addEventListener('click', event => { event.stopPropagation(); callback(element.dataset.personId); }));
}
