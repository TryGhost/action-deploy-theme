module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts'
    ],
    parserOptions: {
        project: './tsconfig.json'
    }
};
