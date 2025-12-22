// mobile-menu.js - Mobile navigation menu toggle
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Create mobile menu toggle button if it doesn't exist
        const navbar = document.querySelector('header .navbar');
        const nav = document.querySelector('header nav');
        const logo = document.querySelector('.logo');
        
        if (!navbar || !nav) return;

        // Check if mobile menu toggle already exists
        let mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (!mobileMenuToggle) {
            // Create mobile menu toggle button
            mobileMenuToggle = document.createElement('button');
            mobileMenuToggle.className = 'mobile-menu-toggle';
            mobileMenuToggle.setAttribute('aria-label', 'Toggle mobile menu');
            mobileMenuToggle.innerHTML = '<i class="bx bx-menu"></i>';
            
            // Insert after logo
            if (logo && logo.nextSibling) {
                navbar.insertBefore(mobileMenuToggle, logo.nextSibling);
            } else {
                navbar.appendChild(mobileMenuToggle);
            }
        }

        // Toggle mobile menu
        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('mobile-menu-open');
            
            // Change icon
            const icon = this.querySelector('i');
            if (nav.classList.contains('mobile-menu-open')) {
                icon.classList.remove('bx-menu');
                icon.classList.add('bx-x');
            } else {
                icon.classList.remove('bx-x');
                icon.classList.add('bx-menu');
            }
        });

        // Close menu when clicking on a nav link
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 767) {
                    nav.classList.remove('mobile-menu-open');
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.classList.remove('bx-x');
                    icon.classList.add('bx-menu');
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 767) {
                const isClickInsideNav = nav.contains(event.target);
                const isClickOnToggle = mobileMenuToggle.contains(event.target);
                
                if (!isClickInsideNav && !isClickOnToggle && nav.classList.contains('mobile-menu-open')) {
                    nav.classList.remove('mobile-menu-open');
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.classList.remove('bx-x');
                    icon.classList.add('bx-menu');
                }
            }
        });

        // Close menu on window resize to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 767 && nav.classList.contains('mobile-menu-open')) {
                nav.classList.remove('mobile-menu-open');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('bx-x');
                    icon.classList.add('bx-menu');
                }
            }
        });
    });
})();
