// Script to add backend integration scripts to all HTML files
const scriptToAdd = `    <!-- Backend Integration Scripts -->
    <script src="assests/api-config.js"></script>
    <script src="assests/order-api.js"></script>
    `;

const htmlFiles = [
    'home.html',
    'login.html',
    'signup.html',
    'submit.html',
    'track.html',
    'history.html',
    'profile.html',
    'support.html',
    'contact.html',
    'past.html',
    'reset.html',
    'laundry-dashboard.html',
    'laundry-login.html'
];

console.log('Instructions to add backend scripts to HTML files:');
console.log('================================================\n');
console.log('Add these lines BEFORE other script tags (like crypto-utils.js, auth.js, etc.):\n');
console.log(scriptToAdd);
console.log('\nHTML files to update:');
htmlFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
});
console.log('\nExample placement:');
console.log('<!-- Backend Integration Scripts -->');
console.log('<script src="assests/api-config.js"></script>');
console.log('<script src="assests/order-api.js"></script>');
console.log('');
console.log('<!-- Existing Scripts -->');
console.log('<script src="assests/crypto-utils.js"></script>');
console.log('<script src="assests/auth.js"></script>');
console.log('...');
