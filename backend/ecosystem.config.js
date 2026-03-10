module.exports = {
    apps: [{
        name: 'laundry-buddy-api',
        script: 'server.js',
        instances: 'max', // Uses all available CPU cores for maximum scalability
        exec_mode: 'cluster', // Enables Node.js clustering
        autorestart: true,
        watch: false,
        max_memory_restart: '1G', // Graceful memory restart
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        node_args: '--max_old_space_size=1024', // Increase V8 memory limit per instance
        log_date_format: "YYYY-MM-DD HH:mm Z"
    }]
};
