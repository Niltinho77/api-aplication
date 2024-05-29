module.exports = {
    development: {
      username: 'root',
      password: '',
      database: 'estoque',
      host: '127.0.0.1',
      dialect: 'mysql', // ou 'postgres', 'sqlite', 'mssql'
    },
    test: {
      username: 'root',
      password: '',
      database: 'estoque',
      host: '127.0.0.1',
      dialect: 'mysql',
    },
    production: {
      use_env_variable: 'DATABASE_URL',
      dialect: 'mysql',
    },
  };
  