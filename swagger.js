const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Currency Tracker',
            version: '1.0.0',
            description: 'API documentation for currency tracker application',
        },
    },
    apis: ['./app.js'],
};
const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;