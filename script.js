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

        this.init();
    }

    init() {
        this.renderAll();
        this.setupEventListeners();
        // Abrir pestaña por defecto
        this.openTab('tab-users');
    }

    // --- UI LOGIC ---

    openTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabId).classList.add('active');

        // Update nav item style
        const activeNavIndex = ['tab-users', 'tab-books', 'tab-loans'].indexOf(tabId);
        if (activeNavIndex !== -1) {
            document.querySelectorAll('.nav-item')[activeNavIndex].classList.add('active');
        }

        // Update Header Title
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

        // Remove after 3 seconds
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // --- BUSINESS LOGIC ---

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
        this.showNotification(`Usuario registrado con ID: ${id}`);
        this.renderAll();
    }

    registerBook(id, title, author) {
        if (!id || !title || !author) throw new Error("Todos los campos son obligatorios.");
        if (this.books.find(b => b.id === id)) throw new Error("El ID de libro ya existe.");

        this.books.push({ id, title, author, available: true });
        this.showNotification("Libro registrado correctamente");
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
        this.showNotification("Libro devuelto correctamente");
        this.renderAll();
    }

    // --- RENDERING ---

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
                <td>${u.id}</td>
                <td>${u.name}</td>
                <td><span class="badge" style="background-color: #e0e7ff; color: #4338ca;">${u.type}</span></td>
                <td>${u.activeLoans} / ${this.MAX_LOANS}</td>
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
                <td>${b.id}</td>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td>${statusBadge}</td>
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
                <td>${l.userName}</td>
                <td>${l.bookTitle}</td>
                <td>${l.date}</td>
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
        // Users Select
        const userSelect = document.getElementById('loanUser');
        userSelect.innerHTML = '<option value="">Buscar usuario...</option>';
        this.users.forEach(u => {
            userSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.activeLoans} préstamos)</option>`;
        });

        // Books Select
        const bookSelect = document.getElementById('loanBook');
        bookSelect.innerHTML = '<option value="">Buscar libro disponible...</option>';
        this.books.filter(b => b.available).forEach(b => {
            bookSelect.innerHTML += `<option value="${b.id}">${b.title} - ${b.author}</option>`;
        });
    }

    setupEventListeners() {
        // Forms
        document.getElementById('formUser').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                this.registerUser(
                    document.getElementById('userName').value,
                    document.getElementById('userType').value
                );
                e.target.reset();
            } catch (err) {
                this.showNotification(err.message, 'error');
            }
        });

        document.getElementById('formBook').addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                this.registerBook(
                    document.getElementById('bookId').value,
                    document.getElementById('bookTitle').value,
                    document.getElementById('bookAuthor').value
                );
                e.target.reset();
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
