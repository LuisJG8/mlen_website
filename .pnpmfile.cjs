function readPackage(pkg) {
  if (pkg.name === 'yaml-language-server' && pkg.dependencies?.yaml === '2.7.1') {
    pkg.dependencies.yaml = '2.9.0';
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
