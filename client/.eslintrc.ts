import configs from "./src/configs";

type ESLintConfig = {
  extends?: string | string[];
  root?: boolean;
  parser?: string;
  parserOptions?: {
    ecmaVersion?: number | "latest";
    sourceType?: "module" | "script" | "commonjs";
    ecmaFeatures?: {
      jsx?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
  plugins?: string[];
  settings?: Record<string, any>;
  rules?: Record<string, any>;
  [key: string]: any;
};

const config: ESLintConfig = {
  extends: ["react-app", "react-app/jest", "prettier"],
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    "react",
    "react-hooks",
    "import",
    "jsx-a11y",
    "@typescript-eslint",
  ] as unknown as ESLintConfig["plugins"],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": configs.node_env === "production" ? "warn" : "off",
    "no-debugger": configs.node_env === "production" ? "warn" : "off",
  },
};

export default config;
