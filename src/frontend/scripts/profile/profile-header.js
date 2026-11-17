/**
 * profile-header.js
 * Seção a): Cabeçalho do perfil com avatar de iniciais, nome, e-mail e data de criação.
 */

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function formatDateMonthYear(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function renderProfileHeader(userData) {
  const avatarEl = document.getElementById('profileAvatar');
  const nameEl = document.getElementById('profileHeaderName');
  const emailEl = document.getElementById('profileHeaderEmail');
  const memberSinceEl = document.getElementById('profileMemberSince');

  if (avatarEl) avatarEl.textContent = getInitials(userData.name);
  if (nameEl) nameEl.textContent = userData.name || 'Usuário';
  if (emailEl) emailEl.textContent = userData.email || '';
  if (memberSinceEl) {
    memberSinceEl.textContent = `Membro desde ${formatDateMonthYear(userData.createdAt)}`;
  }
}
