module.exports = {
    apps: [{
        name: 'laundry-buddy-api',
        script: 'server.js',
        instances: 1, // Limited to 1 instance to stay within Render's 512MB RAM limit
        autorestart: true,
        watch: false,
        max_memory_restart: '400M', // Restart if memory exceeds 400MB to avoid Render hard kill
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        },
        node_args: '--max_old_space_size=350', // Limit V8 heap to stay within 512MB
        log_date_format: "YYYY-MM-DD HH:mm Z"
    }]
};
