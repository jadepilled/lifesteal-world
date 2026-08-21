const allUrls = [
  'http://localhost/',
  'http://localhost/artists/',
  'http://localhost/releases/',
  'http://localhost/radio/',
  'http://localhost/store/',
  'http://localhost/about/',
];

module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: process.env.LHCI_URL ? [process.env.LHCI_URL] : allUrls,
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
