// Script para executar a migração de assinaturas
require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: [
    ['@babel/plugin-transform-runtime'],
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@': './src'
      }
    }]
  ]
});

// Importar e executar o script de migração
require('./src/scripts/migrateSignatures.js');
