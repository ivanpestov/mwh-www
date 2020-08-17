module.exports = {
    env: {
        commonjs: true,
        es2020: true,
    },
    extends: ["eslint:recommended", "plugin:node/recommended", "prettier"],
    parserOptions: {
        ecmaVersion: 11,
    },
    rules: getRules(),
    root: true,
};

function getRules() {
    const env = process.env.NODE_ENV;
    const rules = {
        "node/no-extraneous-require": [
            "error",
            {
                allowModules: ["app"],
            },
        ],
        "node/no-missing-require": [
            "error",
            {
                allowModules: ["app"],
            },
        ],
    };

    switch (env) {
        case "development":
            rules["no-unused-vars"] = 0;
            break;

        case "production":
            break;

        default:
            throw new Error(
                `Environment "${env}" is not supported for my .eslint file`
            );
    }

    return rules;
}
