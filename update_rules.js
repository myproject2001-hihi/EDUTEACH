const fs = require('fs');

let rules = fs.readFileSync('firestore.rules', 'utf8');

// replace "allow create, update: if isAuthenticated(); // Teachers create, students update viewed status" with "allow create, update: if true;"
rules = rules.replace(/allow create, update: if isAuthenticated\(\); \/\/ Teachers create, students update viewed status/g, 'allow create, update: if true;');
rules = rules.replace(/allow create, update, delete: if isAuthenticated\(\);/g, 'allow create, update, delete: if true;');
rules = rules.replace(/allow write: if isAuthenticated\(\);/g, 'allow write: if true;');

fs.writeFileSync('firestore.rules', rules);
