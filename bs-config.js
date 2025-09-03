module.exports = {
  server: {
    baseDir: 'dist'
  },
  files: [
    'dist/**/*.css',
    'dist/**/*.html'
  ],
  watchEvents: ['change'],
  notify: false,
  open: false,
  ui: false
};