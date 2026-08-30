module.exports = {
  apps: [
    {
      name: "vendorville-api",
      script: "./index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
    },
  ],
};