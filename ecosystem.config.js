module.exports = {
  apps : [{
    name: 'BOT',
    script: 'app.js',
    watch : true,
    ignore_watch: ['public', 'tmp', '**.DS_Store'],
    env: {
      NODE_ENV: 'development'
    },
      env_production : {
      NODE_ENV: 'production'
    }
  }]
};
