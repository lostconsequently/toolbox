const dns = require("node:dns").promises;

function createResolver() {
  const resolver = new dns.Resolver();

  resolver.setServers(["1.1.1.1", "8.8.8.8"]);

  return resolver;
}

module.exports = { createResolver };
