class LibrarySystem {
    constructor() {
        this.users = [
            { id: "U001", name: "Ana García", type: "Estudiante", activeLoans: 0 },
            { id: "P001", name: "Prof. Carlos Ruiz", type: "Docente", activeLoans: 0 }
        ];
        this.books = [
            { id: "L001", title: "Cálculo I", author: "Stewart", available: true },
            { id: "L002", title: "Física Básica", author: "Sears", available: true },
            { id: "L003", title: "Química Orgánica", author: "Wade", available: true }
        ];
        this.loans = [];
        this.MAX_LOANS = 3;

        // Estado de edición (null cuando no se edita)
        this.editingUserId = null;
        this.editingBookId = null;

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.renderAll();
        this.setupEventListeners();
        // Abrir pestaña por defecto
        this.openTab('tab-users');
    }

    // --- PERSISTENCIA (localStorage) ---
    loadFromStorage() {
        try {
            const raw = localStorage.getItem('library_data');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed.users) this.users = parsed.users;
            if (parsed.books) this.books = parsed.books;
            if (parsed.loans) this.loans = parsed.loans;
        } catch (err) {
            console.error('Error leyendo storage', err);
        }
    }

    saveToStorage() {
        try {
            const data = { users: this.users, books: this.books, loans: this.loans };
            localStorage.setItem('library_data', JSON.stringify(data));
        } catch (err) {
            console.error('Error guardando en storage', err);
        }
    }

    // --- UTILIDADES DE VALIDACIÓN / SEGURIDAD ---
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    validateName(name) {
        const v = String(name || '').trim();
        if (v.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
        if (v.length > 100) throw new Error('El nombre es demasiado largo');
        // Solo letras y espacios (incluye acentos y caracteres latinos extendidos)
        const re = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ ]+$/;
        if (!re.test(v)) throw new Error('El nombre sólo puede contener letras y espacios');
        return v;
    }

    validateTitleOrAuthor(value, fieldName = 'Campo') {
        const v = String(value || '').trim();
        if (v.length < 2) throw new Error(`${fieldName} debe tener al menos 2 caracteres`);
        if (v.length > 150) throw new Error(`${fieldName} debe tener como máximo 150 caracteres`);
        return v;
    }

    // --- LÓGICA DE INTERFAZ ---

    openTab(tabId) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Quitar clase activa de los elementos de navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Mostrar la pestaña seleccionada
        document.getElementById(tabId).classList.add('active');

        // Actualizar estilo del elemento de navegación activo
        const activeNavIndex = ['tab-users', 'tab-books', 'tab-loans'].indexOf(tabId);
        if (activeNavIndex !== -1) {
            document.querySelectorAll('.nav-item')[activeNavIndex].classList.add('active');
        }

        // Actualizar título del encabezado
        const titles = {
            'tab-users': 'Gestión de Usuarios',
            'tab-books': 'Gestión de Libros',
            'tab-loans': 'Control de Préstamos'
        };
        document.getElementById('pageTitle').textContent = titles[tabId];
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notificationArea');
        const notif = document.createElement('div');
        notif.className = `notification notif-${type}`;

        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark';

        notif.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(notif);

        // Eliminar después de 3 segundos
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // --- LÓGICA DE NEGOCIO ---

    registerUser(name, type) {
        if (!name || !type) throw new Error("Todos los campos son obligatorios.");

        // Generar ID autoincremental
        const prefix = type === "Estudiante" ? "U" : "P";
        const count = this.users.filter(u => u.type === type).length + 1;
        let id = `${prefix}${String(count).padStart(3, '0')}`;

        // Verificar duplicados (por seguridad en caso de concurrencia simulada, aunque es local)
        if (this.users.find(u => u.id === id)) {
            // Si existe (ej: borrados), buscar el siguiente libre
            let next = count + 1;
            let newId = `${prefix}${String(next).padStart(3, '0')}`;
            while (this.users.find(u => u.id === newId)) {
                next++;
                newId = `${prefix}${String(next).padStart(3, '0')}`;
            }
            // Asignar el encontrado
            id = newId;
            // Nota: En un const, esto fallaría, mejor usar let para id arriba o refactorizar.
            // Corrección simple:
        }

        this.users.push({ id, name, type, activeLoans: 0 });
        this.saveToStorage();
        this.showNotification(`Usuario registrado con ID: ${id}`);
        this.renderAll();
    }

    registerBook(title, author) {
        // ahora el ID se genera automáticamente: registerBook(title, author)
        if (!title || !author) throw new Error("Todos los campos son obligatorios.");

        const prefix = 'L';
        let n = this.books.filter(b => b.id && b.id.startsWith(prefix)).length + 1;
        let id = `${prefix}${String(n).padStart(3, '0')}`;
        while (this.books.find(b => b.id === id)) {
            n++;
            id = `${prefix}${String(n).padStart(3, '0')}`;
        }

        this.books.push({ id, title, author, available: true });
        this.saveToStorage();
        this.showNotification(`Libro registrado: ${id}`);
        this.renderAll();
    }

    // --- CRUD ADICIONALES (Libros) ---
    editBook(id) {
        const book = this.books.find(b => b.id === id);
        if (!book) return;
        this.editingBookId = id;
        document.getElementById('bookId').value = book.id;
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookAuthor').value = book.author;
        const btn = document.querySelector('#formBook .btn-primary');
        if (btn) btn.textContent = 'Actualizar Libro';
    }

    updateBook(id, title, author) {
        const book = this.books.find(b => b.id === id);
        if (!book) throw new Error('Libro no encontrado');
        if (!title || !author) throw new Error('Todos los campos son obligatorios.');
        book.title = title;
        book.author = author;
        this.saveToStorage();
        this.showNotification(`Libro ${id} actualizado`);
        this.editingBookId = null;
        const btn = document.querySelector('#formBook .btn-primary');
        if (btn) btn.textContent = 'Guardar Libro';
        document.getElementById('bookId').value = '';
        this.renderAll();
    }

    deleteBook(id) {
        if (!confirm(`¿Eliminar libro ${id}? Esta acción no se puede deshacer.`)) return;
        const idx = this.books.findIndex(b => b.id === id);
        if (idx === -1) return;
        const book = this.books[idx];
        if (!book.available) {
            this.showNotification('No se puede eliminar: el libro está prestado', 'error');
            return;
        }
        this.books.splice(idx, 1);
        this.saveToStorage();
        this.showNotification(`Libro ${id} eliminado`);
        this.renderAll();
    }

    createLoan(userId, bookId) {
        const user = this.users.find(u => u.id === userId);
        const book = this.books.find(b => b.id === bookId);

        if (!user) throw new Error("Usuario no válido.");
        if (!book) throw new Error("Libro no válido.");
        if (!book.available) throw new Error("El libro no está disponible.");
        if (user.activeLoans >= this.MAX_LOANS) throw new Error(`El usuario alcanzó el límite de ${this.MAX_LOANS} préstamos.`);

        const loan = {
            id: Date.now(),
            userId,
            userName: user.name,
            bookId,
            bookTitle: book.title,
            date: new Date().toLocaleDateString('es-ES')
        };

        this.loans.push(loan);
        user.activeLoans++;
        book.available = false;

        this.saveToStorage();
        this.showNotification("Préstamo registrado exitosamente");
        this.renderAll();
    }

    returnBook(loanId) {
        const loanIndex = this.loans.findIndex(l => l.id === loanId);
        if (loanIndex === -1) return;

        const loan = this.loans[loanIndex];
        const user = this.users.find(u => u.id === loan.userId);
        const book = this.books.find(b => b.id === loan.bookId);

        if (user) user.activeLoans--;
        if (book) book.available = true;

        this.loans.splice(loanIndex, 1);
        this.saveToStorage();
        this.showNotification("Libro devuelto correctamente");
        this.renderAll();
    }

    // --- CRUD ADICIONALES (Usuarios) ---
    editUser(id) {
        const user = this.users.find(u => u.id === id);
        if (!user) return;
        this.editingUserId = id;
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userType').value = user.type;
        const btn = document.querySelector('#formUser .btn-primary');
        if (btn) btn.textContent = 'Actualizar Usuario';
    }

    updateUser(id, name, type) {
        const user = this.users.find(u => u.id === id);
        if (!user) throw new Error('Usuario no encontrado');
        if (!name || !type) throw new Error('Todos los campos son obligatorios.');
        user.name = name;
        user.type = type;
        this.saveToStorage();
        this.showNotification(`Usuario ${id} actualizado`);
        this.editingUserId = null;
        const btn = document.querySelector('#formUser .btn-primary');
        if (btn) btn.textContent = 'Guardar Usuario';
        document.getElementById('userId').value = '';
        this.renderAll();
    }

    deleteUser(id) {
        if (!confirm(`¿Eliminar usuario ${id}? Esta acción no se puede deshacer.`)) return;
        const idx = this.users.findIndex(u => u.id === id);
        if (idx === -1) return;
        const user = this.users[idx];
        if (user.activeLoans > 0) {
            this.showNotification('No se puede eliminar: el usuario tiene préstamos activos', 'error');
            return;
        }
        this.users.splice(idx, 1);
        this.saveToStorage();
        this.showNotification(`Usuario ${id} eliminado`);
        this.renderAll();
    }

    // --- RENDERIZADO ---

    renderAll() {
        this.renderUsersTable();
        this.renderBooksTable();
        this.renderLoansTable();
        this.renderSelects();
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        this.users.forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(u.id)}</td>
                <td>${this.escapeHtml(u.name)}</td>
                <td><span class="badge" style="background-color: #e0e7ff; color: #4338ca;">${this.escapeHtml(u.type)}</span></td>
                <td>${this.escapeHtml(String(u.activeLoans))} / ${this.escapeHtml(String(this.MAX_LOANS))}</td>
                <td>
                    <button class="btn btn-primary" style="width:auto; padding:0.4rem 0.6rem; margin-right:6px;" onclick="app.editUser('${u.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem 0.6rem;" onclick="app.deleteUser('${u.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderBooksTable() {
        const tbody = document.getElementById('booksTableBody');
        tbody.innerHTML = '';
        this.books.forEach(b => {
            const row = document.createElement('tr');
            const statusBadge = b.available
                ? '<span class="badge badge-available">Disponible</span>'
                : '<span class="badge badge-loaned">Prestado</span>';

            row.innerHTML = `
                <td>${this.escapeHtml(b.id)}</td>
                <td>${this.escapeHtml(b.title)}</td>
                <td>${this.escapeHtml(b.author)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-primary" style="width:auto; padding:0.4rem 0.6rem; margin-right:6px;" onclick="app.editBook('${this.escapeHtml(b.id)}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger" style="padding:0.4rem 0.6rem;" onclick="app.deleteBook('${this.escapeHtml(b.id)}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderLoansTable() {
        const tbody = document.getElementById('loansTableBody');
        tbody.innerHTML = '';

        if (this.loans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No hay préstamos activos</td></tr>';
            return;
        }

        this.loans.forEach(l => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(l.userName)}</td>
                <td>${this.escapeHtml(l.bookTitle)}</td>
                <td>${this.escapeHtml(l.date)}</td>
                <td>
                    <button class="btn btn-danger" onclick="app.returnBook(${l.id})">
                        <i class="fa-solid fa-rotate-left"></i> Devolver
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderSelects() {
        // Select de usuarios
        const userSelect = document.getElementById('loanUser');
        userSelect.innerHTML = '<option value="">Buscar usuario...</option>';
        this.users.forEach(u => {
            userSelect.innerHTML += `<option value="${this.escapeHtml(u.id)}">${this.escapeHtml(u.name)} (${this.escapeHtml(String(u.activeLoans))} préstamos)</option>`;
        });

        // Select de libros
        const bookSelect = document.getElementById('loanBook');
        bookSelect.innerHTML = '<option value="">Buscar libro disponible...</option>';
        this.books.filter(b => b.available).forEach(b => {
            bookSelect.innerHTML += `<option value="${this.escapeHtml(b.id)}">${this.escapeHtml(b.title)} - ${this.escapeHtml(b.author)}</option>`;
        });
    }

    setupEventListeners() {
        // Formularios
        document.getElementById('formUser').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const rawName = document.getElementById('userName').value;
                const name = this.validateName(rawName);
                const type = String(document.getElementById('userType').value || '').trim();
                if (!type) throw new Error('Seleccione un tipo de usuario');
                if (this.editingUserId) {
                    this.updateUser(this.editingUserId, name, type);
                } else {
                    this.registerUser(name, type);
                }
                e.target.reset();
                document.getElementById('userId').value = '';
            } catch (err) {
                this.showNotification(err.message, 'error');
            }
        });

        document.getElementById('formBook').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const rawTitle = document.getElementById('bookTitle').value;
                const rawAuthor = document.getElementById('bookAuthor').value;
                const title = this.validateTitleOrAuthor(rawTitle, 'Título');
                const author = this.validateTitleOrAuthor(rawAuthor, 'Autor');
                if (this.editingBookId) {
                    this.updateBook(this.editingBookId, title, author);
                } else {
                    this.registerBook(title, author);
                }
                e.target.reset();
                const bookIdInput = document.getElementById('bookId');
                if (bookIdInput) bookIdInput.value = '';
            } catch (err) {
                this.showNotification(err.message, 'error');
            }
        });

        document.getElementById('formLoan').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                this.createLoan(
                    document.getElementById('loanUser').value,
                    document.getElementById('loanBook').value
                );
                e.target.reset();
            } catch (err) {
                this.showNotification(err.message, 'error');
            }
        });
    }
}

// Inicializar la aplicación
const app = new LibrarySystem();
