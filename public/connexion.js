// Switch between login and register tabs
        function switchTab(tab) {
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tab + '-tab').classList.add('active');
        }

        // Fill login form with demo credentials
        function fillLogin(email, password) {
            switchTab('login');
            setTimeout(() => {
                document.querySelector('#login-tab input[type="email"]').value = email;
                document.querySelector('#login-tab input[type="password"]').value = password;
            }, 300);
        }

        // Password strength indicator
        document.getElementById('registerPassword')?.addEventListener('input', function() {
            const password = this.value;
            const strengthBar = document.getElementById('strengthBar');
            let strength = 0;
            
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            strengthBar.className = 'password-strength';
            
            if (strength <= 2) strengthBar.classList.add('strength-weak');
            else if (strength <= 3) strengthBar.classList.add('strength-medium');
            else if (strength <= 4) strengthBar.classList.add('strength-good');
            else strengthBar.classList.add('strength-strong');
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate login
            const email = this.querySelector('input[type="email"]').value;
            const password = this.querySelector('input[type="password"]').value;
            
            // Simulate authentication
            setTimeout(() => {
                alert(`Connexion réussie pour ${email}!\n\nNote: En production, cette fonctionnalité sera connectée à la base de données.`);
                
                // Redirect to user dashboard (not implemented yet)
                // window.location.href = 'dashboard.html';
            }, 1000);
        });

        document.getElementById('registerForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const pseudo = this.querySelector('input[type="text"]').value;
            const email = this.querySelector('input[type="email"]').value;
            
            // Simulate registration
            setTimeout(() => {
                alert(`Compte créé avec succès pour ${pseudo} (${email})!\n\n🎉 Vous recevez 20 crédits de bienvenue!\n\nNote: En production, un email de confirmation sera envoyé.`);
                
                // Switch to login tab
                switchTab('login');
            }, 1000);
        });

        function showForgotPassword() {
            const email = prompt('Entrez votre adresse email pour recevoir un lien de réinitialisation:');
            if (email) {
                alert(`Un email de réinitialisation a été envoyé à ${email}\n\nNote: En production, cette fonctionnalité sera active.`);
            }
        }