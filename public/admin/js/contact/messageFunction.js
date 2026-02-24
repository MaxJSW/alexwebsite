document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // VARIABLES GLOBALES
    // ========================================
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let selectedMessageId = null;
    
    // ========================================
    // INITIALISATION (UNE SEULE FOIS)
    // ========================================
    init();
    
    function init() {
        bindStaticEvents(); 
        bindDynamicEvents();
        checkUnreadMessages();
        
        setInterval(checkUnreadMessages, 60000);
    }
    
    // ========================================
    // ÉVÉNEMENTS STATIQUES (buttons, search, etc.)
    // ========================================
    function bindStaticEvents() {
        document.getElementById('selectAllBtn').addEventListener('click', handleSelectAll);
        
        document.getElementById('deleteBtn').addEventListener('click', handleDeleteClick);
        
        document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);
        
        document.getElementById('markAsReadBtn').addEventListener('click', handleMarkAsRead);
        
        document.getElementById('refreshBtn').addEventListener('click', handleRefresh);
        
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', handleFilterClick);
        });
        
        document.getElementById('searchMessages').addEventListener('input', handleSearch);
        
        document.getElementById('modalRespondSwitch').addEventListener('change', handleModalRespondSwitch);
    }
    
    // ========================================
    // ÉVÉNEMENTS DYNAMIQUES (avec délégation)
    // ========================================
    function bindDynamicEvents() {
        const mailboxList = document.getElementById('mailboxList');
        
        mailboxList.addEventListener('click', function(e) {
            const messageItem = e.target.closest('.mailbox-item');
            
            if (e.target.classList.contains('mailbox-checkbox')) {
                return;
            }
            
            if (messageItem) {
                handleMessageClick(messageItem);
            }
        });
        
        mailboxList.addEventListener('change', function(e) {
            if (e.target.classList.contains('mailbox-checkbox')) {
                updateSelectionUI();
            }
        });
        
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('.copy-email-btn')) {
                const btn = e.target.closest('.copy-email-btn');
                const email = btn.getAttribute('data-email');
                copyEmailToClipboard(email);
            }
        });
    }
    
    // ========================================
    // HANDLERS DES ÉVÉNEMENTS
    // ========================================
    
    function handleSelectAll() {
        const visibleCheckboxes = Array.from(document.querySelectorAll('.mailbox-item:not([style*="display: none"]) .mailbox-checkbox'));
        const allChecked = visibleCheckboxes.every(cb => cb.checked);
        
        visibleCheckboxes.forEach(cb => {
            cb.checked = !allChecked;
        });
        
        updateSelectionUI();
        
        if (!allChecked) {
            toast.info(`${visibleCheckboxes.length} message(s) sélectionné(s)`);
        } else {
            toast.info('Sélection annulée');
        }
    }
    
    function handleDeleteClick() {
        const selected = getSelectedMessages();
        
        if (selected.length === 0) {
            toast.warning('Veuillez sélectionner au moins un message');
            return;
        }
        
        document.getElementById('deleteCount').textContent = selected.length;
        const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        modal.show();
    }
    
    function handleConfirmDelete() {
        const selected = getSelectedMessages();
        
        fetch('message/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messageIds: selected })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toast.success(`${selected.length} message(s) supprimé(s)`);
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                modal.hide();
                
                refreshMessageList();
            } else {
                toast.error('Erreur lors de la suppression');
            }
        })
        .catch(error => {
            toast.error('Erreur réseau');
            console.error('Erreur:', error);
        });
    }
    
    function handleMarkAsRead() {
        const selected = getSelectedMessages();
        
        if (selected.length === 0) {
            toast.warning('Veuillez sélectionner au moins un message');
            return;
        }
        
        let completed = 0;
        
        selected.forEach(messageId => {
            fetch(`message/update-message-status/${messageId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'Lu' })
            })
            .then(response => response.json())
            .then(data => {
                completed++;
                if (completed === selected.length) {
                    toast.success(`${selected.length} message(s) marqué(s) comme lu`);
                    refreshMessageList();
                }
            });
        });
    }
    
    function handleRefresh() {
        const icon = document.querySelector('#refreshBtn i');
        icon.style.animation = 'spin 0.5s linear';
        
        setTimeout(() => {
            icon.style.animation = '';
        }, 500);
        
        refreshMessageList();
        toast.info('Liste actualisée');
    }
    
    if (!document.getElementById('spin-animation-style')) {
        const style = document.createElement('style');
        style.id = 'spin-animation-style';
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    function handleFilterClick(e) {
        currentFilter = this.getAttribute('data-filter');
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        
        applyFilters();
    }
    
    function handleSearch(e) {
        currentSearchTerm = this.value.toLowerCase();
        applyFilters();
    }
    
    function handleMessageClick(messageItem) {
        const messageId = messageItem.getAttribute('data-id');
        const name = messageItem.getAttribute('data-name');
        const email = messageItem.getAttribute('data-email');
        const phone = messageItem.getAttribute('data-phone');
        const subject = messageItem.getAttribute('data-subject');
        const content = messageItem.getAttribute('data-content');
        const date = messageItem.getAttribute('data-date');
        const status = messageItem.getAttribute('data-status');
        
        selectedMessageId = messageId;
        
        const modalBody = document.getElementById('messageDetailBody');
        modalBody.innerHTML = `
            <div class="message-info-row">
                <span class="message-info-label">
                    <i class="fa-solid fa-user me-2"></i>Nom :
                </span>
                <span class="message-info-value">${name}</span>
            </div>
            
            <div class="message-info-row">
                <span class="message-info-label">
                    <i class="fa-solid fa-envelope me-2"></i>Email :
                </span>
                <span class="message-info-value">
                    ${email}
                    <button class="copy-email-btn ms-2" data-email="${email}">
                        <i class="fa-regular fa-copy me-1"></i>Copier
                    </button>
                </span>
            </div>
            
            <div class="message-info-row">
                <span class="message-info-label">
                    <i class="fa-solid fa-phone me-2"></i>Téléphone :
                </span>
                <span class="message-info-value">${phone}</span>
            </div>
            
            <div class="message-info-row">
                <span class="message-info-label">
                    <i class="fa-solid fa-calendar me-2"></i>Date :
                </span>
                <span class="message-info-value">${date}</span>
            </div>
            
            <div class="message-info-row">
                <span class="message-info-label">
                    <i class="fa-solid fa-tag me-2"></i>Sujet :
                </span>
                <span class="message-info-value">${subject}</span>
            </div>
            
            <div class="message-info-row">
                <span class="message-info-label">
                    <i class="fa-solid fa-circle-info me-2"></i>Statut :
                </span>
                <span class="message-info-value">${status}</span>
            </div>
            
            <div class="mt-3">
                <strong><i class="fa-solid fa-message me-2"></i>Message :</strong>
                <div class="message-content-box">${content}</div>
            </div>
        `;
        
        const respondSwitch = document.getElementById('modalRespondSwitch');
        if (status === 'Répondu') {
            respondSwitch.checked = true;
            respondSwitch.disabled = true;
        } else {
            respondSwitch.checked = false;
            respondSwitch.disabled = false;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('messageDetailModal'));
        modal.show();
        
        if (status === 'Non lu') {
            markSingleMessageAsRead(messageId, messageItem);
        }
    }
    
    function handleModalRespondSwitch(e) {
        if (this.checked && selectedMessageId) {
            fetch(`message/update-message-status/${selectedMessageId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'Répondu' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    toast.success('Message marqué comme répondu');
                    this.disabled = true;
                    
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('messageDetailModal'));
                        modal.hide();
                        refreshMessageList();
                    }, 1000);
                } else {
                    toast.error('Erreur lors de la mise à jour');
                    this.checked = false;
                }
            })
            .catch(error => {
                toast.error('Erreur réseau');
                this.checked = false;
                console.error('Erreur:', error);
            });
        }
    }
    
    // ========================================
    // FONCTIONS UTILITAIRES
    // ========================================
    
    function markSingleMessageAsRead(messageId, element) {
        fetch(`message/update-message-status/${messageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'Lu' })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                element.classList.remove('unread');
                element.setAttribute('data-status', 'Lu');
                
                const statusIndicator = element.querySelector('.mailbox-status-indicator');
                if (statusIndicator) {
                    statusIndicator.classList.remove('status-unread');
                    statusIndicator.classList.add('status-read');
                }
                
                const badge = element.querySelector('.mailbox-badge');
                if (badge) {
                    badge.classList.remove('badge-unread');
                    badge.classList.add('badge-read');
                    badge.textContent = 'Lu';
                }
                
                checkUnreadMessages();
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour du statut : ', error);
        });
    }
    
    function updateSelectionUI() {
        const selected = getSelectedMessages();
        const deleteBtn = document.getElementById('deleteBtn');
        
        if (selected.length > 0) {
            deleteBtn.classList.add('delete-active');
        } else {
            deleteBtn.classList.remove('delete-active');
        }
        
        document.querySelectorAll('.mailbox-item').forEach(item => {
            const checkbox = item.querySelector('.mailbox-checkbox');
            if (checkbox && checkbox.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    function getSelectedMessages() {
        return Array.from(document.querySelectorAll('.mailbox-checkbox:checked'))
            .map(cb => cb.getAttribute('data-id'));
    }
    
    function refreshMessageList() {
        fetch('message/updated-list')
            .then(response => response.text())
            .then(html => {
                document.getElementById('mailboxList').innerHTML = html;
                applyFilters();
                checkUnreadMessages();
            })
            .catch(error => {
                toast.error('Erreur lors du rafraîchissement');
                console.error('Erreur:', error);
            });
    }
    
    function applyFilters() {
        let visibleCount = 0;
        
        document.querySelectorAll('.message-item').forEach(item => {
            const status = item.getAttribute('data-status');
            const name = item.getAttribute('data-name').toLowerCase();
            const email = item.getAttribute('data-email').toLowerCase();
            const subject = item.getAttribute('data-subject').toLowerCase();
            const content = item.getAttribute('data-content').toLowerCase();
            
            const matchesSearch = currentSearchTerm === '' || 
                                  name.includes(currentSearchTerm) ||
                                  email.includes(currentSearchTerm) ||
                                  subject.includes(currentSearchTerm) ||
                                  content.includes(currentSearchTerm);
            
            const matchesFilter = currentFilter === 'all' || status === currentFilter;
            
            if (matchesSearch && matchesFilter) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        showNoResultsMessage(visibleCount);
    }
    
    function showNoResultsMessage(count) {
        const existingEmpty = document.querySelector('.mailbox-empty');
        
        if (count === 0 && !existingEmpty) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'mailbox-empty';
            emptyDiv.innerHTML = `
                <i class="fa-solid fa-magnifying-glass"></i>
                <h4>Aucun résultat</h4>
                <p>Aucun message ne correspond à vos critères</p>
            `;
            document.getElementById('mailboxList').appendChild(emptyDiv);
        } else if (count > 0 && existingEmpty) {
            existingEmpty.remove();
        }
    }
    
    function copyEmailToClipboard(email) {
        navigator.clipboard.writeText(email).then(() => {
            toast.success(`Email copié : ${email}`);
        }).catch(err => {
            toast.error('Erreur lors de la copie');
            console.error('Erreur:', err);
        });
    }
    
    function checkUnreadMessages() {
        fetch('message/unread-count')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const unreadCount = data.unreadCount;
                    const messageLink = document.querySelector('.nav-link[href="/admin/message"]');

                    if (messageLink) {
                        let unreadSpan = messageLink.querySelector('.unread-span');
                        if (unreadSpan) {
                            unreadSpan.remove();
                        }

                        if (unreadCount > 0) {
                            unreadSpan = document.createElement('span');
                            unreadSpan.className = 'unread-span badge bg-danger ms-1';
                            unreadSpan.textContent = unreadCount;
                            messageLink.appendChild(unreadSpan);
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
            });
    }
});